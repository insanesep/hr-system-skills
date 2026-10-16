---
name: feature-schedule-business-rules
description: 系统功能排期模块 - 业务规则的技术映射（状态机、延期判定、编号规则）
---

# 系统功能排期 - 业务规则

## 1. 状态机

```
  ┌─────────────────────┐                                ┌─────────────────────┐
  │ PENDING（待开发）    │ ──────── take-card ─────────► │ IN_PROGRESS（开发中）│
  │                     │ ◄─────── release-card ──────  │                     │
  └──────────┬──────────┘                                └──────────┬──────────┘
             │ mark-done                                              │ mark-done
             │ （后端 autoFillDev：当 dev_user_id 为空时                │
             │   写入当前操作人为开发人）                              │
             └────────────────┐                          ┌─────────────┘
                              ▼                          ▼
                       ┌─────────────────────┐
                       │ DONE（开发完成）     │
                       └─────────┬───────────┘
                                 │ revert
              ┌──────────────────┴──────────────────┐
              │ targetStatus=PENDING                │ targetStatus=IN_PROGRESS
              │ （清空 dev_* + done_*）              │ （仅清 done_*，保留 dev_*）
              ▼                                     ▼
   PENDING（待开发）                       IN_PROGRESS（开发中）
```

**DB 层四态**：`PENDING` / `IN_PROGRESS` / `DONE` / `NON_FEATURE`（`NON_FEATURE` 为旁路态，由 PM 在抽屉手动切入，不参与 mark-done / scheduledDate 调整）。  
**延期态 DELAYED**：前端渲染计算，**不落库**；v2.0 起 **`PENDING` 与 `IN_PROGRESS` 均计入延期**（与统计口径统一），v2.1 起按 **`end_date`（单日卡 = `scheduled_date`）判定，且仅当月（月/列表视图）与本周（周视图）计算，历史期不再标红**：

```js
isDelayed(card) = (card.status === 'PENDING' || card.status === 'IN_PROGRESS')
              && card.endDate != null            // v2.1 起 endDate || scheduledDate 回退
              && card.endDate < todayStr
              && 当前视图为期当期（月视图=当月 / 周视图=本周）
```

**dev_* 三字段写入路径**（`dev_user_id` / `dev_user_name` / `dev_taken_at`）：

| 触发动作 | dev_* 变化 |
|------|---------|
| `take-card` 显式领取（`PENDING → IN_PROGRESS`） | 同事务写入当前操作人 |
| `mark-done`（从 `PENDING` 直跳 `DONE`） | 后端 autoFillDev：dev_user_id 为空时写入当前操作人 |
| `mark-done`（从 `IN_PROGRESS → DONE`） | 保留已有 dev_* 不动 |
| `release-card`（`IN_PROGRESS → PENDING`） | 同事务清空 dev_* |
| `revert(targetStatus=PENDING)`（`DONE → PENDING`） | 同事务清空 dev_* |
| `revert(targetStatus=IN_PROGRESS)`（`DONE → IN_PROGRESS`） | 保留 dev_* 不动 |
| `move-to-non-feature` | 同事务清空 dev_* |

**NON_FEATURE 旁路态**（v1.5 新增，手动标记）：

- 入口：PM 在抽屉点击「🔧 移入非需求改动」手动调起，**废弃原根据 commit message 前缀（chore/style/refactor/test/docs/build/perf）的自动归类**
- 可返回：NON_FEATURE 只能通过「↩ 恢复为待开发」返回 PENDING，不能直接跳到 DONE
- 不参与月视图 / Backup / 延期统计；**后端 `cards/month` 查询中以 `.ne(status, NON_FEATURE)` 过滤**，前端 `cards.value` 不会包含
- 独立接口 `cards/non-feature/list` 查询全量 NON_FEATURE（按 `created_at DESC`），由工具栏「🔧 非需求改动 N」计数与弹层展示
- 状态守卫（后端 `FeatureScheduleServiceImpl`）：
  - `update-card` 跳检排期日修改（`scheduledDate`）——NON_FEATURE 本身不参与排期
  - `mark-done` 拒绝 NON_FEATURE 调起
  - 进入 NON_FEATURE 时同事务清空 `scheduled_date / dev_user_id / dev_user_name / dev_taken_at / done_repo / done_commit_hash / done_commit_url / done_commits / done_at`（必须使用 `LambdaUpdateWrapper.set(field, null)`，避免 BaseEntity 反向覆盖）
