# 功能使用情况分析 数据模型

> 基于 [SKILL.md](../SKILL.md) 第「数据模型」节整理，补充读写路径、变更流水表。

## 数据源

| 数据源 | 数据库 | 用途 |
|--------|--------|------|
| Snackingdom 主数据源 | `snackingdom_lshm` | 全部 3 张新表（见下表清单） + 依赖的 `sys_user` / `sys_role` / `sys_permission` |

> 本模块**不跨库**，所有表都在 `snackingdom_lshm`。`sys_event_log` 保留期由 DBA 离线 DELETE / 冷备归档执行。

---

## 表清单

| 表名 | 用途 | 读写特征 |
|------|------|---------|
| `sys_event_log` | 前端事务流水明细 | 高并发**写**；中等强度**查**；**普通表，暂不分区**（数据量增长再评估） |
| `sys_function_catalog` | 路由 × 功能 注册表 | 极少写（新增菜单时同步）；高频读（下拉 / JOIN） |
| `sys_function_tag_result` | 打标结果快照（阈值采用固定默认值 50/500/3/20/0.70/WEEK） | Job 写；报表读 |
| `sys_usage_menu_snapshot` | 使用情况报表菜单聚合快照（菜单 × 窗口档 7/30/90 × 端 × TOP/ROUTE，滚动覆盖固定约 5 千行） | 每日 01:30 Job 写；报表主流查询读 |

---

## 1. sys_event_log（前端事务流水）

```sql
CREATE TABLE sys_event_log (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    system_book_code VARCHAR(32)  NOT NULL DEFAULT ''          COMMENT '账套号（从 Token 注入）',
    client_type      VARCHAR(8)   NOT NULL DEFAULT ''          COMMENT '端：WEB / APP',
    user_id          BIGINT       NOT NULL DEFAULT 0           COMMENT 'sys_user.id',
    user_name        VARCHAR(64)  NOT NULL DEFAULT ''          COMMENT '用户姓名（冗余）',
    user_role_name   VARCHAR(64)  NOT NULL DEFAULT ''          COMMENT '用户角色中文名（冗余）',
    user_phone       VARCHAR(20)                          COMMENT '用户手机号（冗余）',
    role_code        VARCHAR(64)  NOT NULL DEFAULT ''          COMMENT '事件发生时用户角色编码',
    route_path       VARCHAR(256) NOT NULL DEFAULT ''          COMMENT '完整路由',
    function_code    VARCHAR(128)                         COMMENT '功能编码；NULL=未归类',
    function_name    VARCHAR(128)                         COMMENT '功能名称（冗余）',
    event_type       VARCHAR(16)  NOT NULL DEFAULT ''                    COMMENT 'VIEW / CLICK / SUBMIT',
    event_time       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)  COMMENT '事件发生时间（毫秒）',
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_time_func   (event_time, function_code),
    KEY idx_user_time   (user_id, event_time),
    KEY idx_route_time  (route_path(64), event_time),
    KEY idx_book_time   (system_book_code, event_time)
) COMMENT='前端事务流水明细';
```

### 设计要点

- **主键单列 `id`**：暂不分区；后续若改造为分区表，再同步调整为 `PRIMARY KEY (id, event_time)`。
- **账套隔离**：相比 SKILL.md 最小 DDL，新增 `system_book_code` 字段 + `idx_book_time` 索引，避免多账套环境互串。
- **保留期**：由 DBA 按需 `DELETE FROM sys_event_log WHERE event_time < DATE_SUB(NOW(), INTERVAL 90 DAY)` + `OPTIMIZE TABLE`，或走冷备 / 数仓归档链路。
- **后续分区 / 分表触发条件**：单表行数千万级 / 写入 QPS 持续高位 / 查询 p95 明显上升任一条件满足时，再立项评估：
  - (a) `PARTITION BY RANGE COLUMNS(event_time)` 手动预建 + 存储过程日滚（PolarDB MySQL 兼容版不支持 `INTERVAL`）；
  - (b) 按月分表 `sys_event_log_YYYYMM` + 应用层路由；
  - (c) 归档冷数据到低频存储 / 数仓。
