---
name: feature-schedule-job
description: 系统功能排期模块「卡片池（Backup）commit 采集 Job」的触发策略、字段映射、幂等设计与运维手册
---

# 系统功能排期 — 卡片池采集 Job

> 卡片池（Backup）改为 **Job 周期同步** 落地：定时拉取 `codeup.repos:` 中**唯一被标记为 `cardPoolSource: true`** 的仓 + `collectBranch` 分支的最新 commit，
> 经字段映射与幂等校验后写入 [feat_schedule_card](file:///Users/lc/Project/java/sk/busyming-snackingdom/docs/feature_schedule.sql)，由月视图接口直接渲染。
>
> 该方案替代了 [third-party-integration.md §8](third-party-integration.md) 与 [implementation-steps.md §4](implementation-steps.md) 列出的「Commit 采集 Job」扩展项。

## 1. Skill 偏差说明

`SKILL.md` v1.x 描述「提交即出卡」，给读者「实时 + 全仓」的预期。开发实施后明确：

- 卡片池数据来源是 **DB 快照**，由本 Job 周期同步；非每次刷新都查云效
- 默认同步周期 **15 分钟**，从 commit push 到 Backup 出现的时延 ≤ 15 分钟
- **卡片池仅对应单一仓库的特定分支**：在 `codeup.repos[]` 中通过 `cardPoolSource: true` 标识唯一的源仓，并由 `collectBranch` 指定采集分支；其它仓仅作为「完成 commit」候选下拉的数据源，不参与采集
- 所有 commit 是否生成卡片，再叠加下文「过滤规则」共同决定

请产品在下次 SKILL.md 修订时把「提交即出卡」更准确表述为「指定源仓 + 指定分支的提交，≤ 15 分钟自动出卡」。

## 2. 总体方案

```
SchedulerX (cron, 每 15 分钟)
        │
        ▼
FeatScheduleCommitCollectJob#doProcess
        │
        ├── 1. 解析任务参数（可选：覆盖 perPage / branch / since / until）
        ├── 2. 在 codeup.repos[] 中定位 cardPoolSource=true 的唯一仓
        │      └── 多于 1 个 → 取首个并 WARN；0 个 → ProcessResult(true, "no source repo")
        ├── 3. branch = 任务参数 ?? cfg.collectBranch ?? cfg.defaultBranch ?? codeup.defaultBranch
        ├── 4. commitFetcher.listCommits(repo, branch, null, since, until, perPage)
        ├── 5. 字段映射：FeatScheduleCommitVO → FeatScheduleRequest.CreateCard
        ├── 6. 调 featureScheduleService.createFromCommit(req)
        │      └── DB 唯一键 uk_source_commit (source_repo, source_commit_hash, deleted_flag) 兜底幂等
        └── 7. 汇总统计：scanned / created / skipped / failed → ProcessResult.message
```

**关键事实**：

- `FeatureScheduleService#createFromCommit` 已有完整入库 + 幂等 + 流水（[FeatureScheduleServiceImpl:104](file:///Users/lc/Project/java/sk/busyming-snackingdom/busyming-snackingdom-service/src/main/java/io/busyming/basic/snackingdom/service/schedule/FeatureScheduleServiceImpl.java#L104)），Job 不重复实现这层逻辑
- 仓库白名单复用 `codeup.repos:`（同 Backup「⚙ 代码仓」弹层的数据源），新增 `cardPoolSource` / `collectBranch` 两个字段，不再单建配置项
- `cardPoolSource` 全局**唯一**：管理员在 Nacos 中只允许一个仓为 `true`；其余仓仅供 `markDone` 候选下拉调用 `listCommits`
- 不需要新表、新接口；删除 commit 后再次 push 同一 hash → 受 `uk_source_commit` 联合 `deleted_flag` 控制，可重新采集

## 3. Job 配置

### 3.1 基础信息

| 项 | 值 |
|----|----|
| Bean 类 | `io.busyming.basic.snackingdom.job.FeatScheduleCommitCollectJob` |
| Processor 基类 | `AbstractJavaProcessor`（与 [CapacitySnapshotJob](file:///Users/lc/Project/java/sk/busyming-snackingdom/busyming-snackingdom-job/src/main/java/io/busyming/basic/snackingdom/job/CapacitySnapshotJob.java) 一致） |
| 默认调度 | cron `0 */15 * * * ?`（每 15 分钟） |
| 超时 | 30s（单仓单分支请求 ≤ 15s） |
| 失败重试 | 1 次，间隔 60s |
| 并发 | 单实例（`com.alibaba.schedulerx.worker.dispatch.consumer = 1`） |

### 3.2 任务参数（JSON，可缺省）

```json
{
  "perPage": 100,
  "branch": "release/2026-05",
  "since": "2026-05-01 00:00:00",
  "until": "2026-05-07 23:59:59"
}
```

| 字段 | 默认 | 说明 |
|----|----|----|
| `perPage` | 100 | 单次拉取条数（1~100） |
| `branch` | `cfg.collectBranch` → `cfg.defaultBranch` → `codeup.defaultBranch` | 临时覆盖采集分支，便于从发布分支手动回灌 |
| `since` | — | 提交起始时间（含，按系统默认时区），格式 `yyyy-MM-dd HH:mm:ss`；出站前自动转 UTC `Z` 拼给云效 API |
| `until` | — | 提交截止时间（含），同上格式与转换语义 |

> 源仓唯一由 Nacos `cardPoolSource: true` 决定，Job 调试期只需调整 `branch` / `perPage` / `since` / `until`。
> 历史回灌：配合 `since` / `until` 指定时间窗口 + `perPage=100` 单次拉取上限，`uk_source_commit` 幂等兜底避免重复。

### 3.3 新增配置项（`codeup.repos[]` 与全局）

在现有 [CodeupFeatScheduleCommitFetcher.RepoConfig](file:///Users/lc/Project/java/sk/busyming-snackingdom/busyming-snackingdom-service/src/main/java/io/busyming/basic/snackingdom/service/schedule/CodeupFeatScheduleCommitFetcher.java#L74) 上补 2 个字段：

| 配置键 | 类型 | 必填 | 默认 | 说明 |
|----|----|----|----|----|
| `codeup.repos[].cardPoolSource` | bool | 否 | `false` | 是否为卡片池采集源；**全局仅允许 1 个为 `true`**，多于 1 个时 Job 取首个并 WARN |
| `codeup.repos[].collectBranch` | string | 否 | 同 `defaultBranch` | 采集 Job 到该仓拉取的分支；与该仓 `markDone` 候选下拉的 `defaultBranch` 解耦 |
| `codeup.repos[].pathPrefixWhitelist` | string[] | 否 | `[]` | 按文件路径前缀过滤的**白名单**；非空时，`commit.changedPaths` 必须至少命中一条前缀才入库（前缀区分大小写）。用于「仅采集某业务域的提交」，如 Skill 仓配置 `["零食王国/"]` |
| `codeup.repos[].pathPrefixBlacklist` | string[] | 否 | `[]` | 按文件路径前缀过滤的**黑名单**；非空时，若 `commit.changedPaths` 全部命中黑名单前缀则跳过（混合变更仍然采集，避免漏掉有效改动）。典型场景：Skill 仓采集时配置 `[".agents/"]` |
| `codeup.collect-ignore-authors` | string[] | 否 | `[]` | 机器人 / 账号名单，完全匹配 `commit.author` 后跳过入库（详 §5） |

示例（Nacos `busyming-snackingdom.yml`）：

```yaml
codeup:
  mock-enabled: false
  base-url: https://openapi-rdc.aliyuncs.com
  organization-id: 60xxxxxxxx
  token: pt-xxxxxxxx
  default-branch: master
  collect-ignore-authors:               # 新增：采集跳过名单
    - gitlab-bot
    - codeup-bot
  repos:
    - repoName: snackingdom-mall-web
      displayName: 零食王国 Web 前端
      repoId: "2813489"
      defaultBranch: main
      cardPoolSource: true              # 当前唯一卡片池源仓
      collectBranch: main
    - repoName: busyming-skills
      displayName: Skill 文档仓（零食王国）
      repoId: "2813491"
      defaultBranch: master
      # cardPoolSource: false 默认；如需切换源仓时可打开
      pathPrefixWhitelist:              # 新增：仅采集此前缀下的变更
        - 零食王国/
      pathPrefixBlacklist:              # 新增：此前缀下的变更跳过
        - .agents/
    - repoName: busyming-snackingdom
      displayName: 零食王国后端
      repoId: "2813490"
      defaultBranch: main
      # 无 cardPoolSource→仅供 markDone 候选使用
```

## 4. 字段映射

`FeatScheduleCommitVO` →（Job 内构造）→ `FeatScheduleRequest.CreateCard`：

| 目标字段 | 来源 | 处理 |
|----|----|----|
| `sourceRepo` | 当前循环 `repo` | 直接赋值 |
| `sourceModule` | `commit.message` 头部 | 按 §4.1 Conventional Commit 正则解析；未命中落 `MISC` |
| `sourceCommitHash` | `commit.hash` | 完整 SHA |
| `commitMessage` | `commit.message` | 原文（Service 内部会 `truncate(., 1024)`） |
| `authorUserId` | — | 留 `null`（Service 兜底为 -1L「未匹配 sys_user」） |
| `authorName` | `commit.author` | 直接赋值 |
| `authoredAt` | `commit.authoredAt` | 直接赋值 |
| `hardwareManagement` | `commit.message` 解析 | 仅 `sourceModule=hardware-management` 时填充；其余为空 |

### 4.1 sourceModule 识别规则（commit message 解析）

采用 **Conventional Commit** 头部约定从 `commit.message` 第一行解析模块名，**不再**调云效 diff 接口、**不再**依赖任何字典表。

```java
// FeatScheduleCollectServiceImpl
private static final Pattern MODULE_PAT = Pattern.compile(
        "^(feat|fix|refactor|perf|chore|docs|style|test|build|ci|revert)\\(([A-Za-z0-9._\\-]+)\\)\\s*[:!]");
private static final String FALLBACK_MODULE = "MISC";
```

匹配规则：

1. 仅匹配 message 首行行首；`type` 必须在白名单内（`feat|fix|refactor|perf|chore|docs|style|test|build|ci|revert`）；
2. `module` 段允许字母、数字、`.` `_` `-`，区分大小写**原样**透传到 `sourceModule`；
3. 不带括号或 `type` 不在白名单 → `sourceModule = MISC`；
4. 模块标签**不参与** `cardNo` 生成（见 §4.3），仅用于看板分组与统计。

**示例**：

| commit.message 首行 | sourceModule |
|----|----|
| `feat(store-request): 调拨单支持件数单位` | `store-request` |
| `fix(hardware-management): 修复 PDA 扫码超时` | `hardware-management` |
| `refactor(voucher): 抽取 doc-status 枚举` | `voucher` |
| `chore: 升级依赖` | `MISC` |
| `Merge branch ...` / `Revert ...` | 不入库（§5 过滤） |
| `update sth` | `MISC` |

> 后端、前端、App 三个仓库统一遵循该提交规范；非规范的历史 commit 落 `MISC`，运维可在 SLS 通过 `[fs-collect]` 关键字看 `moduleMiss` 数量。

### 4.2 hardwareManagement 标签提取

仅在 `sourceModule == hardware-management` 时生效，从 commit message 中提取 `[hw:xxx]`：

```java
private static final Pattern HW_PAT = Pattern.compile("\\[hw:([^\\]]+)\\]");
```

此逻辑与模块解析无关，是业务层面的映射补充。

### 4.3 cardNo 生成规则

卡片编号与模块**完全解耦**，统一格式：

```
FS-{YYYYMMDD}-{NNN}
  └─ 全局统一前缀
         └─ 业务日期（按 commit authoredAt 当日）
                       └─ 当日全局递增 3 位序号
```

- 由 [FeatScheduleCardNoGenerator](file:///Users/lc/Project/java/sk/busyming-snackingdom/busyming-snackingdom-service/src/main/java/io/busyming/basic/snackingdom/service/schedule/FeatScheduleCardNoGenerator.java) 生成，使用 `FOR UPDATE` 行锁查 `MAX(card_no)` + 1 保证并发安全；
- 不再按模块分桶（旧方案 `SR-20260507-01`、`HW-20260507-01` 已下线）；
- 当日序号溢出 999 触发告警（业务侧不会出现，且预留 3 位足够）。

## 5. 过滤规则（Job 层，写库前）

| 场景 | 处理 |
|----|----|
| `commit.message` 以 `Merge ` 开头 | 跳过（合并提交不出卡） |
| `commit.message` 以 `Revert ` 开头 | 跳过（撤销提交不出卡，避免与 `done_commits` 撤回冲突） |
| `commit.message` 长度 < 5 | 跳过（无意义 commit） |
| `commit.author` ∈ Nacos `codeup.collect-ignore-authors[]` | 跳过（机器人账号，如 `gitlab-bot`） |
| 源仓配置 `pathPrefixWhitelist` 非空且 `commit.changedPaths` 未命中任一前缀 | 跳过（不在白名单范围内），统计为 `skippedByPath` |
| 源仓配置 `pathPrefixBlacklist` 非空且 `commit.changedPaths` **全部**命中黑名单前缀 | 跳过（混合变更仍采集），统计为 `skippedByPath` |
| 同 `(sourceRepo, sourceCommitHash)` DB 已存在 | Service 内部幂等 → `firstTime=false`，统计为 `skipped` |

> 过滤名单 `codeup.collect-ignore-authors` 为本 Job 新增配置项，建议默认空数组，运维按需增删。
>
> `pathPrefixWhitelist` / `pathPrefixBlacklist` 依赖 Codeup `GET /commits/{hash}/files` 或 `listChangedPaths` 拿到 `commit.changedPaths`；若接口超时或返回空路径，保守采集（`kept`）并记 WARN。日志示例：
>
> ```
> [fs-collect] busyming-skills 路径过滤：scanned=12 kept=4 skipped=8 skippedByPath=8 sample=sk02bbb:.agents/... | sk03ccc:README.md
> ```

## 6. 异常与日志

- `cardPoolSource=true` 仓 0 个 → 记 WARN，返回 `ProcessResult(true, "no source repo")`，不报错
- `cardPoolSource=true` 仓 ≥ 2 个 → 记 WARN 并列出全部名称，取首个继续执行
- `listCommits` 报错或返回空 → 记 WARN，汇总 `failed=0 scanned=0`，不报错
- 单条 commit `createFromCommit` 抛错 → 记 ERROR + commit hash，统计 `failed++`，继续
- Job 整体不抛异常出 `doProcess`，始终返回 `ProcessResult(true, summary)`，避免 SchedulerX 重试风暴
- 日志统一前缀 `[fs-collect]`，便于 SLS / ELK 过滤；INFO 级别仅打印汇总：

```
[fs-collect] done elapsed=820ms repo=snackingdom-mall-web branch=main scanned=50 created=2 skipped=46 failed=0 moduleHit=48 moduleMiss=2 missSamples=6da8c14:package.json;3fdaf11:vite.config.ts
```

- `moduleMiss > 0` 时额外打印 WARN：`commit message 未匹配 Conventional Commit 头部，已落 MISC，样例：[shortHash:firstLineOfMessage, ...]`，便于 SLS 关键字告警及督促开发者规范提交格式

## 7. 实施步骤（开发清单）

1. **扩展 RepoConfig**：在 [CodeupFeatScheduleCommitFetcher.RepoConfig](file:///Users/lc/Project/java/sk/busyming-snackingdom/busyming-snackingdom-service/src/main/java/io/busyming/basic/snackingdom/service/schedule/CodeupFeatScheduleCommitFetcher.java#L74) 补 `cardPoolSource` / `collectBranch` / `pathPrefixWhitelist` / `pathPrefixBlacklist`；同时在外层补 `collectIgnoreAuthors` 字段。该五个字段仅 Job 采集读取，`listRepos()` / `listCommits()` / `findCommit()` 逻辑保持不变。`listChangedPaths(repo, commitHash)` 新增方法用于路径过滤，调用云效 `GET /commits/{sha}/diff` 接口。
2. **新增 Job 类** [busyming-snackingdom-job/src/main/java/io/busyming/basic/snackingdom/job/FeatScheduleCommitCollectJob.java](file:///Users/lc/Project/java/sk/busyming-snackingdom/busyming-snackingdom-job/src/main/java/io/busyming/basic/snackingdom/job/FeatScheduleCommitCollectJob.java)，继承 `AbstractJavaProcessor`。
3. **依赖注入**：`CodeupFeatScheduleCommitFetcher`（直接注入实现类以读配置，Mock 模式下该 Bean 不存在 → 使用 `@Autowired(required=false)` 并在 §6 返回`no source repo`） + `FeatureScheduleService`。
4. **解析参数**：参考 [CapacitySnapshotJob](file:///Users/lc/Project/java/sk/busyming-snackingdom/busyming-snackingdom-job/src/main/java/io/busyming/basic/snackingdom/job/CapacitySnapshotJob.java) 的 ObjectMapper；参数为空时走 §3.2 默认。
5. **定位源仓**：`fetcher.getRepos().stream().filter(RepoConfig::isCardPoolSource)` ；保护多个 / 0 个场景（§6）。
6. **拉取 + 过滤 + 入库**：调 `commitFetcher.listCommits(repo, branch, null, perPage)`，实现 §5 的过滤；调 `featureScheduleService.createFromCommit(req)` 根据 `firstTime` 累加计数。
7. **SchedulerX 注册**：在调度后台新建任务 `FS_COMMIT_COLLECT`，processorBean=`featScheduleCommitCollectJob`，cron=`0 */15 * * * ?`。
8. **Nacos 配置**：在 `busyming-snackingdom.yml` 中应用 §3.3 示例。
9. **首跑**：手动触发一次，观察日志 + DB `feat_schedule_card` 行数。

## 8. 验证脚本

```bash
# 1. 触发 Job（运维侧 SchedulerX 控制台「立即执行」）
#    本地可传 mock 任务参数：
#    {"perPage": 5}

# 2. 验证 DB 入库（仅 cardPoolSource 仓会出现）
mysql> SELECT card_no, source_repo, source_commit_hash, status, created_at
       FROM feat_schedule_card
       WHERE source_repo = 'snackingdom-mall-web'
       ORDER BY created_at DESC
       LIMIT 10;

# 3. 验证其它仓未被采集
mysql> SELECT DISTINCT source_repo FROM feat_schedule_card WHERE created_by = -1;
# 期望仅返回 cardPoolSource=true 的仓名

# 4. 验证幂等：再次触发，相同 hash 不重复入库
mysql> SELECT source_repo, source_commit_hash, COUNT(*) c
       FROM feat_schedule_card
       GROUP BY source_repo, source_commit_hash
       HAVING c > 1;
# 期望返回 0 行

# 5. 验证流水：每条新卡片都有一条 CREATED 流水
mysql> SELECT l.card_no, l.op_type, l.op_detail, l.operator_name
       FROM feat_schedule_card_log l
       JOIN feat_schedule_card c ON c.card_no = l.card_no
       WHERE l.op_type = 'CREATED' AND c.created_by = -1
       ORDER BY l.operated_at DESC LIMIT 10;

# 6. 验证前端 Backup 渲染（15 分钟内可见新卡）
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/cards/month" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"month":"2026-05","includeBackup":true}' | jq '.data.backup | length'

# 7. 手动覆盖分支采集（验证 release 分支）
#    任务参数：{"branch": "release/2026-05", "perPage": 100}
```

## 9. 回归用例

| # | 用例 | 期望 |
|---|------|------|
| 1 | 源仓指定分支新 push 1 条 feat commit | 15 分钟内 Backup 出现 1 张卡片 |
| 2 | 同条 commit Job 再次扫到 | DB 不新增；Service 返回 `firstTime=false` |
| 3 | Merge / Revert commit | 不入库；`scanned++` 但 `skipped++` |
| 4 | 其它仓（未标 cardPoolSource）push commit | **不被扫描**，仗赖 markDone 选择则可用 |
| 5 | `cardPoolSource=true` 仓 0 个 | Job 返回 `no source repo`，无 ERROR |
| 6 | `cardPoolSource=true` 仓 ≥ 2 个 | WARN + 取首个执行 |
| 7 | `codeup.token` 失效 | listCommits 返回空，Job 完成 `failed=0 scanned=0` |
| 8 | 一条 commit 入库异常 | Job 不中断，其它 commit 正常入库 |
| 9 | 卡片被前端删除（deleted_flag=1）后同 hash 再 push | 因唯一键含 deleted_flag，可重新生成新卡片 |
| 10 | 任务参数 `branch=release/2026-05` | Job 仅拉取该分支上的 commit |
| 11 | message=`feat(store-request): xxx` | `sourceModule=store-request`，`moduleHit++`，cardNo=`FS-YYYYMMDD-NNN` |
| 12 | message=`feat(StoreRequest): xxx`（驼峰） | `sourceModule=StoreRequest`（原样透传），`moduleHit++` |
| 13 | message=`update something` | 不匹配正则 → `sourceModule=MISC`，`moduleMiss++` |
| 14 | message=`fix(hardware-management)!: 不兼容修复` | `sourceModule=hardware-management`（支持 `!:` 破坏性变更标记） |
| 15 | message=`Merge branch 'main'` | §5 过滤跳过，不计入 hit/miss |
| 16 | Skill 仓（`busyming-skills`）提交命中 `零食王国/` 前缀白名单 | 入库；统计 `kept++` |
| 17 | Skill 仓提交 `changedPaths` 全部为仓库根文件（如 `README.md`），未命中 `零食王国/` 白名单 | 跳过；`skippedByPath++`，日志 sample 打印该 commit |
| 18 | Skill 仓提交 `changedPaths` 全部在 `.agents/` 下 | 跳过；`skippedByPath++` |
| 19 | Skill 仓提交同时含 `零食王国/` 与 `.agents/` 变更 | 入库（混合变更白名单命中即采，避免漏掉有效改动） |
| 20 | Skill 仓 `listChangedPaths` 接口超时返回空 | 保守采集 `kept++` + WARN，不中断 Job |

## 10. 监控与运维建议

- SchedulerX 任务设置 **执行结果通知**：连续 3 次 `failed > 0` → 钉钉告警
- DB 增加观测视图：`Backup 卡片数（status=PENDING && scheduled_date IS NULL）` 30 分钟无增长 → 告警
- 日志关键字告警：`[fs-collect] *** failed=` 中 `failed > 0` 触发企微推送

## 11. 后续可演进方向

- **替换为 Codeup Webhook**：push 事件即时回调内部接口 `POST /schedule/cards`，省去 5 分钟时延（注意补幂等防重放）
- **多分支轮询**：`codeup.repos[].branches: [main, release/*]` 支持发布分支同步
- **commit author → sys_user 自动关联**：维护 `email → sys_user.id` 映射表，避免 `owner_user_id` 默认 -1
