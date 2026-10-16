# 功能使用情况分析 API 规范

> 基于 [SKILL.md](../SKILL.md) 第「接口规范」节整理。
> **落地约定**：所有业务接口统一 `POST` + JSON Body（与 PRD 原 `GET/PUT` 存在差异，以实际后端 Controller `@PostMapping` 声明为准），前端 SDK 与管理页一律走 POST。

## 基础信息

| 项目 | 值 |
|------|-----|
| 埋点基础路径 | `/api/v1/events` |
| 管理基础路径 | `/api/v1/admin/usage` |
| Content-Type | `application/json` |
| 鉴权方式 | Bearer Token + 权限二次校验（403 Forbidden） |
| 权限编码 | `MENU:RND:MANAGE:USAGE_EVENTS` / `MENU:RND:MANAGE:USAGE_REPORT` / `MENU:RND:MANAGE:USAGE_CATALOG`（挂在父节点 `MENU:RND:MANAGE` 下）；功能目录还有按钮级权限 `BTN:RND:MANAGE:USAGE_CATALOG:EDIT` / `BTN:RND:MANAGE:USAGE_CATALOG:TOGGLE` |
| 账套隔离 | 来自应用配置 `app.system-book-code`（Nacos 可覆盖，见 `AppConfig.getSystemBookCode()`）；Mapper 对 `system_book_code=''` 的全局条目统一做空串兼容（DEF-01 修复，[FunctionCatalogMapper.xml](file:///Users/shy/javaProjects/lswg/busyming-snackingdom/busyming-snackingdom-domain/src/main/resources/mapper/snackingdom/usage/FunctionCatalogMapper.xml)） |
| HTTP Method | **全部 POST**（含读取类，便于统一缓存与日志） |
| 响应包裹 | 全局统一 `{code, success, data, message?}`，以下各节 Response 示例仅展示 `data` 部分 |
| 所在模块 | `busyming-snackingdom-web/controller/Usage{Ingest,Events,Report,Catalog}Controller.java` |

---

## 1. 埋点批量上报

**POST** `/api/v1/events/batch`

- 权限：任何已登录用户（不单独鉴权，仅校验 Token 有效）
- 限流：单用户 **10 req/s**，单请求 `events` 数组 **≤ 50 条**

### Request Body

```json
{
  "clientType": "WEB",
  "events": [
    {
      "routePath": "/portal/usage-events",
      "functionCode": "RND.MANAGE.USAGE_EVENTS",
      "functionName": "事务流水明细",
      "eventType": "VIEW",
      "eventTime": "2026-05-12 17:47:09.123"
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `clientType` | string | 否 | `WEB` / `APP`；省略时兼容从 `X-Client-Type` 请求头读取（[EventBatchRequest](file:///Users/shy/javaProjects/lswg/busyming-snackingdom/busyming-snackingdom-api/src/main/java/io/busyming/basic/snackingdom/api/request/usage/EventBatchRequest.java)） |
| `events[].routePath` | string | 是 | 完整路由，**Web 使用扁平 kebab-case 如 `/portal/usage-events`**（DEF-02 修复）；最大 256 字符 |
| `events[].functionCode` | string | 否 | 功能编码；未声明 / 传 `__UNCLASSIFIED__` / 未注册统一落「未归类」桶（转存 NULL）；最大 80 字符 |
| `events[].functionName` | string | 否 | 冗余，加速流水展示；最大 120 字符 |
| `events[].eventType` | string | 是 | 白名单：`VIEW` / `CLICK` / `SUBMIT`（不再支持 `CUSTOM`） |
| `events[].eventTime` | string | 是 | 格式 `yyyy-MM-dd HH:mm:ss.SSS`（含毫秒，服务器本地时区，与 `sys_event_log.event_time DATETIME(3)` 一致）；后端使用 `@JsonFormat(pattern="yyyy-MM-dd HH:mm:ss.SSS")` 解析；**不接受** ISO-8601 / `Z` / `+08:00` 等带时区偏移的格式（避免双端时区漂移） |

> **双端 SDK 约定**（见 [前端埋点 SDK 环境变量配置](../../../../../../busyming-snackingdom-web/.env.development.local) 与 [App usageTracker.ts](file:///Users/shy/javaProjects/lswg/busyming-snackingdom-app/src/utils/usageTracker.ts)）：
> - `eventTime` 统一 **本地时区 `yyyy-MM-dd HH:mm:ss.SSS`**（如 `2026-05-12 17:47:09.123`），与后端 `LocalDateTime` + `DATETIME(3)` 一致；不使用 ISO-8601 / `Z` / `+08:00`
> - 请求体 **仅限** `clientType` + `events` 两个顶层字段（历史 `appVersion/platform` 字段已移除，App SDK v2 起生效）
> - `userId` / `userName` / `userRoleName` / `userPhone` / `roleCode` **由后端从 Token 注入**，前端传值不信任

### Response

```json
{
  "code": "200",
  "success": true,
  "data": { "accepted": 1, "rejected": 0 }
}
```

### 错误码

| HTTP | 场景 |
|------|------|
| 400 | `events` 为空 / 超过 50 条 / `eventType` 非法 |
| 401 | Token 过期或未登录 |
| 429 | 限流拒绝（10 req/s/user） |

---

## 2. 流水查询

**POST** `/api/v1/admin/usage/events`

- 权限：`MENU:RND:MANAGE:USAGE_EVENTS`
- 实现：[UsageEventsController#queryEvents](file:///Users/shy/javaProjects/lswg/busyming-snackingdom/busyming-snackingdom-web/src/main/java/io/busyming/basic/snackingdom/web/controller/UsageEventsController.java)

### Request Body（EventQueryRequest）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `startTime` | string | 是 | `yyyy-MM-dd HH:mm:ss`，默认近 24h |
| `endTime` | string | 是 | 同上 |
| `clientType` | string | 否 | `WEB` / `APP` |
| `userId` | long | 否 | 指定用户 |
| `roleCode` | string | 否 | 指定角色编码 |
| `routeKeyword` | string | 否 | 路由模糊匹配（prefix，走 `route_path(64)` 索引） |
| `functionCode` | string | 否 | 精确匹配；传 `__UNCLASSIFIED__` 查「未归类」桶 |
| `eventType` | string | 否 | `VIEW` / `CLICK` / `SUBMIT` |
| `page` | int | 否 | 默认 1 |
| `pageSize` | int | 否 | 默认 50，最大 200 |

### Response

```json
{
  "total": 1284,
  "summary": { "eventCount": 1284, "uniqUsers": 87, "uniqFunctions": 42 },
  "list": [
    {
      "id": 88219301,
      "clientType": "WEB",
      "userId": 10023,
      "userName": "张三",
      "userRoleName": "数据分析员",
      "userPhone": "138****2233",
      "roleCode": "DATA_ANALYST",
      "routePath": "/data/inventory-report",
      "functionCode": "DATA.INVENTORY_REPORT",
      "functionName": "库存综合报表",
      "eventType": "VIEW",
      "eventTime": "2026-05-06 09:12:33.211"
    }
  ]
}
```

> `summary` 基于**过滤后全量**计算，不受 `page/pageSize` 影响（与满足率分析保持一致的约定）。

---

## 3. 流水导出 CSV

**POST** `/api/v1/admin/usage/events/export`

- 权限：`MENU:RND:MANAGE:USAGE_EVENTS`
- 最多 **5 万行**，超过返回 413 并引导至离线导出

### Request Body

同「流水查询」参数（忽略分页）。

### Response

- Content-Type: `text/csv;charset=UTF-8`
- Content-Disposition: `attachment;filename=功能使用情况-流水明细.csv`
- 文件带 UTF-8 BOM（`0xEF 0xBB 0xBF`）
- 表头：`端,用户名,角色,手机号,页面路由,功能编码,功能名称,事件类型,时间`

---

## 4. 使用情况报表（主视图）

**POST** `/api/v1/admin/usage/report`

- 权限：`MENU:RND:MANAGE:USAGE_REPORT`
- 实现：[UsageReportController#getReport](file:///Users/shy/javaProjects/lswg/busyming-snackingdom/busyming-snackingdom-web/src/main/java/io/busyming/basic/snackingdom/web/controller/UsageReportController.java)

### Request Body（ReportQueryRequest）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `startDate` | string | 是 | `yyyy-MM-dd`，与 `endDate` 跨度 ≤ 90 天（硬限制，超限 400 `BIZ.UA.006`；报表导出走同一限制） |
| `endDate` | string | 是 | `yyyy-MM-dd`（含当日），跨度同上 |
| `clientType` | string | 否 | `WEB` / `APP`，默认全端 |

### Response

```json
{
  "kpi": {
    "totalEvents": 56921,
    "activeUsers": 128,
    "activeFunctions": 47,
    "roleBiasedCount": 9
  },
  "trend": [
    { "date": "2026-05-01", "events": 8231, "users": 76 }
  ],
  "topFunctions": [
    { "functionCode": "DATA.INVENTORY_REPORT", "functionName": "库存综合报表", "clicks": 4821 }
  ],
  "routes": [
    {
      "routePath": "/data/inventory-report",
      "functionCount": 6,
      "clicks": 4821,
      "uniqUsers": 32,
      "ratio": 0.0847
    }
  ]
}
```

- `kpi.roleBiasedCount`：当前日期范围内 `top_role_ratio >= role_dominance_ratio` 的功能总数
- `trend[].date`：按自然日切片
- `topFunctions`：按 `total_clicks` 降序，默认取 Top10
- `routes`：按路由聚合，默认按 `clicks` 降序；`ratio = clicks / kpi.totalEvents`
- **快照加速（2026-09-04 起）**：`endDate=今天` 且跨度命中档位（近 7/30/90 天，即 `today-N ~ today`）且无 `roleCode` 筛选时，TOP 菜单与路由聚合读 `sys_usage_menu_snapshot`（每日 01:30 Job 预聚合，数据截至昨天）+ 今日实时增量合并，`user_ids` 集合并集保证 uniqUsers 与纯实时口径一致；其余查询（自由区间/历史区间/角色筛选/快照缺失）自动回落实时流式扫描，调用方无感知

---

## 5. 路由下钻（功能明细 + 三维度徽章）

**POST** `/api/v1/admin/usage/report/drill`

- 权限：`MENU:RND:MANAGE:USAGE_REPORT`
- 实现：[UsageReportController#drillRoute](file:///Users/shy/javaProjects/lswg/busyming-snackingdom/busyming-snackingdom-web/src/main/java/io/busyming/basic/snackingdom/web/controller/UsageReportController.java)

### Request Body（DrillRequest）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `routePath` | string | 是 | 精确匹配 `sys_function_catalog.route_path` |
| `startDate` | string | 是 | |
| `endDate` | string | 是 | |

### Response

```json
{
  "functions": [
    {
      "functionCode": "DATA.INVENTORY_REPORT.EXPORT",
      "functionName": "导出报表",
      "clicks": 412,
      "uniqUsers": 18,
      "topRoleCode": "DATA_ANALYST",
      "topRoleRatio": 0.84,
      "freqTag": "MID",
      "userTag": "MID",
      "roleTag": "ROLE_BIASED"
    }
  ]
}
```

> 标签字段直接读 `sys_function_tag_result` **当前周期快照**；若日期跨周期则返回交集日期内的最新快照。

---

## 6. 功能打标清单（报表的 Tag 筛选视图）

**POST** `/api/v1/admin/usage/functions/tags`

- 权限：`MENU:RND:MANAGE:USAGE_REPORT`
- 实现：[UsageReportController#listTags](file:///Users/shy/javaProjects/lswg/busyming-snackingdom/busyming-snackingdom-web/src/main/java/io/busyming/basic/snackingdom/web/controller/UsageReportController.java)

### Request Body（TagListRequest）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `freqTag` | string | 否 | `HIGH` / `MID` / `LOW` |
| `userTag` | string | 否 | `WIDE` / `MID` / `NARROW` |
| `roleTag` | string | 否 | `ROLE_BIASED` / `BALANCED` |
| `period` | string | 否 | `CURRENT`（默认，当前周期）或 `yyyy-MM-dd` 指定周期起始日 |

### Response

```json
{
  "periodStart": "2026-05-04",
  "periodEnd": "2026-05-10",
  "list": [
    {
      "functionCode": "DATA.INVENTORY_REPORT.EXPORT",
      "functionName": "导出报表",
      "routePath": "/data/inventory-report",
      "freqTag": "MID",
      "userTag": "MID",
      "roleTag": "ROLE_BIASED",
      "topRoleCode": "DATA_ANALYST",
      "totalClicks": 412,
      "uniqUsers": 18
    }
  ]
}
```

---

## 7. 功能注册表下拉（流水筛选 & 下钻通用）

**POST** `/api/v1/admin/usage/functions`

- 权限：`MENU:RND:MANAGE:USAGE_EVENTS` 或 `MENU:RND:MANAGE:USAGE_REPORT` 任一即可
- 实现：[UsageReportController#listFunctions](file:///Users/shy/javaProjects/lswg/busyming-snackingdom/busyming-snackingdom-web/src/main/java/io/busyming/basic/snackingdom/web/controller/UsageReportController.java)
- Request Body：空 JSON `{}`（占位）
- 返回 `sys_function_catalog` 启用项，前端下拉、流水表展示功能名都用它
- 账套筛选已做空串兼容（`system_book_code = ? OR system_book_code = ''`），**全局条目与当前账套条目均返回**（DEF-01 修复）

### Response

```json
{
  "code": "200",
  "success": true,
  "data": {
    "list": [
      {
        "routePath": "/portal/usage-events",
        "functionCode": "RND.MANAGE.USAGE_EVENTS",
        "functionName": "事务流水明细",
        "parentPermCode": "MENU:RND:MANAGE"
      }
    ]
  }
}
```

> **路由路径约定**（DEF-02 修复，见 [04_usage_analytics_catalog_route_patch.sql](file:///Users/shy/javaProjects/lswg/busyming-snackingdom/docs/20260511/04_usage_analytics_catalog_route_patch.sql)）：
> `sys_function_catalog.route_path` 统一采用前端真实 URL 的 **扁平 kebab-case**（如 `/portal/usage-events`、`/portal/usage-report`、`/portal/user-mgmt`、`/portal/role-mgmt`），早期 `SYSTEM.USAGE_ANALYTICS.*` 三级嵌套格式已废弃。

---

## 8. 功能目录管理 - 分页查询

**POST** `/api/v1/admin/usage/catalog/list`

- 权限：`MENU:RND:MANAGE:USAGE_CATALOG`
- 实现：`UsageCatalogController#list`

### Request Body

```json
{
  "keyword": "要货",
  "enabled": 1,
  "page": 1,
  "size": 20
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 否 | 模糊匹配 `function_code` / `function_name` / `route_path` |
| `enabled` | int | 否 | 启用状态：0=停用 1=启用，不传=全部 |
| `page` | int | 否 | 页码，从 1 开始（默认 1） |
| `size` | int | 否 | 每页大小（默认 20，最大 200） |

### Response

```json
{
  "code": "200",
  "success": true,
  "data": {
    "total": 158,
    "page": 1,
    "size": 20,
    "list": [
      {
        "id": 42,
        "systemBookCode": "LSHM",
        "parentPermCode": "MENU:RND:MANAGE",
        "routePath": "/portal/usage-events",
        "functionCode": "RND.MANAGE.USAGE_EVENTS",
        "functionName": "事务流水明细",
        "enabled": 1,
        "sortOrder": 0,
        "updatedAt": "2026-05-14 10:30:00",
        "updatedBy": 1
      }
    ]
  }
}
```

> **排序规则**：`enabled DESC, sort_order ASC, id DESC`（启用的优先显示，同状态按排序值升序）。
> **账套隔离**：返回当前账套自有记录 + 全局共享记录（`system_book_code = ? OR system_book_code = ''`）。

---

## 9. 功能目录管理 - 编辑

**POST** `/api/v1/admin/usage/catalog/update`

- 权限：`BTN:RND:MANAGE:USAGE_CATALOG:EDIT`
- 实现：`UsageCatalogController#update`
- 仅允许编辑展示元数据，不开放修改 `functionCode` 与 `systemBookCode`

### Request Body

```json
{
  "id": 42,
  "functionName": "事务流水明细",
  "parentPermCode": "MENU:RND:MANAGE",
  "sortOrder": 10
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | long | 是 | 主键 |
| `functionName` | string | 是 | 功能名称（展示用），最长 128 |
| `parentPermCode` | string | 否 | 所属菜单权限码，最长 128 |
| `sortOrder` | int | 否 | 排序值，不传按 0 处理 |

### Response

```json
{
  "code": "200",
  "success": true,
  "data": true
}
```

> **账套可见性校验**：仅允许操作当前账套自有或全局共享记录，禁止跨账套修改（返回 403）。

---

## 10. 功能目录管理 - 启停

**POST** `/api/v1/admin/usage/catalog/toggle`

- 权限：`BTN:RND:MANAGE:USAGE_CATALOG:TOGGLE`
- 实现：`UsageCatalogController#toggle`
- 幂等：若当前状态已等于目标值则直接返回

### Request Body

```json
{
  "id": 42,
  "enabled": 0
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | long | 是 | 主键 |
| `enabled` | int | 是 | 目标状态：0=停用 1=启用 |

### Response

```json
{
  "code": "200",
  "success": true,
  "data": true
}
```

> **停用影响**：`enabled=0` 后，该 `functionCode` 将不再出现在报表页功能下拉筛选中，但已产生的 `sys_event_log` 流水不受影响。自动注册时不会重复插入已停用的记录（唯一键去重）。

---

## 通用错误码

| HTTP | 场景 |
|------|------|
| 400 | 参数缺失 / 日期格式非法 / 日期跨度 > 90 天（流水查询、使用情况报表及报表导出均走硬限制，`BIZ.UA.006`） |
| 400 | 报表聚合行数超 20 万行护栏（`BIZ.UA.012`，提示缩短日期范围；2026-09-04 起 route×user 聚合改流式消费 + 行数护栏，堆内存与数据量解耦） |
| 401 | 未登录或 Token 过期 |
| 403 | 权限编码校验不通过 |
| 413 | 导出行数超过 5 万 |
| 429 | 埋点限流（10 req/s/user） |
| 500 | 后端异常（日志前缀 `[使用情况分析]`） |

---

## 附录：2026-09-04 更新记录

| 变更 | 文档调整 |
|-----------|---------|
| 报表大 SQL 行数维度治理 | §4 startDate/endDate 补充跨度 ≤ 90 天硬限制说明；通用错误码新增 `BIZ.UA.012` 聚合行数护栏场景，跨度限制范围从仅流水查询扩展到报表+导出 |

---

## 附录：本轮文档更新记录（2026-05-12）

基于本轮代码修复同步更新：

| 缺陷 / 变更 | 文档调整 |
|-----------|---------|
| **DEF-01** MAJOR：`sys_function_catalog` 查空 | §基础信息「账套隔离」说明空串兼容；§7 标注「全局条目与当前账套条目均返回」 |
| **DEF-02** MINOR：route_path 与前端扁平路由不匹配 | §1 Request 示例 + §7 Response 示例均改为 `/portal/usage-events` 等扁平 URL；§7 新增「路由路径约定」说明 |
| **DEF-03** MINOR：eventTime 格式 | §1 字段表统一为 `yyyy-MM-dd HH:mm:ss.SSS`（本地时区，与 DDL `DATETIME(3)` 对齐）；不再支持 ISO-8601 / `Z` / 时区偏移格式 |
| App SDK v2 DTO 对齐 | §1 Request 字段表移除 `CUSTOM` 事件类型；新增「双端 SDK 约定」提示框（`clientType` + `events` 仅两个顶层字段，旧 `appVersion/platform` 已移除） |
| 响应包裹约定 | §基础信息新增「响应包裹」行。§1 / §7 Response 示例按真实框架返回 `{code, success, data}` 格式展示 |

**不涉及文档更新的代码改动**（仅联调 / 运维类，不对外契约）：
- 后端 `AuthInterceptor.java` + `portal.js` 登录开发期临时短路 + Mock 用户（标注 `TEMP`，上生产前回滚）
- 前端 `.env.development.local` 本机 Vite 代理 + bypass（DEF-04）
- 前端 `authBypass.ts` MOCK_MENU_TREE 补齐 usage-analytics 三级菜单（DEF-05）
