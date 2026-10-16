# 实施排期 · 数据模型与生成任务

> 所属模块：[../SKILL.md](../SKILL.md)。本文件承载 DDL、编号规则与生成 Job（15 分钟增量 + 夜间兜底 + 手动拉取）的技术细节。

## impl_schedule_card（实施卡片主表）

```sql
CREATE TABLE impl_schedule_card (
    id                BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    card_no           VARCHAR(32)  NOT NULL                COMMENT '业务编号：IS-{YYYYMMDD}-{NNN}（3 位序号）',
    title             VARCHAR(64)  NOT NULL                COMMENT '标题（≤ 30 字）',
    content           VARCHAR(1024) NOT NULL               COMMENT '变更待测试项（根据需求与代码变更生成，保留多行）',
    func_key          VARCHAR(128) NOT NULL                COMMENT '功能标识（聚合分组键）：生产实证形态 DIR:{模块} · {子模块} · {功能}；存量含 FS 卡号直引/空值兜底',
    func_name         VARCHAR(64)  NOT NULL                COMMENT '功能名（冗余，用于卡片功能标签）',
    source_feat_card_nos VARCHAR(512) NOT NULL             COMMENT '来源功能排期卡号集合（逗号分隔），用于回溯',
    biz_contact_name  VARCHAR(64)                          COMMENT 'v1.1+ 业务对接人（生成时快照）：功能排期卡手工值优先 > REQ 单提交人（submit_by→real_name / external_submitter_name）；NULL 显示「—」',
    non_impl_source   VARCHAR(16)                          COMMENT 'v1.1+ 非实施来源：AUTO_TECH=技术类生成即划入 / MANUAL=人工移入；仅 status=NON_IMPL 时有值，恢复待实施清空',
    status            VARCHAR(16)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / IN_PROGRESS / DONE / NON_IMPL',
    scheduled_date    DATE                                 COMMENT '排期日期；NULL = 在 Backup 池',
    taker_user_id     BIGINT                               COMMENT '领取人 sys_user.id（IN_PROGRESS / DONE 必填）',
    taker_name        VARCHAR(64)                          COMMENT '领取人姓名（冗余）',
    taken_at          DATETIME                             COMMENT '实施开始日期 = 领取时间',
    done_at           DATETIME                             COMMENT '实施结束日期 = 点击完成时间',
    gen_biz_date      DATE         NOT NULL                COMMENT '生成业务日期（编号 YYYYMMDD 段来源，+08:00）',
    deleted_flag      TINYINT      NOT NULL DEFAULT 0      COMMENT '软删标记',
    created_by        BIGINT       NOT NULL                COMMENT '创建人（自动任务 = 系统账号 0；手动拉取 = 当前操作人）',
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建日期 = 生成时间（任务 / 手动拉取）',
    updated_by        BIGINT,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_card_no (card_no),
    UNIQUE KEY uk_func_day (func_key, gen_biz_date),
    KEY idx_schedule_date (scheduled_date),
    KEY idx_taker (taker_user_id),
    KEY idx_status (status)
) COMMENT='实施排期卡片，每个功能每天最多生成一张';
```

- `uk_func_day`：幂等保底 —— 同功能同一天只生成一张；删除后（软删）当天不再生成
- `taken_at` / `done_at` 即页面字段「实施开始日期 / 实施结束日期」，均系统写入、页面只读

## impl_schedule_card_log（操作记录流水）

```sql
CREATE TABLE impl_schedule_card_log (
    id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    card_no      VARCHAR(32)  NOT NULL                COMMENT '关联 impl_schedule_card.card_no',
    op_type      VARCHAR(24)  NOT NULL                COMMENT 'CREATED / SCHEDULED / UNSCHEDULED / RESCHEDULED / EDITED / TAKEN / RELEASED / MARKED_DONE / REVERTED / DELETED / MOVED_TO_NON_IMPL / RESTORED',
    op_detail    VARCHAR(512)                         COMMENT '详情文本，如「排期到 2026-09-15」「李四 领取实施」',
    operator_id  BIGINT       NOT NULL                COMMENT 'sys_user.id；0 = 系统（夜间任务）',
    operator_name VARCHAR(64) NOT NULL                COMMENT '操作人姓名（冗余）',
    operated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    PRIMARY KEY (id),
    KEY idx_card_time (card_no, operated_at)
) COMMENT='实施卡片操作流水，按 card_no 追加，不可修改';
```

> 仅追加不删除；页面以倒序时间线呈现。每次状态变更、排期变更、字段编辑、删除均写入一条。

## 卡片编号规则

格式：`IS-{YYYYMMDD}-{NNN}`

- `IS`：实施排期（Implementation Schedule）固定前缀
- `YYYYMMDD`：取生成业务日期 `gen_biz_date`（服务器时区 +08:00）
- `NNN`：同前缀内递增序号（3 位零填充，从 001 开始），`SELECT ... FOR UPDATE` 行锁保证并发安全
- 编号一旦生成不可变，卡片删除后序号不回收

## 生成 Job（impl-schedule-collect，v1.3 双档调度 + 手动拉取通道）

### 增量档（v1.3 主通道）

| 项 | 约定 |
|----|------|
| 触发 | 每 15 分钟一次（xx:00 / 15 / 30 / 45） |
| 扫描窗口 | `feat_schedule_card`：`done_at ∈ (last_success_at − 5min, now]` 且 `deleted_flag = 0` 的卡片；重叠 5 分钟兜底 |
| 水位 | `last_success_at` 持久化，仅整轮成功后推进（研发选型：配置参数表 / Redis——研发待确认 T1）；首次运行或水位缺失回退扫「当天 `done_at`」 |
| 幂等 | `uk_func_day` 兜底，窗口重叠部分冲突跳过并记 INFO 日志 |
| 日志 | `[impl-collect]` 前缀，汇总 `scanned / grouped / created / skipped`，另记窗口起止与水位推进值 |

