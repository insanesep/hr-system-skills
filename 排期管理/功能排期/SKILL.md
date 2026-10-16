---
name: feature-schedule
description: 系统功能排期。Use when 需要可视化管理研发仓 git commit → 卡片 → 月历排期 → 四态跟踪（待开发/开发中/开发完成/延期）+ 非需求改动旁路（手动标记）→ 领取开发与完成 commit 关联，以卡片拖拽形式完成排期，涉及 feat_schedule_card 表，以及 /api/v1/schedule/cards 接口。端型：仅 Web 端。
---

# 系统功能排期

面向产品与项目管理人员的轻量排期工具：将研发代码仓的每一次 git commit 自动生成一张待开发卡片，沉淀到 Backup 卡片池，PM 通过拖拽将卡片排到日历指定日期，并跟踪「待开发 / 开发完成 / 延期」三态，完成时可选择性关联研发仓的完成 commit，用于闭环回溯。

## 端

**仅 Web 端**（管理后台 Portal 下「系统」分组）。App 端不提供此入口。

## 产品背景

现有 RBAC、使用情况分析解决了「谁能用 / 谁在用」的问题，但研发排期与实际交付之间缺乏可视化锚点：

- 研发仓 commit 流水很细，但 PM 看不见「哪些是新需求、哪些是在做、延期了没」
- 没有统一的排期视图：Excel 排期表散落在 IM 群，无法和 git 事实对齐
- 延期、完成状态靠口述，缺乏与真实 commit 的回执对应

本模块提供「git commit → 排期卡片」的双向可视化：

1. 提交即出卡：新 commit 自动生成一张待开发卡片（白色），默认负责人 = 提交人、标题 = 概括、内容 = 原文 message；若源仓配置了路径前缀白/黑名单（如 Skill 仓只采集 `零食王国/`），则仅命中白名单的 commit 出卡
2. 拖拽即排期：Backup 卡片池的卡片可拖到月历指定日期，跨天移动亦支持
3. 完成可回执：切换「开发完成」状态时可关联研发仓 git commit（hash + 仓库链接，选填），建立排期与实际交付的回执
4. 延期自动识别：排期日已过且仍未完成的卡片在视图中自动以橙色呈现，PM 一眼看到延期项

## 页面结构

参见 `asset/feature-schedule.html`，单页布局：

```
宽屏（≥1600px）：
┌─────────────┬─────────────────────────────────────────────────┐
│  待排期池   │ 日期导航 │ 本月进度(行内) │ 搜索/视图/筛选/新建/更多 │
│ 240~300px   ├─────────────────────────────────────────────────┤
│ 独立滚动    │ 月历区（周一 ~ 周日七列，5~6 行）                 │
└─────────────┴─────────────────────────────────────────────────┘

中小屏（<1600px 笔记本优先）：
┌─────────────┬─────────────────────────────────────────────────┐
│  待排期池   │ 日期导航 │ 搜索/视图/筛选(N)/新建/更多（进度收浮层）│
│             ├─────────────────────────────────────────────────┤
│             │ 月历区；单格最多 3 张卡片，多余折叠为「+N」       │
└─────────────┴─────────────────────────────────────────────────┘
```

页面身份由 Portal 面包屑与页签提供，业务区不重复渲染页面大标题。**v2.5 起头部在所有 ≥1025px 宽度默认保持单行**：搜索上移头部直出；状态/负责人/skills 仓库/模块筛选统一收进右侧「筛选抽屉」（Draft/Apply）；「只看自己」为抽屉顶部快捷开关（AcSwitch，即时生效）；「合并卡片」与「显示密度（标准/紧凑）」收进「更多」菜单。**v2.5.1（同日用户复核迭代）**：①待排期池支持收起/展开；②搜索框加宽（260/240/220/200/180px 按断点）；③≤1366 视图切换短标签（月/周/列表）。**v2.5.2（同日二次复核迭代）**：①**本月进度 = ≥1800 行内常驻 / <1800 收「进度」浮层点击显示**（真实数据自然宽 ~450px（如 已完成 490），<1800 行内必截断；浮层为自管理 month-picker 同款，统计项仍可点击快捷筛选）；②池收起/展开图标定稿 `menu-unfold`（轨道展开）/ `menu-unfold-one`（池头收起）。页面不滚动、日历在视图内部滚动，工具栏天然常驻，无 Sticky 结构。

抽屉（点击卡片从右侧滑入）：
- 卡片编号（只读） / 标题 / 内容 / 负责人
- 状态切换按钮（待开发 / 开发完成 / 延期自动）
- 「开发完成」态选填：完成 commit hash、研发仓链接
- 保存 / 删除

## 数据模型

### feat_schedule_card（排期卡片主表）

```sql
CREATE TABLE feat_schedule_card (
    id                BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    card_no           VARCHAR(32)  NOT NULL                COMMENT '业务编号：FS-{YYYYMMDD}-{NNN}（3 位序号）',
    title             VARCHAR(64)  NOT NULL                COMMENT '标题（≤ 30 字，对 commit 的概括）',
    content           VARCHAR(1024) NOT NULL               COMMENT 'commit message 原文，保留多行',
    owner_user_id     BIGINT       NOT NULL                COMMENT '负责人 sys_user.id（默认等于 commit author）',
    owner_name        VARCHAR(64)  NOT NULL                COMMENT '负责人姓名（冗余）',
    status            VARCHAR(16)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / IN_PROGRESS / DONE / NON_FEATURE（延期由前端基于 end_date 与 NOW 计算，不落库；NON_FEATURE 为非需求改动旁路态，由 PM 手动标记）',
    scheduled_date    DATE                                 COMMENT '排期日期（月视图索引锚点，区间排期下 = start_date）；NULL = 在待排期池',
    start_date        DATE                                 COMMENT 'v2.1+ 排期开始日期；NULL=未排期；与 end_date 成对',
    end_date          DATE                                 COMMENT 'v2.1+ 排期结束日期（含）；NULL=未排期；应用层约束 end_date >= start_date',
    source_repo       VARCHAR(128) NOT NULL                COMMENT '源 commit 所在研发仓名，如 snackingdom-mall-web',
    source_module     VARCHAR(128) NOT NULL                COMMENT '源 commit 所在模块目录，如 store-request',
    source_commit_hash VARCHAR(64) NOT NULL                COMMENT '源 commit hash（生成卡片时记录）',
    hardware_management VARCHAR(256)                         COMMENT '硬件管理信息（源 commit hardware-management 字段内容）',
    req_nature        VARCHAR(16)  NOT NULL DEFAULT 'BIZ'  COMMENT 'v2.6+ 需求性质：BIZ=业务功能（默认）/ TECH=技术支持（技术类、非功能性——文档补录、参数说明、性能优化、工具脚本、changelog 等）；实施排期聚合分流依据，亦可由实施排期「移入非实施」回写置 TECH',
    biz_contact_name  VARCHAR(64)                          COMMENT 'v2.6+ 业务对接人：产品手工维护（REQ 关联卡预填提交人可改，手改优先）；v2.7 起排期保存时必填校验（REQ 关联 / TECH / NON_FEATURE 豁免）；实施排期聚合时快照到实施卡',
    dev_user_id       BIGINT                               COMMENT '开发人 sys_user.id（status=IN_PROGRESS / DONE 必填，领取时写入，回退 PENDING 时置 NULL）',
    dev_user_name     VARCHAR(64)                          COMMENT '开发人姓名（冗余）',
    dev_taken_at      DATETIME                             COMMENT '领取开发的时间',
    done_repo         VARCHAR(128)                         COMMENT '完成 commit 所在仓库名（status=DONE 时选填）',
    done_commit_hash  VARCHAR(64)                          COMMENT '完成 commit hash（status=DONE 时选填）',
    done_commit_url   VARCHAR(512)                         COMMENT '完成 commit 的可点击链接（Codeup/Gitlab）',
    done_at           DATETIME                             COMMENT '状态切换至 DONE 的时间',
    is_merged         TINYINT      NOT NULL DEFAULT 0       COMMENT '是否合并卡：1=本卡是由多张子卡合并而成；0=普通卡/子卡',
    parent_merge_card_no VARCHAR(32)                        COMMENT '若作为子卡被合并，则指向父合并卡 card_no；否则 NULL（子卡在 Backup/月历中按本字段过滤隐藏）',
    created_by        BIGINT       NOT NULL                COMMENT '卡片创建人（commit 采集任务 = 系统账号 0）',
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by        BIGINT,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_card_no (card_no),
    UNIQUE KEY uk_source_commit (source_repo, source_commit_hash),
    KEY idx_schedule_date (scheduled_date),
    KEY idx_start_end_date (start_date, end_date),
    KEY idx_owner (owner_user_id),
    KEY idx_status (status),
    KEY idx_parent_merge (parent_merge_card_no)
) COMMENT='系统功能排期卡片，每条 git commit 生成一条';
```

> **v2.1 区间排期双写联动（2026-09-20 起）**：`scheduled_date` 保留为月视图索引锚点，`start_date/end_date` 与其双写同步——旧链路只写 `scheduledDate` 时后端联动 `start=end=scheduledDate`；新链路写 `startDate+endDate` 时后端联动 `scheduled_date=start_date`；清空排期/移入非需求改动时三字段同清。存量数据已回填 `start=end=scheduled_date`（DDL 见 busyming-snackingdom-devops `docs/20260920/lihao/feat-schedule-date-range/`，DMS 须拆单执行：先 01_ddl.sql 结构变更、列生效后再 02_backfill.sql 回填）。月视图检索由「`scheduled_date` 位于当月」升级为「区间重叠（`start_date<=月末 && end_date>=月初`；`start_date IS NULL` 的 legacy 行回退锚点匹配）」，跨月区间卡在两月视图均可见。