- **索引设计两原则**（参照项目规范）：
  1. 高基数列（`event_time`）放在复合索引首列；
  2. 避免对 `event_time` 使用 `DATE()` 函数，改用范围 `event_time >= ? AND event_time < ?`（见 business-rules.md §6）。

### 写入路径

```
POST /api/v1/events/batch
  → EventLogService.batchInsert(List<EventLogDO>)
  → 填充 systemBookCode / userId / userName / userRoleName / userPhone / roleCode（从 Token）
  → INSERT INTO sys_event_log (batch size ≤ 50)
```

### 读取路径

| 用途 | Mapper 方法 | 关键条件 |
|------|------------|---------|
| 流水查询 | `selectEventsByCondition` | `event_time` 范围 + 条件组合 + LIMIT 分页 |
| 报表 KPI | `selectReportKpi` | 按自然日聚合 `COUNT(*)`、`COUNT(DISTINCT user_id)`、`COUNT(DISTINCT function_code)` |
| 报表趋势 | `selectReportTrend` | `GROUP BY DATE(event_time)`（或预聚合） |
| 路由聚合 | `selectRoutesAgg` | `GROUP BY route_path` |
| 下钻 | `selectFunctionsByRoute` | `GROUP BY function_code` + JOIN catalog 取名称 |
| 打标 Job 扫描 | `selectAggForTag` | 按 function_code + role_code 聚合 |

---

## 2. sys_function_catalog（功能注册表）

