# 黑灯工厂工单 — 数据模型

核心表 `blacklight_ticket`(devops 库)。字段分四组:业务幂等键 / 内容快照 / 流程状态 / 审计。

## 1. 表结构

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | bigint unsigned PRI auto_increment | 主键 |
| `ticket_no` | varchar(32) NOT NULL | 工单号 `BL-yyyyMMdd-xxxxx`(日序列,展示用) |
| `source` | varchar(16) NOT NULL | 来源:`blacklight` / `bigsqlfix` |
| `biz_key` | varchar(192) NOT NULL | 业务键:blacklight=指纹;bigsqlfix=`svc\|mapper全限定名` |
| `parent_id` | bigint NOT NULL DEFAULT 0 | 关闭后复发新单指向上一张单;0=无 |
| `level` | varchar(4) NOT NULL | `P1` / `P2`(只建 P1/P2) |
| `category` | varchar(16) NOT NULL | `FIXED_REVIEW` / `PENDING_JUDGE` / `BIZ_CONFIRM` |
| `svc` | varchar(32) NOT NULL | 微服务名 |
| `title` | varchar(128) NOT NULL | 一句话问题 |
| `summary` | varchar(512) NOT NULL DEFAULT '' | 一句话根因/现状 |
| `suggestion` | varchar(512) NOT NULL DEFAULT '' | 建议(人话结论) |
| `commit_hash` | varchar(16) NOT NULL DEFAULT '' | FIXED_REVIEW 的 commit 短哈希 |
| `occur_count` | bigint NOT NULL DEFAULT 0 | 累计出现次数(upsert 累加) |
| `occur_rounds` | int NOT NULL DEFAULT 1 | 命中轮次数(upsert +1) |
| `evidence` | json | 证据链:{traceIds[], stack, sqlSample, trend}(滚动保留最近 3 轮) |
| `first_seen_at` | datetime NOT NULL | 首次命中时间 |
| `last_seen_at` | datetime NOT NULL | 最近命中时间 |
| `report_path` | varchar(256) NOT NULL DEFAULT '' | 当轮落盘报告路径 |
| `status` | varchar(16) NOT NULL DEFAULT 'OPEN' | `OPEN` / `CLAIMED` / `REVIEW` / `REOPENED` / `RESOLVED` / `IGNORED` |
| `owner_user_id` | bigint NOT NULL DEFAULT 0 | 负责人 sys_user.id;0=待认领 |
| `owner_name` | varchar(64) NOT NULL DEFAULT '' | 冗余姓名 |
| `owner_wecom_user_id` | varchar(128) NOT NULL DEFAULT '' | 提醒通道地址 |
| `claimed_by` | varchar(64) NOT NULL DEFAULT '' | 认领人姓名 |
| `claimed_at` | datetime NULL | 认领时间 |
| `resolved_by` | varchar(64) NOT NULL DEFAULT '' | 处理人 |
| `resolved_at` | datetime NULL | 关闭时间 |
| `resolve_remark` | varchar(500) NOT NULL DEFAULT '' | 处理/忽略/打回备注(取最近一次) |
| `review_by` | varchar(64) NOT NULL DEFAULT '' | 复核人 |
| `review_at` | datetime NULL | 复核时间 |
| `sla_deadline` | datetime NULL | 闭环 SLA 截止(建单时按 level 计算) |
| `created_by` | int NOT NULL DEFAULT -1 | -1=agent 建单 |
| `created_at` | datetime NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| `updated_by` | int NOT NULL DEFAULT -1 | |
| `updated_at` | datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |
| `deleted_flag` | tinyint NOT NULL DEFAULT 0 | 逻辑删除 |

## 2. 索引

| 索引 | 字段 | 说明 |
|---|---|---|
| `uk_source_biz` | `source + biz_key` | **唯一键**,upsert 幂等锚点(biz_key 192 字符内,utf8mb4 安全) |
| `idx_status_level` | `status + level` | 列表默认筛选 |
| `idx_owner` | `owner_user_id + status` | 「我的工单」视图 |
| `idx_created` | `created_at` | 时间范围查询/清理 Job |
| `idx_ticket_no` | `ticket_no` | 展示检索 |

## 3. upsert 字段白名单

`INSERT ... ON DUPLICATE KEY UPDATE` 时:

- **可更新**(快照类):`occur_count`(= occur_count + VALUES)、`occur_rounds`(= occur_rounds + 1)、`last_seen_at`、`evidence`、`summary`、`suggestion`、`trend`、`report_path`、`updated_at`
- **禁更新**(流程类):`status`、owner/claimer/resolver/review 全组、`sla_deadline`、`first_seen_at`、`ticket_no`

## 4. 口径备注

- `occur_rounds` 是复发率的统计基础;`parent_id` 链 ≥2 视为顽疾单
- owner 三字段以建单/改派时 sys_user+sys_user_wecom 快照为准,人员离职由每日对账 Job 清空重置(见 business-rule §5)
- 不挂 `system_book_code`(运维内部能力,全账套共享,与日志异常报表一致)