> 合并卡约定：`is_merged=1` 的卡片 `source_repo='_merge'`、`source_commit_hash='MERGE:{cardNo}'`（绕开 `uk_source_commit` 唯一键冲突），`source_module` 取子卡共同模块；`owner_*` = 执行合并的当前用户。

### feat_schedule_card_merge_item（合并卡-子卡明细表）

```sql
CREATE TABLE feat_schedule_card_merge_item (
    id                      BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键',
    merge_card_no           VARCHAR(32) NOT NULL                COMMENT '父合并卡 card_no',
    child_card_no           VARCHAR(32) NOT NULL                COMMENT '子卡 card_no',
    pre_merge_status        VARCHAR(16) NOT NULL                COMMENT '合并前子卡原始状态快照（PENDING / IN_PROGRESS）',
    pre_merge_scheduled_date DATE                               COMMENT '合并前子卡原始排期快照，NULL 表示原本就在 Backup',
    pre_merge_dev_user_id   BIGINT                              COMMENT '合并前开发人快照',
    pre_merge_dev_user_name VARCHAR(64)                         COMMENT '合并前开发人姓名快照',
    pre_merge_dev_taken_at  DATETIME                            COMMENT '合并前领取时间快照',
    added_at                DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '子卡加入合并的时间',
    added_by                BIGINT      NOT NULL                COMMENT '执行合并的用户 sys_user.id',
    PRIMARY KEY (id),
    UNIQUE KEY uk_child (child_card_no),
    KEY idx_merge (merge_card_no)
) COMMENT='合并卡-子卡明细，嵌套合并通过 UPDATE merge_card_no 扁平化';
```

> 嵌套合并扁平化：当子卡本身就是合并卡 `M_old` 时，将 `M_old` 下所有 merge_item 直接 `UPDATE SET merge_card_no = M_new` 归到新合并卡，**保留原 `pre_merge_*` 快照**以便解散时回到最初独立态；随后删除 `M_old` 主记录。

### feat_schedule_card_log（卡片操作记录流水）

```sql
CREATE TABLE feat_schedule_card_log (
    id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    card_no      VARCHAR(32)  NOT NULL                COMMENT '关联 feat_schedule_card.card_no',
    op_type      VARCHAR(24)  NOT NULL                COMMENT 'CREATED / SCHEDULED / UNSCHEDULED / RESCHEDULED / EDITED / TAKEN / RELEASED / MARKED_DONE / REVERTED / DELETED',
    op_detail    VARCHAR(512)                         COMMENT '详情文本，如「排期到 2026-05-07」「从 05-06 改到 05-09」「标题：修复分拣 → 分拣超时」',
    operator_id  BIGINT       NOT NULL                COMMENT 'sys_user.id；0 = 系统（commit 采集触发）',
    operator_name VARCHAR(64) NOT NULL                COMMENT '操作人姓名（冗余）',
    operated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    PRIMARY KEY (id),
    KEY idx_card_time (card_no, operated_at)
) COMMENT='排期卡片操作流水，按 card_no 追加，不可修改';
```

> 仅追加不删除；页面以倒序时间线呈现。每次状态变更、排期变更、字段编辑、删除均写入一条。

### feat_schedule_release_day（发版日标记表）

```sql
CREATE TABLE feat_schedule_release_day (
    id          BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键',
    release_date DATE       NOT NULL                COMMENT '发版日期',
    created_by  BIGINT      NOT NULL                COMMENT '标记人 sys_user.id',
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_release_date (release_date)
) COMMENT='发版日标记，点击日历日期设置/取消';
```

> 日期维度的轻量标记，点击日历空白区域即可切换。发版日以蓝色高亮呈现，用于区分常规排期日与正式发版日。

### feat_schedule_module_code（已废弃，仅作历史保留）

> ⚠️ **已废弃**：代码事实以 [`FeatScheduleCardNoGenerator`](../../../../../busyming-snackingdom-devops/busyming-snackingdom-devops-service/src/main/java/io/busyming/innovation/snackingdom/devops/service/schedule/FeatScheduleCardNoGenerator.java) 为准：统一使用 `FS-{YYYYMMDD}-{NNN}` 前缀，已与模块解耦；DB 中 **未建 `feat_schedule_module_code` 表**，也不提供 `/api/v1/schedule/module-codes` 接口。代码注释（[`FeatScheduleCollectServiceImpl`](../../../../../busyming-snackingdom-devops/busyming-snackingdom-devops-service/src/main/java/io/busyming/innovation/snackingdom/devops/service/schedule/FeatScheduleCollectServiceImpl.java) 顶部）明确标注「已废弃 feat_schedule_module_code 字典 + 路径匹配方案」。以下 DDL 与初始化数据仅作历史设计参考，**不作为上线依据**：

```sql
-- 历史设计（已废弃，不要执行）
CREATE TABLE feat_schedule_module_code (
    id          BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键',
    module_path VARCHAR(128) NOT NULL               COMMENT '研发仓目录名，如 store-request',
    module_code VARCHAR(16)  NOT NULL               COMMENT '编号前缀缩写，如 SR',
    module_name VARCHAR(64)  NOT NULL               COMMENT '中文说明',
    status      TINYINT      NOT NULL DEFAULT 1     COMMENT '1=启用 0=停用',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_module_path (module_path),
    UNIQUE KEY uk_module_code (module_code)
) COMMENT='目录到卡片编号前缀的映射';
```

**初始化数据**：

| module_path | module_code | module_name |
|-------------|-------------|-------------|
| `store-request` | `SR` | 门店要货 |
| `usage-analytics` | `UA` | 功能使用分析 |
| `people-flow-monitoring` | `PFM` | 人流监控 |
| `hardware-management` | `HM` | 硬件管理 |
| `product-query` | `PQ` | 商品货架查询 |
| `product-apply` | `PA` | 商品申请 |
| `capacity-manage` | `CM` | 库容管理 |
| `inventory-comprehensive-report` | `ICR` | 库存综合分析 |
| `visitor-appointment` | `VA` | 客户预约 |
| `fulfillment-rate` | `FR` | 满足率分析 |
| `contract` | `CT` | 合同申请 |
| `srm` | `SRM` | SRM |
| `voucher` | `VC` | 乐檬凭证 |
| `threeMatchWay` | `TMW` | 三单匹配 |
| `snackingdom-portal` | `SP` | Portal 框架 |
| `wecom-login` | `WL` | 企微登录 |
| `feature-schedule` | `FS` | 系统功能排期（自循环） |
| 未匹配 | `MISC` | 其它 |

> 新增研发模块时：DBA 与 PM 同步维护本表，缩写规则 = 目录名按 `-`/驼峰切词取首字母大写，冲突时追加第二字母。

## 卡片编号规则

格式：`FS-{YYYYMMDD}-{NNN}`（代码事实，[`FeatScheduleCardNoGenerator`](../../../../../busyming-snackingdom-devops/busyming-snackingdom-devops-service/src/main/java/io/busyming/innovation/snackingdom/devops/service/schedule/FeatScheduleCardNoGenerator.java)）

- `FS`：全局统一前缀，与模块解耦（历史使用 `MODULE_CODE` 作为前缀的方案已废止）
- `YYYYMMDD`：取 commit `authoredAt` 的业务日期（服务器时区 +08:00）
- `NNN`：同前缀内递增序号（**3 位零填充**，从 `001` 开始），由 `selectMaxCardNoForUpdate(prefix + '%')` 行锁 + CAS 保证并发安全

示例：

```
FS-20260507-001    (2026-05-07 全局第 1 个生成的卡片)
FS-20260507-002
FS-20260507-003
FS-20260508-001    (次日从 001 重新开始)
```

**实现要点**：
- 生成时使用 `SELECT ... FOR UPDATE` 行锁保证同前缀下的序号单调递增
- 编号一旦生成不可变，卡片删除后序号不回收
- **不再依赖 `feat_schedule_module_code` 字典**；commit 采集路径以 [`FeatScheduleCollectServiceImpl`](../../../../../busyming-snackingdom-devops/busyming-snackingdom-devops-service/src/main/java/io/busyming/innovation/snackingdom/devops/service/schedule/FeatScheduleCollectServiceImpl.java) 中的 Conventional Commit 解析为准

## 状态机

```
                    ┌─────────────────────┐
     新 commit ───► │  PENDING（待开发）  │ 白底灰框
                    └──────────┬──────────┘
                     领取开发    │  ▲
                   (devOwner=  ▼  │ 取消领取（清空 devOwner）
                    当前用户)     │
                    ┌─────────────────────┐
                    │ IN_PROGRESS（开发中）│ 紫底 + 左侧 3px #7E57C2
                    └──────────┬──────────┘
                               │ 标记完成（保留 devOwner）
                               ▼
                    ┌─────────────────────┐
                    │   DONE（开发完成）   │ 绿底 + 左侧 3px #52C41A
                    └──────────┬──────────┘
                               │  ▲
                    回退待开发 ▼  │ 回退开发中
                    ┌─────────────────────┐
                    │  PENDING / IN_PROGRESS
                    └──────────┬──────────┘
                     手动移入   │  ▲
                               ▼  │ 恢复为待开发
                    ┌─────────────────────┐
                    │ NON_FEATURE（非需求改动）│ 黄底 + 左侧 3px #FFA000
                    └─────────────────────┘
                    约束：清空排期/开发人/完成commit，不进Backup与月历

                    前端视图层计算（不改 DB）：
                    未完成 && end_date（单日=scheduled_date）< today  →  渲染为「延期」橙色
                    口径边界：仅当月视图（月/列表）与本周视图（周）计算延期；历史期不再标红
                    IN_PROGRESS 计入延期（v2.0 起与统计口径统一）；DONE / NON_FEATURE 排除
```