- 流水：复用 `EDITED` op_type，detail 描述「从『X』移入非需求改动 / 从非需求改动恢复为待开发」，**不新增 op_type 枚举**

## 2. 卡片编号规则

**格式（v1.7+）**：`FS-{YYYYMMDD}-{NNN}`

- `FS`：全局统一前缀（与模块解耦，旧方案 `{MODULE_CODE}-` 已下线）
- `YYYYMMDD`：采用 `authoredAt` 的日期段（服务器时区 +08:00，参数 `Asia/Shanghai`）
- `NNN`：同一 `YYYYMMDD` 全局自增，三位零填充，首个为 `001`

**并发安全实现（后端）**：
- 采用 `SELECT ... FOR UPDATE` 行锁 + `MAX(card_no) LIKE 'FS-{ymd}-%'` 取最大序号；
- 同一事务内 INSERT 新卡，外层 `@Transactional`；
- 当日序号溢出 999 触发告警（业务侧不会出现，且预留 3 位足够）。

> 模块标签 `sourceModule` 通过 [Conventional Commit 头部解析](job-schedule.md#41-sourcemodule-识别规则commit-message-解析) 得到，仅用于看板分组与统计，不参与 cardNo 生成。

## 3. 标题默认截取

**规则**（从 `commitMessage` 首行生成）：
1. 取 `message.split('\n')[0]`
2. 若包含 `:`，**取首个 `:` 之后的内容**（即去掉 `feat(scope):` / `fix:` / 业务自定义前缀）；若无 `:` 则保留整段
3. `trim()`
4. 长度 > 30 → 截取前 30 字符，**不加省略号**（v1.6 由 15 升至 30，覆盖大多数中文短句）
5. 允许 PM 在抽屉中手改，编辑后不再回读 commit

```java
private static final int TITLE_MAX_LEN = 30;

public static String titleFromMsg(String msg) {
    if (msg == null) return "";
    String first = msg.split("\\r?\\n", 2)[0];
    int colon = first.indexOf(':');
    String t = (colon >= 0 ? first.substring(colon + 1) : first).trim();
    return t.length() > TITLE_MAX_LEN ? t.substring(0, TITLE_MAX_LEN) : t;
}
```

**前端对齐**：抽屉标题 `<input maxlength="30">`，超出时阻断输入并展示警示文案 `标题最长 30 字符`；`titleFromMsg` 工具函数同步采用「冒号后截取 + 30 字符」规则。

## 4. 拖拽规则

| 起点          | 终点         | 操作 | 流水 op_type   |
|-------------|------------|----|--------------|
| Backup      | 日历格        | 排期 | SCHEDULED    |
| 日历格（有排期）    | Backup     | 取消 | UNSCHEDULED  |
| 日历格         | 另一日历格      | 改期 | RESCHEDULED  |
| 跨月灰显格（off-month） | —       | 禁止 | —            |

**前端校验**：
- 拖到相同日期不触发请求（短路）
- 拖到 off-month 格不注册 drop handler（`attachDropZones` 跳过 `data-off="true"`）
- 拖拽期间目标格 `outline:2px dashed var(--primary)`

## 5. 完成 commit 校验（mark-done）

> 完成 commit 自 v1.3 起为**选填**（可不关联直接标记完成）；以下强校验仅在填写时生效。

**强校验**：
1. `doneRepo` 必须在 `GET /schedule/repos` 返回列表内
2. `doneCommitHash` 必须能在该仓命中（调用 `GET /schedule/repos/commits?repo=&q=hash`）
3. 通过后由后端拼接 `doneCommitUrl`：`https://codeup.aliyun.com/{group}/{repo}/commit/{hash}`，group 取 Nacos 配置

**拒绝手写**：前端不暴露 hash 输入框，仅能"搜索 → 点选"；服务端若发现未选中就提交，直接返回 40902。

## 6. 删除/回退/领取/释放

- **删除**：软删（`deleted_flag=1`）+ 写 `DELETED` 流水；列表与月视图自动过滤 `deleted_flag=0`
- **领取（take-card）**：仅 `PENDING` 可调起；`status → IN_PROGRESS`，同事务写入 `dev_user_id / dev_user_name / dev_taken_at = NOW()`，写 `TAKEN` 流水（detail：`领取开发：{realName}`）
- **释放（release-card）**：仅 `IN_PROGRESS` 可调起；`status → PENDING`，同事务清空 `dev_*` 三字段，写 `RELEASED` 流水（detail：`释放开发：{原 dev_user_name}`）
- **回退（revert，分叉）**：仅 `DONE` 可调起；按 `targetStatus` 入参分叉：
  - `targetStatus=PENDING`（默认）：`status → PENDING`，同事务清空 `done_repo / done_commit_hash / done_commit_url / done_commits / done_at`，**并清空 `dev_*` 三字段**，写 `REVERTED` 流水（detail：`已回退为「待开发」`）
  - `targetStatus=IN_PROGRESS`：`status → IN_PROGRESS`，仅清空 `done_*` 五字段，**保留 `dev_*` 三字段**（卡片仍归属原开发人），写 `REVERTED` 流水（detail：`已回退为「开发中」，保留开发人 {dev_user_name}`）
  - 入参守卫：`targetStatus=IN_PROGRESS` 但 `dev_user_id IS NULL` 时回退到 `PENDING` 路径
- 二次确认：前端弹窗 `confirm()`（回退/释放）；后端不做二次确认，只做 `status` 校验（不在允许集返回 40901）

## 7. 发版日

- 点击日历空白（非卡片/非 `more-btn`/非 `off-month`）触发 toggle
- 存在 → 删除；不存在 → 插入（基于 `(release_date, deleted_flag=0)` 唯一键判断）
- 发版日仅做视觉标记，**不参与**卡片状态/延期判定

## 8. 权限最小授予

| 角色         | MENU:SYSTEM:FEATURE_SCHEDULE |
|------------|------------------------------|
| SUPER_ADMIN| ✓                            |
| PM         | ✓                            |
| DEV_LEADER | ✓                            |
| DEV_MEMBER | ✗（按需）                      |
| 运营 / 门店    | ✗                            |

## 9. 卡片合并（v1.8+，同模块多卡聚合）

### 9.1 合并前置校验（服务端强校验，前端预校验）

- `childCardNos.size() >= 2`：单张卡不构成合并，返回 `FS_MERGE_AT_LEAST_TWO`（40001）
- 所有选中卡片 `source_module` 必须一致（合并卡 `M_old` 视作其所在模块），否则返回 `FS_MERGE_SAME_MODULE_REQUIRED`（40001）
- 选中卡片 `status` 仅允许 `PENDING` / `IN_PROGRESS`；`DONE` / `NON_FEATURE` 拒绝，返回 `FS_MERGE_STATUS_NOT_ALLOW`（40901）
- 任一选中卡片 `parent_merge_card_no` 非空（已经是他人的子卡）时拒绝，返回 `FS_MERGE_ALREADY_CHILD`（40901）—— 需先解散其所属合并卡或整张选中该合并卡参与嵌套
- 合并卡自身（`is_merged=1`）可作为本次入参之一参与嵌套合并（扁平化，见 §9.4）

### 9.2 合并卡生成

| 字段 | 取值 |
|------|------|
| `card_no` | 沿用 `FS-{YYYYMMDD}-{NNN}`，日期取服务端今日，序号走同一自增器 |
| `title` | 用户输入（≤ 30 字，`maxlength=30`，与普通卡一致） |
| `content` | 系统合成 `"合并 N 张：\n- {childCardNo1} {childTitle1}\n- ..."` |
| `owner_user_id / owner_name` | 当前登录用户（非任一子卡 owner） |
| `status` | 初始 `PENDING` |
| `scheduled_date` | 取子卡中最早的非空 `scheduled_date`（v1.4 起）；全部未排期 → NULL（进 Backup） |
| `source_repo` | 固定 `_merge` |
| `source_module` | 取子卡共同 `source_module`（已强校验一致） |
| `source_commit_hash` | `MERGE:{cardNo}`，避开 `uk_source_commit` 冲突 |
| `is_merged` | `1` |
| `parent_merge_card_no` | `NULL` |
| `hardware_management` | `NULL`（不继承） |

流水：合并卡写入 `CREATED`，`op_detail = "合并自 N 张：{cardNo1}, {cardNo2}, ..."`；每张子卡写入 `EDITED`，`op_detail = "并入合并卡 {mergeCardNo}"`。

### 9.3 子卡主从语义

- 合并成功后同一事务内：
  1. 为每张子卡在 `feat_schedule_card_merge_item` 插入一行，`pre_merge_*` 记录其**进入合并前**的 `status / scheduled_date / dev_*` 原值
  2. 子卡 `parent_merge_card_no` 改写为合并卡 `cardNo`
  3. 子卡 `status / scheduled_date / dev_*` **覆盖为合并卡当前值**（初始即 `PENDING / NULL / NULL`）
- 合并卡 `/take /release /mark-done /revert /update(scheduledDate|title|content|ownerUserId)` 任一成功后，服务端在同一事务内扩散写入所有子卡的同名字段（值与合并卡一致），扩散时**不为子卡单独写流水**（审计统一记在合并卡上）
- 子卡自身的 `/take /release /mark-done /revert /update(scheduledDate) /move-to-non-feature` 在 `parent_merge_card_no` 非空时一律返回 `FS_CHILD_LOCKED`（40901），前端抽屉对子卡置为只读
- 列表查询（月视图 / Backup / NON_FEATURE 列表）默认过滤 `parent_merge_card_no IS NULL`，子卡不进入这些视图；子卡仅在合并卡抽屉「明细 Tab」可见

### 9.4 嵌套合并扁平化（需求 5）

当本次 `childCardNos` 包含 `is_merged=1` 的旧合并卡 `M_old`：

1. 读取 `M_old` 下所有 `merge_item` 行（其 `child_card_no` 集合即原始子卡集合）
2. 把这些子卡与本次其他新选中卡一起，挂到新合并卡 `M_new`
3. 旧子卡沿用**它们最初的 `pre_merge_*` 快照**（即进入 `M_old` 时记录的原始独立态），**不以 `M_old` 当前状态为准**——这样解散 `M_new` 时仍能回到最初独立态
4. 技术实现：`UPDATE feat_schedule_card_merge_item SET merge_card_no=? WHERE merge_card_no=?` 批量迁移旧行（`uk_child` 不变），新选中卡再 INSERT 新行
5. `M_old` 软删（`deleted_flag=1`），写 `DELETED` 流水，`op_detail = "被合并至 {M_new.cardNo}"`
6. 最终：一层合并卡 + 扁平子卡集合，永不存在多级嵌套（查询/解散逻辑免于递归）

### 9.5 解散合并（Dissolve）

- 入口：合并卡抽屉「↩ 解散合并」按钮，二次确认后调 `POST /schedule/cards/dissolve`
- 状态守卫：仅 `is_merged=1` 可调起；其他卡片返回 `FS_STATUS_NOT_ALLOW`
- 事务内操作：
  1. 遍历 `feat_schedule_card_merge_item WHERE merge_card_no={cardNo}`
  2. 对每张子卡，读取 `pre_merge_*` 快照，**恢复** `status / scheduled_date / dev_user_id / dev_user_name / dev_taken_at`
  3. 子卡 `parent_merge_card_no` 置 NULL；`done_*` 字段保持为空（合并卡 DONE 不影响子卡历史——合并卡为 DONE 时不允许解散，见下）
  4. 若恢复后的 `scheduled_date < today`，**强制置 NULL**（子卡回 Backup），避免违反「scheduledDate 不得早于今日」约束；流水 `op_detail` 标注「快照日期已过期，已回 Backup」
  5. DELETE 所有 `merge_item` 行（仅该合并卡下）
  6. 合并卡 `deleted_flag=1`，写 `DELETED` 流水，`op_detail = "解散合并，子卡恢复独立（N 张）"`；每张子卡写 `EDITED`，`op_detail = "从合并 {mergeCardNo} 解散恢复"`
- **合并卡 DONE 禁止解散**：DONE 语义下所有子卡已随合并卡标记完成，解散会破坏「完成回执」，返回 `FS_STATUS_NOT_ALLOW`；如需解散请先 revert 合并卡

### 9.6 删除

- `POST /cards/delete` 对合并卡调用时 = 解散 + 合并卡软删：子卡按快照恢复独立后，合并卡 `deleted_flag=1`（与 §9.5 共用实现路径）
- 对子卡调用 `/delete` 在 `parent_merge_card_no` 非空时返回 `FS_CHILD_LOCKED`

### 9.7 Backup 过滤与搜索

- Backup「只看自己」按合并卡 `owner_name === CURRENT_USER.name` 判断，不看子卡 owner
- 当月搜索（前端）：命中合并卡时 `title + content`（合成的子卡清单文本也参与匹配）都参与 AND 模糊匹配；子卡不在前端列表，不单独参与搜索

### 9.8 视觉差异化

- 合并卡左侧 3px 条 `#1565C0`（蓝），背景 `#E3F2FD`，标题前缀 `🔗` 图标，右上角小角标显示子卡张数 `N`
- 状态色（PENDING / IN_PROGRESS / DONE / DELAYED）在合并卡上仍生效，合并卡视觉组合为「蓝底 + 状态边框色」
- 子卡不出现在 Backup / 月历

## 10. 常见边界

| 场景                                     | 处理                                   |
|----------------------------------------|--------------------------------------|
| commit author 在 sys_user 中未命中          | `owner_user_id=-1`, `owner_name` 使用原文 |
| 源 commit 已生成卡片再次触发                   | 返回既有 `cardNo`，`firstTime=false`    |
| 卡片 `scheduledDate` 被拖到"今日"后又拖回 Backup | 生成两条流水：SCHEDULED → UNSCHEDULED     |
| 已 DONE 的卡再次编辑标题                       | 写 `EDITED` 流水；若换了 doneCommitHash 合并为一条 |
| 当月视图切换后延期统计                             | 统计仅对当月卡计算（v2.0 起 PENDING + IN_PROGRESS 均计入；v2.1 起按 end_date 判定；历史期不再标红）  |
| 抽屉 status 从 IN_PROGRESS 切回 PENDING       | 触发 `release-card`，同事务清空 dev_*；不弹二次确认 |
| 抽屉 status 从 DONE 切回 IN_PROGRESS         | 仅当 `dev_user_id` 非空时允许；否则降级到 PENDING 路径 |
| 抽屉 status 从 PENDING 切到 DONE 但 dev_* 为空 | 后端 autoFillDev 用当前操作人填 dev_*，避免数据缺失 |

## 11. Skill 偏差说明

### 11.3 状态机对齐 SKILL：四态升级（v1.6）

- `SKILL.md` 状态机定义为 4 态：`PENDING / IN_PROGRESS / DONE / NON_FEATURE`，原后端实现仅落 3 态（缺 `IN_PROGRESS`），导致：
  1. 卡片无法显式标识「在做但未完成」；
  2. 无法承载「开发人」字段（前端原型抽屉中 `开发人` 一栏一直无数据来源）；
  3. 回退动作无中间态可承接（已 DONE 卡片被退回后，原责任人信息丢失）。
- 本期落地补齐：
  1. **DDL**：`feat_schedule_card` 新增 `dev_user_id BIGINT / dev_user_name VARCHAR(64) / dev_taken_at DATETIME`；`status` 注释升 4 态；`feat_schedule_card_log.op_type` 注释新增 `TAKEN / RELEASED`。
  2. **后端枚举**：`FeatScheduleStatusEnum` 新增 `IN_PROGRESS('IN_PROGRESS','开发中')` 与 `labelOf(code)` 静态方法；`FeatScheduleOpTypeEnum` 新增 `TAKEN('TAKEN','领取开发')` / `RELEASED('RELEASED','释放开发')`，`REVERTED.label` 由「回退为待开发」改为「回退」。
  3. **接口**：新增 `POST /cards/take` 与 `POST /cards/release`；`POST /cards/revert` 入参由 `NoReq` 升级为 `RevertReq`（含 `cardNo + 可选 targetStatus`）。
  4. **mark-done 兼容**：从 `PENDING` 直跳 `DONE` 时后端 autoFillDev 自动写当前操作人到 `dev_*`，避免历史脚本/快速点选的卡片缺开发人记录。
  5. **NON_FEATURE 清空范围扩展**：进入 NON_FEATURE 时一并清空 `dev_*`。
  6. **前端**：新增「开发中」chip / 紫色 `#7E57C2` 视觉色 / 抽屉「开发人」字段 / status-switcher 三选一 / `onSave` 状态分发矩阵（`PENDING ↔ IN_PROGRESS ↔ DONE` 全路径覆盖）。
- 本期未触及：`SKILL.md` 文件本身（按目录边界，仅在 reference 沉淀技术映射，由 PM 统一回写需求文档）。

### 11.1 NON_FEATURE 旁路态（需求同步与实现一致）

- `SKILL.md` v1.5 变更点：新增 「🔧 移入非需求改动」 手动标记，废弃 commit message 前缀自动归类。
- 后端从未实现过原动作中的「自动归类」逻辑，本次为纯增量开发（并未废弃任何已有逻辑）。
- 实施详情 → [non-feature-bypass-implementation.md](non-feature-bypass-implementation.md)。

### 11.2 「⚙ 代码仓配置」弹层（只读，源仓一份，走 Nacos YAML）

- `SKILL.md` v1.6 / commit `0a7800d` 在 `asset/feature-schedule.html` 中新增「⚙ 代码仓」配置弹层（SOURCE_REPOS / DONE_REPOS 本地数组增删）。
- 本期落地与 Demo 的偏差：
  1. **范围收敛为仅源 commit 仓一份**。「卡片池 source 仓」与「完成 commit done 仓」同源（都是 Nacos `codeup.repos:` 的同一名单），不划分 SOURCE / DONE 两份。
  2. **提供只读弹层**。在 toolbar 增加「⚙ 代码仓」按钮，点击后调用 `POST /schedule/repos` 拉取实时生效的 Nacos 配置，以表格呈现 `repo / name / defaultBranch`。底部提示「需增减 / 修改？请联系运维修改 Nacos `codeup.repos`」。
  3. **不提供前端编辑 / 增删 / 后端 CRUD 接口 / DDL**。避免引入 `feat_schedule_repo` 表与 Nacos 配置两路双过。
- 后端零变动：Nacos `codeup.repos:` YAML 由 `CodeupFeatScheduleCommitFetcher` 加载，Mock 环境走 `MockFeatScheduleCommitFetcher` 硬编码 4 仓。
- 后续若 PM 明确提出「仓库可动态增删」需求，再评估补充 `feat_schedule_repo` 表与 CRUD 接口。
