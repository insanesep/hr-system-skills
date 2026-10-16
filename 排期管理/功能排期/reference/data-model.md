---
name: feature-schedule-data-model
description: 系统功能排期模块 - 数据库表结构、字段说明、索引设计与初始化数据
---

# 系统功能排期 - 数据模型

## 1. 数据源与库

- **数据源**：`snackingdom`（主库，对应 IDEA 数据库 `ocss-dev` / schema `mall_dev`）
- **事务管理器**：`snackingdomTransactionManager`
- **Mapper.xml 目录**：`busyming-snackingdom-domain/src/main/resources/mapper/snackingdom/`

## 2. 表一览

| 表名                        | 功能            | 预估量级      |
|---------------------------|---------------|-----------|
| `feat_schedule_card`      | 排期卡片主表        | 月增量 ~500  |
| `feat_schedule_card_log`  | 卡片操作流水        | 月增量 ~3000 |
| `feat_schedule_release_day` | 发版日标记     | 月 0~5     |
| `feat_schedule_card_merge_item` | 合并卡 ↔ 子卡关系与快照（v1.8+） | 月增量 ~100 |

> ~~`feat_schedule_module_code`~~ 已下线：模块识别改回 commit message 头部解析（Conventional Commit），cardNo 与模块解耦统一前缀 `FS-`。详见 [job-schedule.md §4](job-schedule.md#41-sourcemodule-识别规则commit-message-解析)，表结构与初始化已从 `feature_schedule.sql`（单体仓历史脚本） 主脚本中移除。

## 3. 表 DDL

### 3.1 `feat_schedule_card`

```sql
CREATE TABLE `feat_schedule_card` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `card_no`             VARCHAR(32)  NOT NULL                COMMENT '业务编号：FS-{YYYYMMDD}-{NNN}（v1.7+ 与模块解耦统一前缀 FS、3 位序号）',
  `title`               VARCHAR(64)  NOT NULL                COMMENT '标题（≤ 30 字，对 commit 的概括；v1.6+ 从 15 升至 30）',
  `content`             VARCHAR(1024) NOT NULL               COMMENT 'commit message 原文，保留多行',
  `owner_user_id`       BIGINT       NOT NULL DEFAULT -1     COMMENT '负责人 sys_user.id；-1=未匹配（默认 commit author）',
  `owner_name`          VARCHAR(64)  NOT NULL                COMMENT '负责人姓名（冗余，默认 commit author）',
  `dev_user_id`         BIGINT                                COMMENT '开发人 sys_user.id（v1.6+ IN_PROGRESS 领取写入；DONE 保留；PENDING/NON_FEATURE 为 NULL）',
  `dev_user_name`       VARCHAR(64)                           COMMENT '开发人姓名（冗余，与 dev_user_id 同步写入）',
  `dev_taken_at`        DATETIME                              COMMENT '领取开发时间',
  `status`              VARCHAR(16)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/IN_PROGRESS/DONE/NON_FEATURE；延期态由前端计算',
  `scheduled_date`      DATE                                 COMMENT '排期日期（月视图索引锚点，区间排期下 = start_date）；NULL=待排期池',
  `start_date`          DATE                                 COMMENT 'v2.1+ 排期开始日期；NULL=未排期；与 end_date 成对',
  `end_date`            DATE                                 COMMENT 'v2.1+ 排期结束日期（含）；NULL=未排期；应用层约束 end_date >= start_date',
  `source_repo`         VARCHAR(128) NOT NULL                COMMENT '源 commit 所在仓名',
  `source_module`       VARCHAR(128) NOT NULL                COMMENT '源 commit 所在模块目录',
  `source_commit_hash`  VARCHAR(64)  NOT NULL                COMMENT '源 commit hash',
  `hardware_management` VARCHAR(256)                         COMMENT '硬件管理信息（仅 hardware-management 模块）',
  `req_nature`          VARCHAR(16)  NOT NULL DEFAULT 'BIZ'  COMMENT 'v2.6+ 需求性质：BIZ=业务功能 / TECH=技术支持（实施排期聚合分流依据；亦可由实施排期「移入非实施」回写置 TECH）',
  `biz_contact_name`    VARCHAR(64)                          COMMENT 'v2.6+ 业务对接人：产品手工维护（REQ 关联卡预填提交人可改，手改优先）；v2.7 起排期保存时必填（REQ 关联/TECH/NON_FEATURE 豁免）；实施排期聚合时快照到实施卡',
  `is_merged`           TINYINT      NOT NULL DEFAULT 0      COMMENT 'v1.8+ 合并卡标记：1=合并卡（聚合卡）0=普通卡/子卡',
  `parent_merge_card_no` VARCHAR(32)                          COMMENT 'v1.8+ 子卡反向指针；非空=当前属于某合并卡；合并卡自身 / 独立卡为 NULL',
  `done_repo`           VARCHAR(128)                         COMMENT '完成 commit 所在仓（兼容字段：取 done_commits 首项）',
  `done_commit_hash`    VARCHAR(64)                          COMMENT '完成 commit hash（兼容字段：取 done_commits 首项）',
  `done_commit_url`     VARCHAR(512)                         COMMENT '完成 commit 可点击链接（兼容字段：取 done_commits 首项）',
  `done_commits`        JSON                                 COMMENT '完成 commit 列表 [{repo,commitHash,commitUrl,shortHash,message,authorName,authoredAt}]（多仓库升级后的唯一写入字段）',
  `done_at`             DATETIME                             COMMENT '状态切换至 DONE 的时间',
  `created_by`          INT          NOT NULL DEFAULT -1     COMMENT '创建人；-1=系统（commit 采集）',
  `updated_by`          INT          NOT NULL DEFAULT -1     COMMENT '更新人',
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_flag`        TINYINT      NOT NULL DEFAULT 0      COMMENT '逻辑删除：0=正常 1=删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_card_no` (`card_no`),
  UNIQUE KEY `uk_source_commit` (`source_repo`, `source_commit_hash`, `deleted_flag`),
  KEY `idx_schedule_date` (`scheduled_date`),
  KEY `idx_start_end_date` (`start_date`, `end_date`),
  KEY `idx_owner` (`owner_user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_parent_merge` (`parent_merge_card_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统功能排期卡片';
```

**关键点**：
- `uk_source_commit` 联合 `deleted_flag`：删除后源 commit 可重新采集（可选）；若需严格禁止重入，去掉 `deleted_flag` 列即可
- `owner_user_id` 默认 -1：commit author 在系统中未匹配到 sys_user 时容错
- 不用数据库层 `DELAYED` 枚举值：延期由前端基于 `end_date < today && status IN (PENDING, IN_PROGRESS)` 实时渲染（v2.0 起 IN_PROGRESS 计入；v2.1 起按 end_date 判定、仅当月/本周口径，历史期不标红）
- **v2.1 区间排期双写联动**：`scheduled_date` 保留为月视图索引锚点，`start_date/end_date` 与其双写同步——旧链路只写 `scheduledDate` 时后端联动 `start=end=scheduledDate`；新链路写 `startDate+endDate` 时后端联动 `scheduled_date=start_date`；清空排期/移入非需求改动时三字段同清 NULL。存量数据已回填 `start=end=scheduled_date`（DDL 见 busyming-snackingdom-devops `docs/20260920/lihao/feat-schedule-date-range/`，DMS 拆单：先 01_ddl.sql 后 02_backfill.sql）
- `status = IN_PROGRESS` 为领取态：`POST /cards/take` 进入，`POST /cards/release` 退出；进入时同步写入 `dev_user_id / dev_user_name / dev_taken_at`，退出时同事务置 NULL（`LambdaUpdateWrapper.set(field, null)`）
- `status = DONE` 路径保留 `dev_*`；PENDING 跳过领取直接 markDone 时，后端自动填当前操作人为 `dev_*`
- `status = DONE → PENDING` 回退同事务清空 `dev_*`；`DONE → IN_PROGRESS` 回退保留 `dev_*` 仅清 `done_*`
- `status = NON_FEATURE` 卡片由 PM 在抽屉手动切入；进入该态时 `scheduled_date / dev_user_id / dev_user_name / dev_taken_at / done_repo / done_commit_hash / done_commit_url / done_commits / done_at` 全部同事务置 NULL；月视图 / Backup 查询使用 `.ne(status, NON_FEATURE)` 过滤
- `is_merged = 1` 的合并卡：`source_repo` 固定写入 `_merge`，`source_commit_hash` 写入 `MERGE:{cardNo}` 合成值，避开 `uk_source_commit` 冲突；`sourceModule` 继承所有子卡共同模块（合并前置校验强制一致）
- **v2.6 扩列**（REQ-20260924-IMPL 配套）：`req_nature` 存量行回填 `BIZ`（批复④不做批量预标 TECH，产品编辑时手工勾选）；`biz_contact_name` 存量行 NULL。**v2.7 校验时点前移**（2026-10-08 五决策）：排期写入（`scheduled_date`/`start_date` 由空到有或变更，清空排期不触发）时校验——无 REQ 单关联（`requirement.linked_card_no` 同库反查无命中）且 `req_nature≠TECH` 且 `biz_contact_name` 为空 → 拦截（BIZ.FS.017，文案「排期前请先填写业务对接人」）；REQ 关联 / TECH / NON_FEATURE 豁免，纯字段保存不触发；v2.6 的保存/手动建卡必填取消，commit 采集 Job 建卡不校验；存量行不做批量回填，下次排期写入时被拦截补录、自然收口。实施排期「移入非实施需求」事务内回写 `req_nature=TECH`（仅当前 BIZ 的更新）并写 `EDITED` 流水（operator=实施操作人）；实施卡恢复待实施不回写
- `parent_merge_card_no` 非空的子卡：不出现在默认月视图 / Backup 查询（`.isNull(parentMergeCardNo)` 过滤），仅在合并卡抽屉「明细 Tab」中可见；子卡自身的 `status / scheduled_date / dev_*` 与合并卡保持一致（由服务端扩散写入），独立状态快照保存在 `feat_schedule_card_merge_item`

### 3.2 `feat_schedule_card_merge_item`（v1.8+ 合并关系 + 快照）

```sql
CREATE TABLE `feat_schedule_card_merge_item` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `merge_card_no`            VARCHAR(32)  NOT NULL                COMMENT '合并卡 card_no',
  `child_card_no`            VARCHAR(32)  NOT NULL                COMMENT '子卡 card_no',
  `pre_merge_status`         VARCHAR(16)  NOT NULL                COMMENT '进入合并前的 status 快照（PENDING / IN_PROGRESS）',
  `pre_merge_scheduled_date` DATE                                 COMMENT '进入合并前的 scheduled_date 快照；NULL=合并前位于 Backup',
  `pre_merge_dev_user_id`    BIGINT                                COMMENT '进入合并前的开发人 ID 快照',
  `pre_merge_dev_user_name`  VARCHAR(64)                           COMMENT '进入合并前的开发人姓名快照',
  `pre_merge_dev_taken_at`   DATETIME                              COMMENT '进入合并前的领取时间快照',
  `added_at`                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '挂入合并卡时间',
  `added_by`                 BIGINT       NOT NULL DEFAULT -1     COMMENT '挂入操作人 sys_user.id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_child` (`child_card_no`),
  KEY `idx_merge` (`merge_card_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合并卡↔子卡关系与快照（仅当 feat_schedule_card.parent_merge_card_no 非空时存在对应行）';
```

**约束**：
- `uk_child` 保证一张子卡同时只属于一个合并卡；嵌套合并扁平化时，先删除旧 `merge_item` 行再 INSERT 新行，不会触发唯一键冲突
- 无 `deleted_flag`：解散合并时直接 DELETE 行（快照读取后销毁），不保留历史；审计由 `feat_schedule_card_log` 承载
- 不继承 `BaseEntity`（同 `feat_schedule_card_log` 轻量审计）

### 3.3 `feat_schedule_card_log`

```sql
CREATE TABLE `feat_schedule_card_log` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `card_no`       VARCHAR(32)  NOT NULL                COMMENT '关联 feat_schedule_card.card_no',
  `op_type`       VARCHAR(24)  NOT NULL                COMMENT 'CREATED/SCHEDULED/UNSCHEDULED/RESCHEDULED/EDITED/TAKEN/RELEASED/MARKED_DONE/REVERTED/DELETED',
  `op_detail`     VARCHAR(512)                         COMMENT '详情文本',
  `operator_id`   BIGINT       NOT NULL DEFAULT -1     COMMENT 'sys_user.id；-1=系统（commit 采集触发）',
  `operator_name` VARCHAR(64)  NOT NULL                COMMENT '操作人姓名（冗余）',
  `operated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`id`),
  KEY `idx_card_time` (`card_no`, `operated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排期卡片操作流水（仅追加）';
```

**约束**：
- 仅 INSERT，**永不 UPDATE / DELETE**
- 不继承 `BaseEntity`：审计语义已由本表自身承载（无需 createdBy/updatedBy/deletedFlag）

### 3.4 `feat_schedule_release_day`

```sql
CREATE TABLE `feat_schedule_release_day` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `release_date` DATE         NOT NULL                COMMENT '发版日期',
  `created_by`   INT          NOT NULL DEFAULT -1     COMMENT '标记人 sys_user.id',
  `updated_by`   INT          NOT NULL DEFAULT -1     COMMENT '更新人',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_flag` TINYINT      NOT NULL DEFAULT 0      COMMENT '逻辑删除：0=正常 1=删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_release_date` (`release_date`, `deleted_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发版日标记';
```

### 3.5 ~~`feat_schedule_module_code`~~（已下线）

> v1.7 起该字典表与所有相关 DO/Mapper/VO/API 已删除，表结构与初始化已从 `feature_schedule.sql`（单体仓历史脚本） 主脚本中移除（不再保留 upgrade 过程脚本，重装环境直接跳过该表；已部署环境手动执行 `DROP TABLE IF EXISTS feat_schedule_module_code;` 即可）。
>
> **Skill 偏差说明**：`SKILL.md` 中 `feat_schedule_module_code` 表结构、`/api/v1/schedule/module-codes` 接口、`{MODULE_CODE}-{YYYYMMDD}-{NN}` 编号格式均与当前实现不一致，请产品在下次修订时同步移除。

## 4. 初始化数据

### 4.1 `sys_permission` 菜单登记

```sql
INSERT INTO sys_permission (perm_code, perm_name, perm_type, parent_id, sort_order, client_type, icon, path)
VALUES ('MENU:SYSTEM:FEATURE_SCHEDULE', '系统功能排期', 'MENU',
        (SELECT id FROM (SELECT id FROM sys_permission WHERE perm_code='MENU:SYSTEM') t),
        90, 'PC', '📅', '/feature-schedule');
```

### 4.3 `sys_function_catalog` 埋点登记（usage-analytics 要求）

```sql
INSERT INTO sys_function_catalog (route_path, function_code, function_name, parent_perm_code)
VALUES ('/feature-schedule', 'SYSTEM.FEATURE_SCHEDULE', '系统功能排期', 'MENU:SYSTEM:FEATURE_SCHEDULE');
```

## 5. 字段映射（DO → VO / API）

| DO 字段 (snake)     | Java DO 字段 (camel)   | API/VO 字段 (camel)   | 类型             |
|-------------------|--------------------|--------------------|----------------|
| card_no           | cardNo             | cardNo             | String         |
| title             | title              | title              | String         |
| content           | content            | content            | String         |
| owner_user_id     | ownerUserId        | ownerUserId        | Long           |
| owner_name        | ownerName          | ownerName          | String         |
| dev_user_id       | devUserId          | devUserId          | Long           |
| dev_user_name     | devUserName        | devUserName        | String         |
| dev_taken_at      | devTakenAt         | devTakenAt         | LocalDateTime  |
| status            | status             | status             | String         |
| scheduled_date    | scheduledDate      | scheduledDate      | LocalDate      |
| source_repo       | sourceRepo         | sourceRepo         | String         |
| source_module     | sourceModule       | sourceModule       | String         |
| source_commit_hash| sourceCommitHash   | sourceCommitHash   | String         |
| hardware_management | hardwareManagement | hardwareManagement | String       |
| is_merged         | isMerged           | isMerged           | Boolean（0/1）     |
| parent_merge_card_no | parentMergeCardNo | parentMergeCardNo | String         |
| done_repo         | doneRepo           | doneRepo           | String         |
| done_commit_hash  | doneCommitHash     | doneCommitHash     | String         |
| done_commit_url   | doneCommitUrl      | doneCommitUrl      | String         |
| done_commits      | doneCommits        | doneCommits        | List<DoneCommit> (JSON，MyBatis-Plus JacksonTypeHandler，DO/VO 同名类型不同需手动转换) |
| done_at           | doneAt             | doneAt             | LocalDateTime  |
| created_at        | createdAt          | createdAt          | LocalDateTime  |
| updated_at        | updatedAt          | updatedAt          | LocalDateTime  |

## 6. 查询效率策略

- **月视图（v2.1 起区间重叠）**：`(start_date <= month-last AND end_date >= month-first) OR (start_date IS NULL AND scheduled_date BETWEEN month-first AND month-last)`，叠加 `deleted_flag=0 AND parent_merge_card_no IS NULL`，命中 `idx_start_end_date`；跨月区间卡在两月视图均可见；`start_date IS NULL` 的 legacy 行（双写后端发布前由旧后端产生）回退锚点匹配
- **Backup（待排期池）**：单查 `scheduled_date IS NULL AND deleted_flag=0 AND parent_merge_card_no IS NULL`，按 `created_at DESC` 排序、后端分页（默认 20/页，上限 100）；v2.0.1 起支持 `backupStatuses / backupOwnerNames / backupModules` 三维筛选下沉（`IN` 拼接，保证分页 total 与筛选同口径），另支持 `backupOnlyOwnerName`（`owner_name OR dev_user_name`，「只看自己」）与 `sourceRepos`（skills 仓库）过滤，均可叠加
- **合并卡明细**：`SELECT child_card_no FROM feat_schedule_card_merge_item WHERE merge_card_no=?`，再 JOIN `feat_schedule_card` 命中 `uk_card_no`，典型合并 ≤10 张
- **CardNo 生成并发**：采用"悲观行锁 + 子查询"或"Redis Incr" 两选一，详见 [implementation-steps.md](implementation-steps.md#cardno-生成器)

## 7. 合并卡数据模型要点（v1.8+）

- 合并卡本身在主表，`is_merged=1`、`parent_merge_card_no=NULL`、`scheduled_date/status/dev_*/done_*` 与普通卡同语义；PM 可对其拖拽改期、领取、完成、回退
- 子卡在主表，`is_merged=0`、`parent_merge_card_no={合并卡 card_no}`；`status/scheduled_date/dev_*/done_*` 由服务端从合并卡事务扩散写入，查询时与合并卡完全一致
- `feat_schedule_card_merge_item` 仅用于「挂载关系 + 进入合并前字段快照」，解散合并时按快照恢复子卡
- 不支持多级嵌套：若本次合并包含已合并卡 `M_old`，扁平化处理 —— 读取 `M_old.merge_item`，把子卡全部改挂到新合并卡 `M_new`，保留原始 `pre_merge_*` 快照不变，`M_old` 软删（`deleted_flag=1`）且 `merge_item` 的 `merge_card_no` 被覆盖为 `M_new`