- DB 层有 `PENDING` / `IN_PROGRESS` / `DONE` / `NON_FEATURE` 四态，`DELAYED` 是**前端渲染态**（v2.0 起对 `PENDING` / `IN_PROGRESS` 均生效，按 `end_date` 早于今天判定，仅当月/本周口径）
- 领取开发：`PENDING → IN_PROGRESS` 时自动将 `dev_user_id` / `dev_user_name` / `dev_taken_at` 写为当前操作人，写入流水 `TAKEN`
- 取消领取：`IN_PROGRESS → PENDING` 时清空 `dev_*`，写入流水 `RELEASED`
- 标记完成：`PENDING / IN_PROGRESS → DONE` 完成 commit 选填（可关联一组跨仓 commit，也可不关联直接完成）；若来自 PENDING 且无 devOwner，则自动填入当前操作人；写入流水 `MARKED_DONE`
- 回退：`DONE → PENDING`（清空 `done_*` + `dev_*`） 或 `DONE → IN_PROGRESS`（清空 `done_*`，保留 `dev_*`），均需二次确认，写入流水 `REVERTED`
- **DONE 卡片在前端锁定**：`draggable=false`，不可拖拽改期也不可拖回 Backup；如需改期必须先将状态回退
- **NON_FEATURE 旁路态**：由 PM 在抽屉中点击「🔧 移入非需求改动」手动触发，任意状态（PENDING / IN_PROGRESS / DONE）均可移入；移入时清空 `scheduled_date`、`dev_*`、`done_*`；不占用 Backup 与月历格，不参与排期/领取/完成流程；抽屉内只允许编辑 title/content/owner，状态区域显示「🔧 非需求改动」提示；点击「↩ 恢复为待开发」可恢复为 PENDING；写入 `EDITED` 流水
- 删除卡片需二次确认，删除后源 commit 不会再次触发生成（`uk_source_commit` 保底）

## 交互规范