### 夜间全量兜底档（23:40 保留）

| 项 | 约定 |
|----|------|
| 触发 | 每天 23:40（错开功能排期采集与业务高峰） |
| 数据源 | `feat_schedule_card`：当天 `done_at ∈ [当天 00:00, 当天 24:00)` 且 `deleted_flag = 0` 的卡片 |
| 职责 | 专收增量档漏网（任务停机 / 异常中断期间的 DONE 卡）；`uk_func_day` 幂等，已生成的跳过 |

### 手动拉取通道（v1.3 新增）

| 项 | 约定 |
|----|------|
| 入口 | `GET /api/v1/impl-schedule/manual-candidates`（候选查询）+ `POST /api/v1/impl-schedule/cards/manual-collect`（生成） |
| 候选范围 | `feat_schedule_card` 中 `status=DONE` + `deleted_flag=0` + `req_nature=BIZ` + 未被任何实施卡 `source_feat_card_nos` 引用；`done_at` 倒序分页；TECH 卡不进入候选 |
| 当日幂等 | 候选行 `func_key` 当日已有实施卡（`uk_func_day` 命中）→ 候选响应 `blocked=true` + `blockedByCardNo`，前端置灰禁选；提交时二次校验（期间被生成任务拉走 → `failed` 返回原因与已存在卡号） |
| 生成字段 | `gen_biz_date` = 当天（+08:00），编号 `IS-{YYYYMMDD}-{NNN}` 同序列；内容沿用自动生成逻辑（需求描述 + commit message 汇总） |
| 流水 | `CREATED`（operator = 当前操作人，detail 附「手动拉取」+ 来源卡号清单） |

### 三通道共用约定

| 项 | 约定 |
|----|------|
| 分组键 | `func_key`：生产实证形态 `DIR:{模块} · {子模块} · {功能}`（模块筛选/标识按首段实时派生，不落列）；存量 FS 卡号直引/空值归「未归类」 |
| 聚合行为 | 每组生成一张实施卡片：`func_name` = 功能/需求名；`source_feat_card_nos` = 组内卡号集合；`title` = 功能名概括（≤30 字）；`content` = 变更待测试项（需求描述 + 各完成卡 commit message 汇总生成） |
| 技术类分流（v1.1） | 组内功能排期卡 `req_nature=TECH` → 生成即 `status=NON_IMPL` + `non_impl_source=AUTO_TECH`，不进 Backup/月历/状态计数、不触发未领取提醒；流水 `CREATED` detail 附「技术类需求，自动划入非实施区」（仅任务通道；手动通道不提供 TECH 卡候选） |
| 对接人取值（v1.1） | 生成时写 `biz_contact_name` 快照：①组内卡 `biz_contact_name` 手工值优先；②`requirement.linked_card_no` 同库反查关联 REQ 单——内部单 `submit_by`→`sys_user.real_name`、外部单 `external_submitter_name`，取组内首个命中；③均无则 NULL |
| 幂等 | 插入时依赖 `uk_func_day`；冲突跳过并记 INFO 日志 |
| 流水 | 每张新卡写一条 `CREATED`（任务通道 operator = 系统账号 0），detail 含来源卡号清单 |

## 状态字段写入矩阵

| 动作 | status | taker_* | taken_at | done_at | 流水 |
|------|--------|---------|----------|---------|------|
| 任务生成（业务卡） | PENDING | — | — | — | CREATED |
| 任务生成（技术类卡，v1.1） | NON_IMPL（non_impl_source=AUTO_TECH） | — | — | — | CREATED（detail 附「技术类需求，自动划入非实施区」） |
| 手动拉取生成（v1.3） | PENDING | — | — | — | CREATED（operator=当前操作人，detail 附「手动拉取」+ 来源卡号清单） |
| 领取实施 | → IN_PROGRESS | 当前用户 | NOW | — | TAKEN |
| 取消领取 | → PENDING | NULL | NULL | — | RELEASED |
| 点击完成（自实施中） | → DONE | 保留 | 保留 | NOW | MARKED_DONE |
| 点击完成（自待实施） | → DONE | 回填当前用户 | NOW | NOW | MARKED_DONE |
| 回退实施中 | → IN_PROGRESS | 保留 | 保留 | NULL | REVERTED |
| 回退待实施 | → PENDING | NULL | NULL | NULL | REVERTED |
| 移入非实施需求 | → NON_IMPL（non_impl_source=MANUAL） | NULL | NULL | NULL | MOVED_TO_NON_IMPL（v1.1 起同事务回写来源功能排期卡 req_nature=TECH，detail 附「已回写功能排期卡需求性质」） |
| 恢复为待实施 | → PENDING（清 non_impl_source，不回写 req_nature） | — | — | — | RESTORED |
| 删除 | （软删） | — | — | — | DELETED |

> v1.1 扩列：`biz_contact_name`（业务对接人快照，生成时写入后不再变）、`non_impl_source`（AUTO_TECH / MANUAL，仅 NON_IMPL 态有值）——两列均为 `ALTER TABLE impl_schedule_card ADD COLUMN` 增量 DDL，存量行 NULL 兜底（对接人显示「—」、非实施存量卡来源按 `CREATED` 流水时为 NON_IMPL 判 AUTO_TECH、否则 MANUAL 展示派生）。