```sql
CREATE TABLE IF NOT EXISTS `sys_function_catalog` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT            COMMENT '主键',
    `system_book_code` VARCHAR(32)  NOT NULL DEFAULT ''                   COMMENT '账套号（空串表示全局）',
    `route_path`       VARCHAR(256) NOT NULL DEFAULT ''                   COMMENT '所属页面路由',
    `function_code`    VARCHAR(128) NOT NULL DEFAULT ''                   COMMENT '功能编码，全局唯一',
    `function_name`    VARCHAR(128) NOT NULL DEFAULT ''                   COMMENT '功能中文名',
    `parent_perm_code` VARCHAR(128) NOT NULL DEFAULT ''                   COMMENT '所属菜单权限 sys_permission.perm_code',
    `enabled`          TINYINT      NOT NULL DEFAULT 1                    COMMENT '1=启用 0=停用',
    `sort_order`       INT          NOT NULL DEFAULT 0                    COMMENT '展示排序，升序',
    `created_by`       INT          NOT NULL DEFAULT -1                   COMMENT '创建人，-1=系统',
    `updated_by`       INT          NOT NULL DEFAULT -1                   COMMENT '更新人，-1=系统',
    `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP    COMMENT '创建时间',
    `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_flag`     TINYINT      NOT NULL DEFAULT 0                    COMMENT '逻辑删除：0=正常 1=删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_book_function_code` (`system_book_code`, `function_code`, `deleted_flag`),
    UNIQUE KEY `uk_book_route_path`    (`system_book_code`, `route_path`,    `deleted_flag`),
    KEY `idx_parent_perm` (`parent_perm_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='功能注册表：与 sys_permission 菜单一一对应';
```

### 初始化数据

与 [snackingdom-portal](../../snackingdom-portal/SKILL.md) 权限树逐条对应，**新增菜单时三处同步登记**：

1. `sys_permission` 新增菜单
2. `sys_function_catalog` 新增功能
3. 前端路由表新增路由

初始化 15 条记录见 SKILL.md 的映射表（dashboard / data / warehouse / system 菜单树）。

### 与 sys_permission 关系

```
sys_permission.perm_code (MENU:RND:MANAGE:USAGE_EVENTS)
         ▲ parent_perm_code
         │
sys_function_catalog.function_code (RND.MANAGE.USAGE_EVENTS)
         │ function_code
         ▼
sys_event_log.function_code
```

> **示例对齐真源**：本模块自身三个页面登记为 `RND.MANAGE.USAGE_{EVENTS|REPORT|CATALOG}`（与父权限 `MENU:RND:MANAGE` 同源），路由 `/portal/usage-{events|report|catalog}`；其他模块沿用各自命名空间（如 `INVENTORY.REPORT.*`、`ANALYSIS.NEG_GP.*`），命名规则详见 [business-rules.md §1.4](./business-rules.md#14-function_code-命名规范)。

- **一对多**：一个菜单权限 (`parent_perm_code`) 下可挂多个 `function_code`（如一个页面上有「查询」「导出」两个功能）
- **未注册编码**：事件上报时 `function_code` 不在 catalog 中 → 流水照落，但 `function_code` 字段置 NULL，报表归入「未归类」桶

---

## 3. sys_function_tag_result（打标结果快照）

```sql
CREATE TABLE sys_function_tag_result (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    function_code  VARCHAR(128) NOT NULL COMMENT 'sys_function_catalog.function_code',
    period_start   DATE         NOT NULL COMMENT '聚合周期起',
    period_end     DATE         NOT NULL COMMENT '聚合周期止',
    total_clicks   INT          NOT NULL DEFAULT 0 COMMENT '周期内总触发次数',
    uniq_users     INT          NOT NULL DEFAULT 0 COMMENT '周期内去重用户数',
    top_role_code  VARCHAR(64)                      COMMENT '占比最高角色编码',
    top_role_ratio DECIMAL(4,2)                     COMMENT '该角色点击占比',
    freq_tag       VARCHAR(8)   NOT NULL COMMENT 'HIGH / MID / LOW',
    user_tag       VARCHAR(8)   NOT NULL COMMENT 'WIDE / MID / NARROW',
    role_tag       VARCHAR(16)  NOT NULL COMMENT 'ROLE_BIASED / BALANCED',
    generated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_func_period (function_code, period_start, period_end),
    KEY idx_period (period_start, period_end)
) COMMENT='功能打标结果快照';
```

### 写入规则

- **每日 01:00 Job**：滚动覆盖「当前周期」快照（`INSERT ... ON DUPLICATE KEY UPDATE`）
- **阈值采用固定默认值** 50/500/3/20/0.70/WEEK，不对外开放运行时调整；如需调整需发版（见 business-rules.md §4）
- **未归类事件**（`function_code IS NULL`）**不**参与打标，直接跳过

---

## 4. sys_usage_menu_snapshot（报表菜单聚合快照，2026-09-04 新增）

```sql
CREATE TABLE IF NOT EXISTS `sys_usage_menu_snapshot` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `system_book_code` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '账套编码',
  `window_days` INT NOT NULL DEFAULT 0 COMMENT '窗口天数差（近N天档位：7/30/90，对应查询 startDate=today-N, endDate=today）',
  `client_type` VARCHAR(8) NOT NULL DEFAULT 'ALL' COMMENT '端：ALL/WEB/APP（事件端口径，菜单端 PC/MOBILE 过滤已在计算时完成）',
  `agg_type` VARCHAR(8) NOT NULL DEFAULT 'ROUTE' COMMENT '聚合类型：TOP=事件唯一归属最长匹配菜单；ROUTE=多命中全量菜单（含0触发）',
  `menu_id` BIGINT NOT NULL DEFAULT 0 COMMENT '菜单ID（sys_permission.id）',
  `perm_code` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '权限编码（冗余，便于排查；展示取值以当前菜单表为准）',
  `clicks` BIGINT NOT NULL DEFAULT 0 COMMENT '窗口内事件数（不含今日，今日由报表实时增量合并）',
  `uniq_users` INT NOT NULL DEFAULT 0 COMMENT '窗口内去重用户数（=user_ids 元素数，冗余便于直查）',
  `user_ids` TEXT NULL COMMENT '窗口内用户ID集合（JSON数组）；报表与今日增量做集合并集保证 uniqUsers 精确',
  `last_trigger_time` DATETIME(3) NOT NULL DEFAULT '1970-01-01 00:00:00.000' COMMENT '窗口内最后触发时间（1970-01-01 哨兵值=窗口内未触发）',
  `snapshot_date` DATE NOT NULL DEFAULT '1970-01-01' COMMENT '数据截止日（窗口末日，=Job运行日-1）',
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usage_snapshot` (`system_book_code`, `window_days`, `client_type`, `agg_type`, `menu_id`),
  KEY `idx_snapshot_lookup` (`system_book_code`, `snapshot_date`, `window_days`, `client_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='使用情况报表菜单聚合快照（滚动覆盖，固定约5千行）';
```

### 设计要点

- **背景**：route×user 预聚合行数随用户/路由增长（90 天窗口生产实测 48,851 行，逼近大 SQL 巡检 5 万行红线）；历史事件不可变，故每日 Job 预聚合菜单级结果，报表主流查询（近 7/30/90 天含今天）读快照 + 今日实时增量，返回行数从万级降至百级。
- **uniqUsers 精确性**：落盘 `user_ids` 集合（非 count），查询时与今日实时增量做集合并集，口径与纯实时完全一致；这是不采用菜单级 count 快照的原因（跨区间去重无法由 count 相加得出）。
- **滚动覆盖**：唯一键（账套+窗口+端+聚合类型+菜单）UPSERT，固定约 5 千行；Job 末尾按 `snapshot_date < 昨天` 清除不再命中的旧行。
- **降级路径**：roleCode 筛选 / 自由区间 / 历史区间 / 快照缺失或过期 → 报表自动回落实时流式查询（FORWARD_ONLY + fetchSize=Integer.MIN_VALUE + 20 万行护栏）。

---

## 表关联关系图

```
sys_permission ─┬──(perm_code)────── sys_function_catalog.parent_perm_code
                │
                └──(role → perm)──── sys_role_permission ── sys_role
                                                              │
                                                              ▼
                                                         sys_user.role_code
                                                              │
                                                  (Token 注入 role_code + user_id)
                                                              │
                                                              ▼
                                                      sys_event_log (INSERT)
                                                              │
                                                 (GROUP BY function_code, role_code)
                                                              │
                                                              ▼
                                             sys_function_tag_result (Job 写，阈值固定)
                                                              │
                                                              │ (读)
                                                              ▼
                                                  /admin/usage/report/drill
                                                  /admin/usage/functions/tags
```

---

## SQL 查询清单

| Mapper 方法 | 表 | 用途 |
|------------|----|------|
| `EventLogMapper.batchInsert` | `sys_event_log` | 埋点批量写入 |
| `EventLogMapper.selectEventsByCondition` | `sys_event_log` | 流水查询（分页） |
| `EventLogMapper.selectEventsSummary` | `sys_event_log` | 流水顶部 summary（过滤后全量） |
| `EventLogMapper.selectReportKpi` | `sys_event_log` | 报表 4 张 KPI 卡 |
| `EventLogMapper.selectReportTrend` | `sys_event_log` | 趋势图（按日） |
| `EventLogMapper.selectRouteUserAgg` | `sys_event_log` | TOP 菜单 + 路由聚合数据源（route×user 流式预聚合，FORWARD_ONLY + fetchSize=MIN_VALUE，Service 内存前缀匹配菜单） |
| `EventLogMapper.selectFunctionsByRoute` | `sys_event_log` + `sys_function_catalog` | 路由下钻 |
| `EventLogMapper.selectAggForTag` | `sys_event_log` | 打标 Job 扫描源（按 function_code × role_code） |
| `FunctionCatalogMapper.selectEnabled` | `sys_function_catalog` | 下拉 / 展示冗余名 |
| `TagResultMapper.upsertByFuncPeriod` | `sys_function_tag_result` | Job 快照写（ON DUPLICATE KEY UPDATE） |
| `TagResultMapper.selectByFuncCurrent` | `sys_function_tag_result` | 下钻取徽章 |
| `TagResultMapper.selectByTags` | `sys_function_tag_result` | Tag 筛选清单 |
| `UsageMenuSnapshotMapper.upsertSnapshot` | `sys_usage_menu_snapshot` | 报表快照 Job 写（ON DUPLICATE KEY UPDATE 滚动覆盖） |
| `UsageMenuSnapshotMapper.selectBySnapshotDate` | `sys_usage_menu_snapshot` | 报表主流查询读快照（snapshot_date=昨天才命中） |
| `UsageMenuSnapshotMapper.deleteStaleBefore` | `sys_usage_menu_snapshot` | 清除过期快照行（snapshot_date < 昨天） |