| 操作 | 规则 |
|------|------|
| 月份切换 | `<` / `>` 切换相邻月；中间年月标签点击弹下拉选年月；「今天」按钮回到本月并滚到当日那一周 |
| 日期精度 | 精确到天；跨月视图中上/下月灰显，不可接收拖拽 |
| 拖拽起点 | Backup 卡 / 日历格内卡，均可拖拽；**DONE 卡片锁定不可拖拽**（`draggable=false`，见状态机） |
| 拖拽目标 | 另一日期格（排期/改期）、Backup 区（取消排期）；**不允许排到比今天更早的日期**，违反时 alert 拒绝 |
| 拖拽视觉 | 拖起时源卡半透明 0.5，目标格 `outline:2px dashed var(--primary)` |
| 卡片点击 | 右侧抽屉弹出详情 / 编辑 |
- 四态颜色：待开发 #FFFFFF + 1px #E0E0E0；开发中 #F3E5F5 + 左侧 3px #7E57C2；开发完成 #E8F5E9 + 左侧 3px #52C41A；延期 #FFF3E0 + 左侧 3px #E65100
- 合并卡颜色：`is_merged=1` 浅蓝底 #E3F2FD + 左侧 3px #1565C0，标题前缀 🔗，右上角 `merge-badge` 显示子卡数 `N 项`；合并卡领取/完成时的次色仍按状态机着色（IN_PROGRESS 紫边 / DONE 绿边 优先级高于合并蓝边，但背景保留浅蓝以便识别）
- 发版日蓝色：背景 #E3F2FD + 右上角「发版」标签（10px #1565C0 + #BBDEFB 背景）
- 模块标签：卡片 c-module-row 行 sourceModule 蓝色小药丸（10px, #1565C0 + #E3F2FD 背景）
- 开发人标签：IN_PROGRESS / DONE 状态在 c-module-row 行右侧显示紫色「👤 devOwner」（10px, #5E35B1 + #F3E5F5 背景）
- hardwareManagement 字段：hardware-management 模块的卡片在抽屉中额外展示「硬件管理信息」字段
| 今日高亮 | 当日格 `border:2px solid var(--primary)` + 背景 `var(--primary-light)` |
| 卡片溢出 | 单格超过 3 张折叠为「+N 张」按钮，点击弹出该日全部卡片弹层 |
| 发版日 | 点击日历空白区域（非卡片/非 more-btn）切换发版日标记；发版日蓝色背景 + 右上角「发版」标签；再次点击取消 |
| 模块标签 | 卡片 c-meta 行显示 sourceModule 标签（蓝色小药丸），hardware-management 卡片额外显示 hardwareManagement 字段 |
| 只看自己（全局） | **v2.5 起位于筛选抽屉顶部快捷区（AcSwitch，即时生效）**；**默认关闭**；打开后按 **`card.ownerName === 当前用户 || card.devUserName === 当前用户`**（提交人或开发人，v2.0.2 起）过滤，**作用于月历格卡片 + Backup 卡片池 + +N 弹层**，即只显示与当前用户相关的卡片；过滤态下月历格中非本人卡片隐藏（格子保留，卡片不渲染），Backup 池中非本人卡片不显示；统计数字（待/完/延/未排）同步仅统计本人卡片；过滤结果全为空时月历空日格正常渲染、Backup 显示「没有由你提交的卡片 / 关闭『只看自己』可查看全部」；仍可切月查看历史月份本人相关的卡片记录；开关为前端临时 UI 状态（刷新后回到默认关闭），不落库；非需求改动弹层不受此过滤影响；「只看自己」作为快捷视图开关计入筛选数量徽标 1 项 |
| skills 仓库筛选（全局） | **v2.5 起位于筛选抽屉内（复选组，Draft/Apply）**，**默认全部选中**（等价不过滤）；首行「全部」勾选项 + 分隔线 + 各 skills 仓库（取卡片池采集源仓 `cardPoolSource=true`，无标记时回退全部研发仓）；「确定」应用后**同时作用于月历格卡片 + Backup 卡片池**（按卡片 `sourceRepo` 过滤）；筛选下沉到后端 `POST /cards/month` 的 `sourceRepos` 入参（全选/空选不传=全部展示，仅严格子集下发），保证 Backup 分页 total 与「只看自己」可叠加使用；为前端临时 UI 状态（刷新后回到默认全选），不落库 |
| 当月卡片搜索 | **v2.5 起搜索框上移头部直出**（占位符「搜索任务：标题 / 编号 / 提交人」，宽度按断点 220/190/160/140 收缩，不挤压核心操作）；由前端当场解析为关键字数组（分隔符：英文逗号 `,` / 中文逗号 `，` / 空格），**AND 关系模糊匹配** `card.title + card.content + card.cardNo + card.ownerName`（大小写不敏感）；命中的卡片黄框高亮 `.search-hit`，未命中的日历格卡片淡化 `.search-dim`（opacity:.25），Backup 未命中的卡片直接过滤；**仅搜当月**（月历视图所属 `viewMonth` + Backup 全部），切月后关键字保留；按 `Esc` 清空；搜索态为前端临时 UI，不落库；搜索词与筛选条件相互独立，清空筛选不清除搜索词 |
| Backup 提交时间 | Backup 卡片池中的卡片在 c-meta 下方增加一行 `c-time-row`：左侧 `🕒 YYYY-MM-DD HH:mm`（源 commit 提交时间，等于 `createdAt`，10.5px `--text-tertiary`），右侧相对时间小药丸（`刚刚 / X 分钟前 / X 小时前 / X 天前 / X 个月前 / X 年前`，默认蓝色 #1565C0 + #E3F2FD；超过 7 天未排期自动切换为橙色 #F57F17 + #FFFBE6 提示 `.stale`）；月历格卡片 / more 弹层 / 非需求改动弹层的卡片**不展示**该行，避免信息过载 |
| 领取开发 | 抽屉状态切换器点选「开发中」；来自 PENDING 时自动在保存后填入当前用户为 devOwner；切回「待开发」则清空 devOwner；卡片紫底并在右下显示开发人 |
| 完成锁定 | status=DONE 的卡片 `draggable=false` + `.locked` 样式，拖拽尝试在 dragstart / drop 均拒绝并 alert；如需改期请先状态回退 |
| 今日下限 | drop 时对比 `newDate < today_YYYY-MM-DD` 则拒绝，保证卡片只能排到今天或之后 |
| 非需求改动 | PM 在抽屉中点击「🔧 移入非需求改动」将卡片手动标为 NON_FEATURE（黄底 #FFFBE6 + 左侧 3px #FFA000），移入时清空排期/开发人/完成commit；不进入 Backup、不进月历；「更多」菜单「非需求改动」点击弹层展示全部 NON_FEATURE 卡片（菜单项附总数徽标）；抽屉内可点「↩ 恢复为待开发」恢复 |
| 完成校验 | status=DONE 时完成 commit 为选填；填写时必须通过「选仓库（双行：中文名 + repo 标识）→ 按需改分支（可输可选：候选 = 仓内活跃分支，默认仓配置 defaultBranch，手改按仓 localStorage 记忆）→ 搜索/浏览 commit → 点选一条」完成，不接受手写 hash；hash 与 url 由选中项自动回填 |
| 需求性质（v2.6） | 抽屉新增「需求性质」单选：`业务功能`（默认）/ `技术支持`（技术类、非功能性——文档补录、参数说明、性能优化、工具脚本、changelog 等）；创建/编辑时勾选，写 `EDITED` 流水；**存量卡不做系统批量补标**（2026-09-24 批复④），产品日常编辑顺手勾选；`技术支持` 卡功能排期侧状态流转不变（正常完成），仅作为实施排期聚合「生成即划入非实施区」的分流依据；月历/列表不新增性质标识（避免视觉噪音）；合并卡不自动继承子卡性质，按普通卡规则维护 |
| 业务对接人（v2.7 必填时点前移至排期） | 抽屉「业务对接人」输入框（≤64 字）产品手工维护，纯字段保存随时可改不拦截；**排期保存时必填**（2026-10-08 五决策定稿，取代 v2.6「保存/手动建卡时必填」——建卡时产品往往未定对接人，统一由排期卡点收口）：凡写入排期（拖拽排期 / 改期 / 右键快捷改期 / 抽屉保存排期，即 `scheduledDate` / `startDate`+`endDate` 由空到有或变更）时，该卡无 REQ 单关联（`requirement.linked_card_no` 同库反查无命中）且 `reqNature≠TECH` 且对接人为空 → 前端拦截 + 后端 400 兜底（BIZ.FS.017），拦截后引导打开抽屉补录对接人、补录后再排期；**豁免**：①REQ 关联卡（实施聚合侧取 REQ 提交人兜底；抽屉输入框可编辑，hint 展示「REQ 单提交人：X」，手改覆盖优先）②TECH 技术支持卡（无业务对接人概念）③NON_FEATURE 卡不参与排期天然豁免；**不触发**：移回待排期（清空排期）、纯字段保存、合并卡生成时继承子卡排期日（系统派生，后续改期正常校验）；commit 采集 Job 建卡不再校验（v2.6 建卡必填取消）；**存量不做批量回填**——存量已排期但无对接人的卡下次改期时被拦截、顺手补录自然收口；合并卡不自动继承，按普通卡规则维护 |
| 创建时间 | 卡片抽屉展示 `createdAt`（精确到分钟，等于源 commit 采集入库时间），不可修改 |
| 操作记录 | 抽屉底部时间线倒序展示 `feat_schedule_card_log`：操作人 · 操作时间 · 行为描述 |
| 卡片合并 | 「更多」菜单「合并卡片」（v2.5 起由筛选区移入，需编辑权限）切换多选态：卡片左上角出现复选框（月历格 / Backup / +N 日详情弹层内均可勾选），首张勾选后锁定模块（其它模块卡片与已是子卡、DONE/NON_FEATURE 的卡片禁用）；底部悬浮条提示「已选 {N} 张 · 模块 {xxx}」+ 「取消 / 确认合并」；点「确认合并」弹输入框填标题（≤30字）→ 调 `/cards/merge` 生成新合并卡；多选态 Esc / 点「取消」退出；同时 ≥ 2 张才允许确认，且必须同一 `sourceModule`；合并卡排期日默认取选中卡片中最早的非空排期日，全部未排期则进 Backup |
| 卡片拖拽合并 | 非多选态下，把一张卡片拖到另一张同模块卡片上（日历 / Backup / +N 弹层皆支持），目标卡蓝色虚线高亮；drop 后弹合并标题对话框 → 调 `/cards/merge`。校验规则同多选合并：跨模块 / DONE / NON_FEATURE / 子卡 toast 拒绝 |
| 合并卡明细 | 抽屉顶部 Tab `[详情][明细(N)][流水]`，仅合并卡显示「明细」Tab；明细列表按 `added_at` 倒序，每行展示子卡 `title / childCardNo / sourceModule / preMergeStatus / preMergeScheduledDate`；支持点击跳到子卡（子卡抽屉以只读方式呈现，提示「当前隶属合并卡 {mergeCardNo}」） |
| 解散合并卡 | 合并卡抽屉底部提供「解散合并」按钮，DONE 状态禁用；点击二次确认后调 `/cards/dissolve`：按 `pre_merge_*` 快照恢复子卡 `status / scheduled_date / dev_*`，若快照日期 < 今日则置 NULL 回 Backup；随后删除 merge_item 与父合并卡 |
| 合并卡状态扩散 | 合并卡上的 `/take /release /done /revert /patch(scheduled_date)` 操作在同一事务内同步写入所有子卡（不为子卡单独写流水，合并卡流水的 `op_detail` 附带「扩散至 N 张子卡」）；子卡单独打开抽屉时状态/排期/开发人均只读，提示「受父合并卡 {mergeCardNo} 控制」 |
| 信息架构（v2.5） | 页面为「研发排期工作台」：左侧**待排期池**（后端分页）+ 右侧**单行指挥栏**（时间导航 → 本月进度[≥1600 行内 / <1600「进度」浮层] → 搜索 → 视图切换 → 筛选(N) → 新建 → 更多）→ 视图区；筛选统一收右侧抽屉（Draft/Apply）；更多菜单 = 合并卡片 / 显示密度 / 非需求改动 / 代码仓配置；页面身份由 Portal 面包屑和页签承担，不重复显示大标题；任务详情抽屉从右侧滑出（480px） |
| 统计条（v2.5.2） | 待排期（Backup 总数）/ 待开发 / 开发中 / 已完成 / 延期（当月口径），全部真实数据；**≥1800 行内常驻于指挥栏中部，<1800 收「进度」浮层点击显示**（真实数据自然宽 ~450px，<1800 行内中心区不足必截断；浮层自管理、点击不关闭可连续操作）；可点击项 = 快捷状态筛选（再点取消），**状态浅底胶囊**（token x-1 状态底色 + 同色文字 + 999px 圆角，hover 升 x-2，选中 = x-2 底 + inset 状态色环 + ✓）；不可点「待排期」维持纯文本对照；数字保持全局概览，不随筛选缩减 |
| 待排期池收起（v2.5.1，v2.5.2 图标定稿） | 池头右侧收起图标（`menu-unfold-one`）→ 池整体收起为 36px slim 轨道（`menu-unfold` 展开图标 + 竖排「待排期」+ 计数徽标，整轨可点展开）；收起后日历获得横向空间；全分辨率可用，localStorage 记忆（key=`feature-schedule:pool-collapsed`）；≤1024 纵向堆叠布局下收起态为 40px 横条轨道 |
| 筛选（v2.5，Draft/Apply） | 头部仅保留「筛选(N)」入口（**N = 真正改变默认值的筛选条件数：仓库非全选/状态/负责人/模块各计 1，只看自己计 1；搜索词是独立状态不计入，「全部」默认值不计入**）；点击打开右侧筛选抽屉（AcDrawer 380px）：顶部「只看自己」AcSwitch 快捷区（即时生效）→ 已选条件 chips（单项可删）→ 状态/负责人/skills 仓库/模块四组复选；**四组筛选为 Draft/Apply 语义**：修改只写草稿，「确定」才应用刷新日历，「取消/关闭/Esc」放弃草稿，「重置」立即清空全部筛选并生效（抽屉保持打开，搜索词不受影响）；筛选全局生效——状态/负责人/模块对 Backup 池下沉后端 `backupStatuses/backupOwnerNames/backupModules`（分页 total 同口径；延期映射 DELAYED 哨兵值不命中池卡）；筛选/搜索激活且视图零命中时，日历区底部浮出轻量提示「当前筛选/搜索条件下暂无任务 [清空筛选][清除搜索]」 |
| 显示密度（v2.5） | 「更多 → 显示密度」两档，localStorage 记忆（key=`feature-schedule:density`），仅作用于月历格卡片：**标准** = 完整信息（标题/编号/提交人/模块/开发人，v2.0.5 等高方案不变）；**紧凑** = 隐藏编号与模块行，仅标题(两行恒高)+状态徽章+提交人，紧凑档内卡片依旧严格等高（96px→实测 74px 级，视格宽容器查询而定）；待排期池/周视图 chip/列表视图不受密度影响 |
| 自适应日历控制区（v2.5，取代 v2.4） | **所有 ≥1025px 宽度头部默认单行**（实证 1280~1920 自然内容宽 ≤970px，最紧 1280 余量 66px）：≥1600 本月进度行内、<1600 收「进度」浮层；搜索框宽度按断点收缩（220/190/160/140px）不挤压核心操作；低高度屏（≤900px）压缩工具栏纵向间距；≤1024 保底纵向堆叠（非目标桌面场景）；浮层均右对齐/左半屏触发器自动左对齐，不出视口；月视图每日 3+N 密度规则不变；**v2.4 的「≤1600 拆主控行+完整状态行」方案作废**（两行头部挤占日历高度的根因） |
| 列表视图（v2.0） | 视图切换：月 / 周 / 列表。列表列：任务/编号/模块/提交人/开发人/开始/截止（v2.1 拆分）/状态/创建时间；开始、创建时间可排序（空值置底）；点击行开抽屉；行内快捷操作（需标记完成权限）：待开发→领取 / 开发中→完成（不关联 commit，可抽屉补录）/ 已完成→回退（保留开发人），统一二次确认 |
| 新建卡片（v2.0） | Header「+ 新建卡片」（需编辑权限）：选仓 → 搜索/浏览 commit → 单选 → 确认建卡；调 `POST /cards` 幂等，`firstTime=false` 时提示并打开已有卡抽屉 |
| 周视图负责人行（v2.0.4） | 负责人列完整显示姓名（开发人优先，否则提交人）；行内「延 N」延期任务提醒（该负责人本周延期卡数，仅本周含今天时展示，真实数据）；卡片总数计数保留 |
| 卡片标题换行（v2.0.5） | 月历格与待排期池标题均最多两行、超出省略；月历格标题区恒占两行高（line-height 1.35×2）+ 模块行恒渲染占位（无模块/开发人的卡同高）→ **月历格内所有卡片高度一致**；+N 弹层详情上下文完整换行 |
| 右键快捷菜单（v2.0） | 月历格/待排期池/+N 弹层卡片右键：查看详情 / 改期到今天 / 改期到明天 / 移回待排期；可用性规则与拖拽一致（编辑权限 + 非 DONE + 非 NON_FEATURE + 非子卡），API 先行失败 Toast |
| 键盘快捷键（v2.0，v2.5 调整） | ← / → 切换上一期/下一期；T 回到今天/本周；Esc 分层关闭（右键菜单 → 各类确认框 → 弹层 → 月份选择器/进度浮层/更多菜单 → 筛选抽屉 → 卡片抽屉 → 合并多选态）；输入框聚焦时不响应，弹层打开时 ←/→/T 失效；keepAlive 后台 Tab 不响应 |
| 抽屉修改排期（v2.0，v2.5.3 控件规范） | 抽屉排期区：单日日期选择器（禁选今天之前）+「保存排期」+「移回待排期」；DONE 锁定提示先回退；v2.1 起新后端时切换为起止双日期（range）+ 时长「共 N 天」；v2.5.3 控件规范：日期选择器与按钮统一默认 medium（32px 同高，撤销 small 降档），按钮 rest=fill-2 与输入框同底、可保存（有改动）=主色浅底+主色文字、「移回待排期」= secondary danger 浅红底填充式（透明 text 红字下线） |
| 完成 commit 摘要折叠（v2.0） | DONE 卡抽屉「完成 commit」区：已有 commit 时默认收起为「已关联 N 个完成 commit · 展开选择器」，新标记完成时自动展开 |
| 视图记忆（v2.0，v2.5 扩展） | 当前视图（月/周/列表）记忆于 localStorage（key=`feature-schedule:view`），显示密度（标准/紧凑）记忆于 localStorage（key=`feature-schedule:density`），刷新后恢复；筛选类状态仍为前端临时态不落库 |
| 区间排期（v2.1） | 卡片支持 start_date ~ end_date 起止区间（双写联动见数据模型）；月/周视图区间卡在覆盖的每一天均显示（单日卡渲染与旧版一致）；月历格内卡片 3 张 + 当日 +N 的密度规则不变 |
| 批量移入非需求改动（v2.3） | 待排期池头部「批量」入口进入多选态：卡片显示复选框、点击卡片勾选、底部悬浮条「已选 N 张 · 取消 / 移入非需求」；二次确认后逐卡调 `move-to-non-feature`（Promise.allSettled 聚合，Toast 成败计数），适用于文档类卡片批量清理；需编辑权限，与合并多选态互斥，Esc 可退出 |
| 能力探测降级（v2.1） | 前端探测卡片 JSON 是否含 startDate 属性：含=新后端，解锁区间编辑（抽屉双日期/移动保时长）；不含=旧后端，全部区间逻辑退化为单日行为（读路径 startDate‖scheduledDate 回退），前后端可独立发布 |

## 接口规范

```
# ── 卡片列表（月视图） ──

GET /api/v1/schedule/cards?month=YYYY-MM&includeBackup=true
→ {
    month: "2026-05",
    cards: [
      { cardNo, title, content, ownerUserId, ownerName, status,
        scheduledDate, startDate, endDate,
        sourceRepo, sourceModule, sourceCommitHash,
        doneRepo, doneCommitHash, doneCommitUrl, doneAt,
        createdAt, updatedAt }
    ],
    backup: [ ... 同字段，scheduledDate 均为 null ... ]
  }
# 权限：MENU:SYSTEM:FEATURE_SCHEDULE
# v2.1 起 cards 检索口径为「区间重叠」（start_date<=月末 && end_date>=月初）；
#   start_date IS NULL 的 legacy 行回退按 scheduled_date 锚点匹配；
#   跨月区间卡在两月视图均返回

# ── 从 commit 生成卡片（由后端定时任务 / webhook 调用） ──

POST /api/v1/schedule/cards
{
  "sourceRepo": "snackingdom-mall-web",
  "sourceModule": "store-request",
  "sourceCommitHash": "a3f9c2d",
  "commitMessage": "fix(pick): 修复分拣任务超时不释放的问题",
  "authorUserId": 1001,
  "authorName": "张三",
  "authoredAt": "2026-05-07T09:12:33+08:00"
}
→ { cardNo: "SR-20260507-01" }
# 服务端按 sourceRepo + sourceCommitHash 幂等；title 默认截取 commitMessage 首行前 15 字（超出省略）

# ── 卡片排期/负责人/标题变更 ──

PATCH /api/v1/schedule/cards/{cardNo}
{ "scheduledDate": "2026-05-09" | null,
  "startDate": "2026-05-09",     # v2.1+ 可选；与 endDate 必须成对提供
  "endDate": "2026-05-11",       # v2.1+ 可选；不可早于 startDate
  "title": "…",
  "content": "…",
  "ownerUserId": 1002,
  "reqNature": "BIZ" | "TECH",   # v2.6+ 可选；需求性质（实施排期分流依据）
  "bizContactName": "…" }        # v2.6+ 可选；业务对接人（≤64 字）
# 权限：MENU:SYSTEM:FEATURE_SCHEDULE
# v2.1 双写联动：只传 scheduledDate → start=end=scheduledDate；
#   传 startDate+endDate → scheduled_date=start_date；清空排期 → 三字段同清
# 校验：startDate/endDate 不成对返回 FS_SCHEDULE_RANGE_INCOMPLETE；
#   endDate < startDate 返回 FS_SCHEDULE_RANGE_INVALID
# v2.7 对接人校验（时点自 v2.6「保存/建卡时」前移至「排期写入时」）：本次请求写入排期
#   （scheduledDate/startDate 由空到有或变更；清空排期不触发）且该卡无 REQ 单关联
#   （requirement.linked_card_no 反查无命中）且 reqNature≠TECH 且 bizContactName 为空
#   → 400（BIZ.FS.017）；REQ 关联 / TECH / NON_FEATURE 豁免；纯字段保存与采集 Job 建卡不校验

# ── 领取开发 / 取消领取 ──

POST /api/v1/schedule/cards/{cardNo}/take
# 无 body；服务端将 dev_user_id / dev_user_name / dev_taken_at 写为当前登录人，status 从 PENDING → IN_PROGRESS
# 仅允许在 status=PENDING 时调用，否则返回 409；写流水 op_type=TAKEN

POST /api/v1/schedule/cards/{cardNo}/release
# 无 body；清空 dev_* 字段，status 从 IN_PROGRESS → PENDING
# 仅允许在 status=IN_PROGRESS 时调用，否则返回 409；写流水 op_type=RELEASED

# ── 切换为开发完成（回执关联） ──

POST /api/v1/schedule/cards/{cardNo}/done
{ "doneRepo": "snackingdom-mall-web",
  "doneCommitHash": "b7e1d44" }
# 只接收 repo + hash，服务端校验 hash 是否真实存于该仓库，并拼接 doneCommitUrl 落库；完成 commit 选填，body 为空时仅切换状态
# 成功后 status=DONE、done_at=NOW；若从 PENDING 直接完成且 dev_user_id IS NULL，则一并回填当前用户为开发人；写入流水 op_type=MARKED_DONE
# 仅允许在 status=PENDING / IN_PROGRESS 时调用，DONE 重复调用视为「更换完成 commit」并写 op_type=EDITED

# ── 回退为待开发 ──

POST /api/v1/schedule/cards/{cardNo}/revert
{ "target": "PENDING" | "IN_PROGRESS" }
# target=PENDING：清空 done_* + dev_*；target=IN_PROGRESS：仅清空 done_*，保留 dev_*
# 写流水 op_type=REVERTED
# 仅允许在 status=DONE 时调用

# ── 移入非需求改动 ──

POST /api/v1/schedule/cards/{cardNo}/move-to-non-feature
# 无 body；清空 scheduled_date、dev_*、done_*，status 改为 NON_FEATURE
# 仅允许在 status=PENDING / IN_PROGRESS / DONE 时调用，NON_FEATURE 重复调用返回 409
# 写流水 op_type=EDITED，op_detail="从 {oldStatus} 移入非需求改动"

# ── 恢复为待开发（从非需求改动） ──

POST /api/v1/schedule/cards/{cardNo}/restore-from-non-feature
# 无 body；status 从 NON_FEATURE 改为 PENDING
# 仅允许在 status=NON_FEATURE 时调用，否则返回 409
# 写流水 op_type=EDITED，op_detail="从非需求改动恢复为待开发"

# ── 删除 ──

DELETE /api/v1/schedule/cards/{cardNo}
# 软删；写入流水 op_type=DELETED
# 若目标为合并卡：同事务删除 merge_item 与全部子卡（子卡同为软删）；若目标为子卡（parent_merge_card_no 非空）：返回 409 FS_CHILD_LOCKED，提示「请先解散父合并卡」

# ── 卡片合并 ──

POST /api/v1/schedule/cards/merge
{ "title": "批量修复分拣相关",
  "childCardNos": ["SR-20260507-01", "SR-20260507-02", "SR-20260508-03"] }
→ { cardNo: "FS-20260514-001" }
# 校验：childCardNos.size >= 2、同一 sourceModule、均为 PENDING/IN_PROGRESS、非他人合并卡的子卡
# 行为：按 FS-{YYYYMMDD}-{NNN} 规则生成合并卡 cardNo，source_repo="_merge"、source_commit_hash="MERGE:{cardNo}"、
#   is_merged=1、owner=当前用户、scheduled_date = 子卡中最早的非空排期日，全部未排期则 NULL 回 Backup
# 子卡快照入 feat_schedule_card_merge_item，子卡 parent_merge_card_no = 合并卡 cardNo
# 若某子卡本身是合并卡：UPDATE merge_item SET merge_card_no=新 WHERE merge_card_no=旧；然后删除旧合并卡主记录（保留原快照）
# 写流水 op_type=MERGED 到父合并卡，op_detail="合并 {N} 张：{child1}, {child2}, ..."
# 错误码：FS_MERGE_AT_LEAST_TWO / FS_MERGE_SAME_MODULE_REQUIRED / FS_MERGE_STATUS_NOT_ALLOW / FS_MERGE_ALREADY_CHILD

POST /api/v1/schedule/cards/merge-items/list
{ "cardNo": "FS-20260514-001" }
→ { list: [{ childCardNo, title, sourceModule, preMergeStatus,
              preMergeScheduledDate, preMergeDevUserName, addedAt }, ...] }
# 仅 is_merged=1 的卡片可调；按 added_at 倒序返回子卡明细（仅 deleted_flag=0 的子卡）

POST /api/v1/schedule/cards/dissolve
{ "cardNo": "FS-20260514-001" }
→ {}
# 仅 is_merged=1 的卡片可调；DONE 状态禁止解散（返回 409 FS_MERGE_DONE_CANNOT_DISSOLVE）
# 行为：按 merge_item.pre_merge_* 快照恢复子卡 status/scheduled_date/dev_*；若 preMergeScheduledDate < today 则置 NULL 回 Backup
# 子卡 parent_merge_card_no 置 NULL；删除 merge_item 行与合并卡主记录
# 写流水 op_type=DISSOLVED 到合并卡（保留到被软删前的最后状态供审计回看）

# ── 研发仓与 commit 列表（用于「完成 commit 选择器」） ──

GET /api/v1/schedule/repos
→ { list: [{ repo: "snackingdom-mall-web", name: "零食王国主干 Web", defaultBranch: "main" }, ...] }

GET /api/v1/schedule/repos/{repo}/commits?branch=&q=&limit=50
# q = hash 片段 / message 关键词 / author
→ { list: [{ hash, shortHash, author, authoredAt, message, url }] }
# 由后端代理云效 Codeup API（或 webhook 回流缓存），不直连 Codeup

# ── 卡片操作流水 ──

GET /api/v1/schedule/cards/{cardNo}/logs
→ { list: [{ opType, opDetail, operatorId, operatorName, operatedAt }] }  // 倒序

# ── 目录 → 编号前缀映射 ──

GET /api/v1/schedule/module-codes
→ { list: [{ modulePath, moduleCode, moduleName }, ...] }

# ── 发版日标记 ──

POST /api/v1/schedule/release-days
{ "releaseDate": "2026-05-15" }
# 标记某日为发版日，幂等

DELETE /api/v1/schedule/release-days/{releaseDate}
# 取消发版日标记

GET /api/v1/schedule/release-days?month=YYYY-MM
→ { list: ["2026-05-15", "2026-05-30"] }
# 返回指定月份的所有发版日

# ── 排期约束（前端 + 后端均需守住） ──
# 1. scheduled_date 不可小于当前服务器日期（+08:00），违反时 PATCH 返回 400
#    （现状：后端历史未实现该 400 校验，仅前端拦截；v2.1 维持现状不追加行为变更）
# 2. status=DONE 时 scheduled_date 不可更改（锁定），违反时 PATCH 返回 409
# 3. status=NON_FEATURE 时 scheduled_date 必须为 NULL，PATCH 不接受 scheduled_date 修改（返回 409）
#    status=NON_FEATURE 的卡片不可通过 /take /release /done /revert 切换状态（均返回 409）
#    NON_FEATURE 态由 PM 在前端手动触发「移入非需求改动」，后端提供 PATCH + POST /move-to-non-feature 接口
#    恢复为待开发通过 POST /restore-from-non-feature 接口，将 status 改为 PENDING
# 4. parent_merge_card_no 非空（子卡）时，/take /release /done /revert /patch 均返回 409 FS_CHILD_LOCKED
#    合并卡上的上述接口在同一事务内扩散写入所有子卡；合并卡 status=DONE 后禁止 /cards/dissolve
# 5. 月视图 GET /schedule/cards 与 Backup 返回均默认过滤 parent_merge_card_no IS NULL，保证子卡对 UI 不可见
# 6. v2.1 区间约束：startDate/endDate 必须成对提供（否则 FS_SCHEDULE_RANGE_INCOMPLETE）；
#    endDate 不可早于 startDate（否则 FS_SCHEDULE_RANGE_INVALID）；
#    双写联动：只传 scheduledDate → start=end 联动，传 startDate+endDate → scheduled_date=startDate；
#    清空排期（clearScheduledDate）/ 移入非需求改动 → scheduled_date/start_date/end_date 三字段同清 NULL
# 7. v2.6 联动回写：实施排期「移入非实施需求」会在其事务内将来源功能排期卡 req_nature 置 TECH
#    （仅当前为 BIZ 的更新）；本侧写 EDITED 流水，operator=实施操作人，
#    op_detail=「实施排期移入非实施联动：需求性质置为技术支持」；
#    实施卡「恢复为待实施」不回写（性质跟随功能粒度）
# 8. v2.7 对接人前置：PATCH 写入排期（排期/改期，清空排期除外）时该卡无 REQ 单关联
#    （requirement.linked_card_no 反查无命中）且 reqNature≠TECH 且 bizContactName 为空
#    → 400（BIZ.FS.017，文案「排期前请先填写业务对接人」）；
#    REQ 关联 / TECH / NON_FEATURE / 纯字段保存 / 采集 Job 建卡均不触发；
#    存量无对接人卡不批量回填，下次排期写入时被拦截补录、自然收口

# ── 通用约束 ──
# 所有 /schedule/* 接口后端二次校验 MENU:SYSTEM:FEATURE_SCHEDULE 权限
# 任何会将状态 / 排期 / 字段 / 存在性改动的接口成功后，服务端需向 feat_schedule_card_log 追加一条
```

## 埋点对齐

在 `sys_function_catalog` 登记一条（对齐 [usage-analytics](../usage-analytics/SKILL.md) 规范）：

| route_path | function_code | function_name | parent_perm_code |
|------------|---------------|---------------|------------------|
| `/system/feature-schedule` | `SYSTEM.FEATURE_SCHEDULE` | 系统功能排期 | `MENU:SYSTEM:FEATURE_SCHEDULE` |

## 前端页面

原型 `asset/feature-schedule.html`，设计要点：

- 与 [snackingdom-portal](../../../设置/系统/snackingdom-portal/SKILL.md) 配色体系一致：主色 `#E60013`、辅色 `#FFDE00`、完成绿 `#52C41A`、延期橙 `#E65100`
- 纯 HTML + 原生 JS，不引入任何外部库；使用 HTML5 Drag & Drop API
- 月历格 `min-height:120px`，卡片 `padding:6px 8px`、`border-radius:4px`、`font-size:12px`
- 最小宽度 1200px，左 Backup 固定 280px，日历自适应剩余宽度
- 响应式不做移动端适配，PM 工具仅桌面使用
- 遵循 front Token 与组件风格

## Tips

- 卡片编号只对 PM 内部生效，不出现在 commit message；研发仓提交时仍按团队约定前缀
- 同一 commit 不会重复生成卡片（`uk_source_commit` 保底），如需重跑先删卡片再触发
- 合并卡由 PM 主动创建，非 commit 触发；`source_commit_hash="MERGE:{cardNo}"` 合成值用于绕开 `uk_source_commit` 唯一键，避免与真实 commit 冲突
- 嵌套合并采用**扁平化策略**：新合并卡直接继承所有原始子卡，不保留中间层合并卡；原合并卡被删除，其原始 `pre_merge_*` 快照保留，保证解散时能回到最初独立态
- 合并卡解散时若子卡快照日期已早于今日，统一置 NULL 回 Backup，避免违反「scheduled_date 不得早于今日」约束；PM 需重新拖拽排期
- 合并卡 DONE 后禁止解散（保护完成回执语义）；如需解散请先 `/revert` 回退合并卡状态
- 子卡的所有状态/排期/开发人字段变更统一通过合并卡扩散，不为子卡单写流水，审计以合并卡流水为主；子卡历史流水（合并前的独立状态）仍保留在 `feat_schedule_card_log`
- 卡片标题默认截取策略：commit message 首行 → 去除 `feat/fix/chore(scope):` 前缀 → 截前 15 字符 → 允许 PM 在抽屉中手改
- **源仓路径前缀过滤**：在 Nacos `codeup.repos[]` 中可给每个源仓配置 `pathPrefixWhitelist[]` / `pathPrefixBlacklist[]`（两个数组可同时用；为空时全量采集）。默认规则：若 `pathPrefixWhitelist` 非空，则 commit 的 changed paths 必须至少命中一条白名单前缀；若全部变更都落在 `pathPrefixBlacklist` 下则跳过。用于实现「feature-schedule 仅接收零食王国目录的提交，过滤 `.agents/` 等非业务目录」。过滤触发时 Job 以 `[fs-collect]` 前缀写 INFO 日志汇总 `scanned / kept / skipped`，详见 [reference/job-schedule.md](reference/job-schedule.md) §5
- Backup 池默认按 `created_at` 倒序（最新 commit 排最上）
- 「只看自己」开关为前端临时 UI 状态（刷新页面后回到默认关闭），不落库；该过滤器作用于月历 + Backup + +N 弹层，方便快速浏览自己在历史各月**提交或开发**的卡片及其认领/完成状态（v2.0.2 起 ownerName ∪ devUserName 双口径）；如需与用户偏好持久化请走 `sys_user_preference` 另行扩展
- 「当月卡片搜索」框状态同样是前端临时 UI（不落库 / 不加 URL 参数），刷新或关闭 Tab 后关键字重置；匹配源仅为前端已载入的 `cards[].title` 与 `cards[].content`，不再发起后端请求
- Backup 卡片上的相对时间基于 `createdAt`（= 源 commit 采集入库时间）与浏览器当前时间差计算，页面保持打开 24h 以上建议刷新以获得准确相对值
- 延期判定仅在当月视图计算，切换到历史月份不再二次标红（历史月已过期语义无意义）
- ~~一张卡片在时间上只能排到一天，跨多日开发请拆成多张或在 `content` 中备注~~（v2.1 起支持 start_date ~ end_date 区间排期，跨多日开发可直接排区间；抽屉双日期可编辑起止）
- 删除与回退均保留审计：`updated_by` + `updated_at` 记录最后操作人
- 权限最小授予：仅将 `MENU:SYSTEM:FEATURE_SCHEDULE` 授予 PM / 研发管理员，普通运营无此菜单

## Changelog

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | — | 初始版本 |
| v1.1 | 2026-07-20 | 「只看自己」从 Backup 独占升级为全局过滤器（月历+Backup+弹层），支持跨月查看自己作为提交人的卡片历史及对应开发认领状态 |
| v1.2 | 2026-08-20 | 新增「skills 仓库筛选」下拉（位于工具栏「代码仓」右侧，多选、默认全选）：按卡片 `sourceRepo` 同时过滤月历与 Backup 卡片池；选项取卡片池采集源仓（`cardPoolSource=true`），筛选下沉到 `POST /cards/month` 的 `sourceRepos` 入参，与「只看自己」可叠加 |
| v1.3 | 2026-09-10 | 标记完成不再强制关联完成 commit：`/cards/mark-done` 入参 `doneCommits` 改为选填（空则仅切换状态并写「未关联完成 commit」流水），前端抽屉移除「完成态至少 1 个 commit」拦截与必填星号 |
| v1.4 | 2026-09-10 | 合并体验优化：①多选态下月历「+N 张」日详情弹层内卡片支持勾选合并（与月历格 / Backup 行为一致）；②合并卡排期日规则由「子卡全部同值才继承，否则回 Backup」改为「取子卡中最早的非空排期日，全部未排期才进 Backup」 |
| v2.0 | 2026-09-20 | 升级为「研发排期工作台」：①信息架构重构——Backup 卡片池更名「待排期」、Header 收口（+新建卡片主按钮 / 更多菜单）、轻量统计条（待排期/待开发/开发中/已完成/延期/今日到期，可点击快捷筛选）；②筛选增强——状态/负责人/模块多选（仅作用于视图区）；③新增列表视图（排序 + 行内快捷操作 领取/完成/回退）；④人员冲突提示（周视图徽标 + 卡片 ⚠ + 抽屉提示可跳转，只提示不拦截）；⑤右键快捷菜单（查看/改期今天/改期明天/移回待排期）；⑥键盘快捷键（←/→ 切期、T 今天、Esc 分层关闭）；⑦抽屉分组重构 + 修改排期 + DONE 卡 commit 摘要折叠；⑧视图模式记忆（localStorage）；⑨**延期口径修正：仅当月/本周标延期（历史期不再标红），IN_PROGRESS 与统计口径统一计入** |
| v2.0.1 | 2026-09-20 | 当日评审后微调：①「今日到期」特性整体下线（卡片已坐在「今天」格内，位置语义已覆盖，徽章/统计条项/抽屉提示/周 chip 橙点/过滤开关全部移除）；②抽屉内人员冲突提醒模块移除（周视图 ⚠ 徽标与卡片 ⚠ 轻量标记保留）；③卡片状态视觉定稿——token 最浅档状态底色（开发中浅蓝/完成浅绿/延期浅橙/非需求浅黄，待开发白底）+ 状态徽章同色去底文字（回应一线「无底色难扫状态」反馈）；④**筛选全局生效**——状态/负责人/模块多选从「仅视图区」升级为同时作用于待排期池，Backup 池筛选下沉后端（`MonthReq` + `backupStatuses/backupOwnerNames/backupModules`，分页 total 同口径） |
| v2.0.2 | 2026-09-20 | 「只看自己」口径修正：由「仅提交人（ownerName）」放宽为「**提交人或开发人**（ownerName ∪ devUserName）」——原口径会把「领取开发别人 commit」的卡片全部过滤（开发视角下月历/统计全空），修正后与后端 backupOnlyOwnerName（owner∪dev）及周视图行分组（dev 优先）口径一致 |
| v2.0.3 | 2026-09-20 | ①**甘特视图下线**（全单日卡场景下与月/周视图价值重叠；区间排期能力保留：抽屉双日期、移动保时长、区间重叠检索，GanttView/ScheduleBar 组件与拖边交互移除）；②**待排期池新增批量移入非需求改动**：池头「批量」入口多选 → 底部悬浮条确认 → 逐卡 `move-to-non-feature` 聚合（allSettled 成败计数 Toast），应对文档类卡片批量清理场景，不依赖后端发布 |
| v2.0.4 | 2026-09-21 | ①月历格卡片标题换行与待排期池同款（最多三行、超出省略，不再单行截断）；②**人员冲突标记全线下线**（月历卡片 ⚠、周视图 ⚠N 徽标、conflictIndex 计算全部移除；周视图负责人行改为「延 N」延期任务提醒，仅本周含今天时展示）；③周视图负责人列加宽并完整显示姓名；④多选态复选框内联进标题文本流（换行回卡片左缘）、选中态改极浅主题红底（去红描边）、批量点选防误触开抽屉 |
| v2.0.5 | 2026-09-21 | 月历格卡片等高密度定稿：①标题由最多三行收紧为**最多两行**、超出省略；②标题区恒占两行高（min-height 2.7em = line-height 1.35×2），一行标题的卡与两行同高；③模块行恒渲染占位（无 sourceModule 且无可见开发人的卡此前整行缺失导致矮一截），行高对齐有模块时的 1.6em+边框 → **月历格内所有卡片高度严格一致**（170px 列宽实测五种信息组合全 96px）；④**待排期池标题同步收紧为最多两行**（原三行），池卡为纵向列表不要求等高故不加 min-height；+N 弹层完整换行不变 |
| v2.1 | 2026-09-20 | 区间排期：①`feat_schedule_card` 新增 `start_date/end_date`（存量回填 start=end=scheduled_date；scheduled_date 保留为月视图锚点，双写联动）；②月视图检索升级为区间重叠（跨月区间卡两月可见，legacy NULL 行回退锚点）；③前端能力探测降级（无 startDate 字段=单日行为，前后端可独立发布）；④新增甘特视图（**数据驱动显隐：仅存在跨日卡时出现**；任务列×整月日期轴，列宽自适应，条按宽度分级展示）；⑤拖边调起止（甘特内，左边缘≥今天≤end、右边缘≥start）与整条移动保时长；⑥抽屉起止双日期编辑（新后端时）；⑦冲突检测升级为区间重叠判定；⑧延期口径切 `end_date`；⑨列表视图「排期日」拆分为「开始/截止」两列 |
| v2.1.1 | 2026-09-21 | 完成 commit 检索修复：①**前端请求字段 keyword → `q` 对齐 api-spec 契约**（此前 keyword 永不生效，选择器恒返回仓内最近 50 条不过滤）；②后端 `listCommits` 补齐 hash 前缀搜索——云效 `search` 仅匹配提交信息，`q` 命中 6~40 位十六进制时先走 `GET /commits/{sha}` 精确解析置顶合并去重，解析失败退化最近 100 条本地 hash 前缀过滤兜底 |
| v2.1.2 | 2026-09-21 | 手动建卡 500 修复：`POST /cards` 不传 `sourceModule` 时 `source_module`（NOT NULL 无默认值列）插入失败被兜底为「数据库操作失败」——后端 `createFromCommit` 对空 `sourceModule` 按采集 job 同一规则从 message 头部解析（兜底 MISC），`hardwareManagement` 缺省且 module=hardware-management 时自动提取 `[hw:xxx]`；前端「新建卡片」弹窗链路（不传 sourceModule）此前必现 500 |
| v2.1.3 | 2026-09-22 | 可点感知强化第一稿（**当日上午评审被用户否决，web 代码与本文档同步回退，方案作废**，仅留档防重复提案）：白底+描边 chip 与白底描边触发器的「描边盒子」路线 |
| v2.2 | 2026-09-22 | 可点感知强化定稿（纯视觉层，无交互逻辑/接口变更；方向经 3 套预览点选「A 状态浅底胶囊」确认，取代被否的 v2.1.3 描边路线）：①统计条 4 个可点击状态项 = 状态浅底胶囊（token x-1 状态底色 + 同色文字 + 999px 圆角，与月历卡片同套状态语言），hover 升 x-2，选中 = x-2 + inset 状态色环 + ✓；不可点「待排期」维持纯文本对照；②筛选触发器填充式（静止 fill-3、hover fill-4、展开/有值 = 主色浅底 + 主色文字、caret 随展开旋转 180°）——fill-2 原底在白卡上对比不足是「看不出可点」的根因；③「只看自己」同步胶囊填充语言（fill-2 → 开启主色浅底） |
| v2.4 | 2026-09-23 | 自适应日历控制区定稿：宽屏保持单行；≤1600px 拆为主控行与「本月进度」完整状态行，彻底解决小屏状态裁切与功能混排。搜索/四维筛选/只看自己/合并按需在第三行展开且不遮挡内容。1512×868 默认态排期主体从页面 y=204px 开始、可视高度 644px、状态无溢出；宽屏 1920×1080 仍维持单行，排期主体 y=173px。 |
| v2.5 | 2026-09-23 | **顶部信息架构重构（取代 v2.4 的双层方案）**：①**所有 ≥1025px 宽度头部默认单行**（时间导航 → 本月进度 → 搜索 → 视图 → 筛选(N) → 新建 → 更多），日历主体上移至页内 y≈74px（原 ≤1600 两行头部是挤占日历高度根因）；②**筛选统一收右侧抽屉**（AcDrawer 380px，只看自己 AcSwitch 快捷区 + 已选条件 chips + 状态/负责人/skills 仓库/模块四组复选），四组筛选改 **Draft/Apply**（确定生效/取消放弃/重置立即清空），筛选计数口径剔除搜索词；③**搜索上移头部直出**（占位符改「搜索任务：标题 / 编号 / 提交人」）；④**合并卡片移入「更多」菜单**（不再与筛选条件混排），更多菜单新增**显示密度（标准/紧凑，localStorage 记忆）**——紧凑档月历格隐藏编号与模块行、保留标题两行恒高+徽章+提交人，档内卡片依旧等高；⑤筛选/搜索零命中时日历区底部浮出轻量提示（清空筛选/清除搜索相互独立）；⑥头部浮层（更多菜单）改自管理 month-picker 同款模式（实证 AcDropdown 在 keepAlive+teleport 链路二次打开后事件间歇失联），触发器位于视口左半时面板自动左对齐防出屏；⑦Esc 分层与 ←/→/T 失效域同步接入筛选抽屉与浮层。交互语义变化备忘：四维筛选由「即时生效」改「Draft/Apply」（统计条快捷筛选仍即时）；已选筛选 chips 不上头部（防换行，以「筛选(N)」计数呈现） |
| v2.5.1 | 2026-09-23 | 用户复核迭代（基于真实大小屏截图三点反馈）：①**待排期池新增收起/展开**（池头图标收起为 36px slim 轨道〔展开图标 + 竖排标题 + 计数，整轨可点〕，localStorage 记忆 `feature-schedule:pool-collapsed`，≤1024 为 40px 横条轨道）；②**搜索框加宽**（260/240/220/200/180px 按断点，原最窄 140px）；③**≤1366 视图切换短标签**（月/周/列表）；④本月进度暂改全分辨率行内（次日 v2.5.2 修正） |
| v2.5.2 | 2026-09-23 | 用户二次复核迭代（真实数据暴露行内截断）：①**本月进度断点定为 ≥1800 行内 / <1800「进度」浮层**——v2.5.1「全分辨率行内」在 1512 笔记本实证截断（已完成 490 等三位数使统计自然宽 ~450px；强制宽度实测中心区：1680→356px、1760→436px、1800→476px、1920→596px，1800 为真实数据安全线）；浮层复用 v2.5 自管理 month-picker 模式，统计项仍可点击快捷筛选、重复点取消；②**池收起/展开图标定稿 `menu-unfold`（轨道展开）/ `menu-unfold-one`（池头收起）**；③v2.5.1 的 <1600 统计去「待排期」与胶囊收紧、池宽收窄全部回退（断点改 1800 后空间不再紧张）。**验证纪律沉淀**：mock 数据数字位数必须贴近真实（mock 已完成 3 没测出截断，真实 490 三位数即破），宽度类验收用生产量级数据 |
| v2.5.3 | 2026-09-23 | 抽屉排期行控件规范落地（v2.3 同行控件定稿向抽屉场景延伸，纯视觉层）：①日期选择器与同行按钮撤销 `size="small"` 降档（原输入框 24px/按钮 28px 互相不同高），统一默认 medium 32px 同高；②「保存排期」rest=fill-2 与输入框同底，有改动可保存时=主色浅底+主色文字（has-value 激活态，沿用筛选触发器同套语言）；③「移回待排期」由透明 text 红字改 secondary danger（浅红底+红字填充式，与状态浅底语言一致）；④range 选择器宽度 200→228px、行间距 space-3→space-2——medium 档双日期文本实测 ~185px；⑤**抽屉加宽 480→520px**——480 档内容宽 440（纵向滚动条占位后 ~425）装不下三控件 438px，用户复核时「移回待排期」被挤换行；520 档内容宽 480（滚动条后 ~465），余量 ~27px 保证恒单行，宽度类验收教训同 v2.5.2：预算必须留真实余量、含滚动条占位 |
| v2.6 | 2026-10-08 | REQ-20260924-IMPL 联动（实施排期 v1.1 配套，2026-09-24 批复定稿，待研发）：①`feat_schedule_card` 扩 `req_nature`（BIZ 业务功能默认 / TECH 技术支持）+ `biz_contact_name` 两列，抽屉新增「需求性质」单选与「业务对接人」输入框；②私下需求对接人必填——保存/手动建卡时无 REQ 单关联（`requirement.linked_card_no` 反查无命中）且对接人为空则拦截（前端 + 后端 BIZ.FS.017），有 REQ 关联与采集 Job 建卡豁免（批复①）；③存量卡不做系统批量补标，产品编辑顺手勾选（批复④）；④实施排期「移入非实施」联动回写 `req_nature=TECH` 并写 EDITED 流水（批复⑤） |
| v2.7 | 2026-10-08 | 业务对接人必填卡点前移至排期（邓佳华五决策定稿，待研发）：①校验时点自 v2.6「保存/手动建卡时」前移至「排期写入时」——拖拽排期 / 改期 / 抽屉保存排期时，无 REQ 单关联且 `reqNature≠TECH` 且对接人为空则拦截（前端 + 后端 BIZ.FS.017 同码改义，文案「排期前请先填写业务对接人」），拦截后引导抽屉补录、补录后再排期；②建卡与纯字段保存不再必填（建卡时往往未定对接人，排期卡点统一收口，REQ 关联 / Job 建卡漏网卡全部收口）；③REQ 关联卡豁免且抽屉输入框解禁可编辑（预填 REQ 提交人 hint，手改覆盖优先）；④TECH 技术支持卡与 NON_FEATURE 卡豁免，移回待排期 / 合并卡继承排期日（系统派生）不触发；⑤存量不批量回填，存量无对接人卡下次改期被拦、顺手补录自然收口 |
| v2.7.1 | 2026-10-10 | 完成 commit 选择器两项修复（卡片抽屉 + 新建卡片弹窗同步）：①**新增分支输入**——选择器原只按仓配置 `defaultBranch`（master）查云效 commits，而日常提交落在迭代集成分支（如 feature/20260806_0806），master 仅发版合并时前进，候选列表停更在发版点（实证 web 仓停在 10-08 e536a635）；修复后默认取仓 defaultBranch、可手改任意分支，blur/Enter 确认后 trim、按仓 localStorage 记忆（key=`fs-commit-picker-branch:{repo}`，迭代换分支只改一次）并带 `branch` 重查，空 = 仓默认分支；hash 精确搜索走 `GET /commits/{sha}` 不带分支，本就不受限；②**仓库下拉双行展示**——原单行「中文名（repo）」在窄抽屉 ellipsis 截断不可读，改第 1 行完整中文名 + 第 2 行 repo 标识（mono 灰字），:deep 放开 AcSelect 选项 36px 固定行高；回归测试 `__tests__/commit-picker-branch.spec.ts`（分支解析/缓存优先/手改重查/双行结构 7 例） |
| v2.7.2 | 2026-10-10 | 分支由纯输入升级为**可输可选**（卡片抽屉 + 新建卡片弹窗同步）：①新增 `POST /repos/branches`——后端代理云效 `GET .../branches?sort=updated_desc`（翻页 ≤3×100），**过滤云效 CI 一次性 release 分支**（`release/yyyyMMdd-{毫秒}_release_{n}_{n}`，实测其按活跃倒序淹没 feature/master），仓默认分支置顶，封顶 50；②前端分支框 AcInput 换 **AcAutoComplete**：聚焦全量候选（自定义 filterOption——组件默认按当前值过滤会把候选收敛成只剩当前分支），输入后子串收窄，下拉点选立即定型重查、自由输入 debounce 500ms 定型，均 trim + 按仓 localStorage 记忆（同 v2.7.1 key）；③**老后端无此端点时静默降级为纯输入**（候选拉取失败记空不刷屏，可继续手输分支，前后端可独立发布）；④分支 debounce/搜索计时器随卸载清理 + trim 二次变更置静默，消除跨组件残留重查；回归测试 9 例 + 后端过滤器单测 2 例 |
