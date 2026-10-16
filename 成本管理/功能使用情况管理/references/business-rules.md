# 功能使用情况分析 业务规则

> 基于 [SKILL.md](../SKILL.md) 整理后端判定口径与边界处理。

## 1. 埋点上报规则

### 1.1 事件类型与触发时机

| 事件类型 | 触发位置 | `function_code` 取值策略 |
|----------|----------|------------------------|
| `VIEW`   | 路由切换 / 页面可见 | 路由对应的主功能（`sys_function_catalog.route_path` 精确匹配） |
| `CLICK`  | 带 `data-fn="FUNCTION_CODE"` 属性的元素点击 | 元素上声明的编码 |
| `SUBMIT` | 表单成功提交 / 业务 API 调用成功 | 表单根节点的 `data-fn` |

**未声明 `data-fn` 的点击不采集**（避免噪声）。

### 1.2 批量与防抖

| 场景 | 规则 |
|------|------|
| 批量策略 | 本地队列 **≤ 20 条或 ≤ 5 秒** 触发一次上报 |
| 防抖 | 同一元素 3 秒内重复触发视为同一次（前端防抖，避免连点污染频次） |
| 失败容错 | 网络异常落 `localStorage.usageQueue`，下次加载自动重试 |
| 队列上限 | 500 条，溢出按 FIFO 丢弃最早记录 |
| 单请求上限 | `events` 数组 ≤ 50 条，否则后端返回 400 |
| 限流 | 单用户 10 req/s，超过返回 429 |

### 1.3 字段注入与信任边界

| 字段 | 来源 | 信任 |
|------|------|------|
| `clientType` / `routePath` / `functionCode` / `functionName` / `eventType` / `eventTime` | 前端 | 信任前端传值 |
| `systemBookCode` / `userId` / `userName` / `userRoleName` / `userPhone` / `roleCode` | Token 注入 | **前端传值不信任**，以 Token 为准 |

### 1.4 function_code 命名规范

- **格式**：`{MODULE}.{PAGE}.{ACTION}` 三段式，全大写、点号分隔；必要时可扩展为 `{MODULE}.{PAGE}.{SUB}.{ACTION}` 四段以定位组件
- **MODULE 选取原则**：与 `sys_permission` 菜单权限同源。以本模块为例，父权限 `MENU:RND:MANAGE` 对应 `MODULE.PAGE` = `RND.MANAGE`；其他模块（如 `INVENTORY.REPORT.*`、`ANALYSIS.NEG_GP.*`）代码中的 MODULE 为业务域名，与菜单树上一级节点一一对应
- **App 端前缀**：App 端上报的 `function_code` 统一加 `APP.` 前缀（**硬性约束，未加为违反规范**），用于区分 Web/App 来源；Web 端不加前缀
- **本模块真源（三条）**：
  - `RND.MANAGE.USAGE_EVENTS.{ACTION}` —— 事务流水明细页（路由 `/portal/usage-events`，权限 `MENU:RND:MANAGE:USAGE_EVENTS`）
  - `RND.MANAGE.USAGE_REPORT.{ACTION}` —— 使用情况报表页（路由 `/portal/usage-report`，权限 `MENU:RND:MANAGE:USAGE_REPORT`）
  - `RND.MANAGE.USAGE_CATALOG.{ACTION}` —— 功能目录管理页（路由 `/portal/usage-catalog`，权限 `MENU:RND:MANAGE:USAGE_CATALOG`）
- **其他模块示例**：
  - Web：`INVENTORY.REPORT.EXPORT`、`ANALYSIS.NEG_GP.QUERY`、`PRODUCT_APPLY.LIST.CREATE_NEW`
  - App：`APP.STORE_REQUEST.PRODUCT.ADD_TO_CART`、`APP.HARDWARE.MANAGE.BATCH_SEND`、`APP.WORKBENCH.NAV.CLICK`
- **入库校验**（建议）：后端 `sys_function_catalog` 登记与 `sys_event_log` 写入时，对 `function_code` 做正则校验：`^(APP\.)?[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,3}$`（允许三段或四段）
- **未注册编码**：上报的 `functionCode` 不在字典时走「自动注册」（§11）同事务 `INSERT IGNORE` 落库，事件表仍写入真实 `function_code`。仅当前端未传 `functionCode`（空值）时才写 NULL、报表归入「未归类」桶
- **埋点机制**：
  - **VIEW 自动上报**：Web 由 `router.afterEach` / App 由 `NavigationContainer.onStateChange` 调用 `trackView()`，**不需逐页/逐屏手工埋 VIEW**
  - **CLICK 仅对已声明元素采集**：Web 需在元素上追加 `data-fn="FUNCTION_CODE"`；App 两种方式二选一——`<Trackable code params>` 组件包裹（带 `onPress` 的单按钮场景，首选）或 `trackClick(code, name, params)` 函数式（适用于需在回调中多个副作用里埋点、`<Trackable>` 的 `cloneElement` 会产生歧义的场景）

---

## 2. 打标算法（三维度独立判定）

聚合数据源：当前周期内 `sys_event_log` 按 `function_code` 分组。

### 2.1 频次标签 `freq_tag`

```
令 total_clicks = 当前周期内该 function_code 的事件总数

total_clicks >= freq_high  → HIGH
total_clicks <  freq_low   → LOW
else                        → MID
```

默认阈值（固定）：`freq_high=500`，`freq_low=50`。

### 2.2 人次标签 `user_tag`

```
令 uniq_users = COUNT(DISTINCT user_id) WHERE function_code=? AND period

uniq_users  >= user_high   → WIDE
uniq_users  <  user_low    → NARROW
else                        → MID
```

默认阈值（固定）：`user_high=20`，`user_low=3`。

### 2.3 角色偏好标签 `role_tag`

```
按 role_code 分组统计点击数
令 top_role_ratio = max(某 role_code 点击数) / total_clicks
令 top_role_code  = argmax 的 role_code

top_role_ratio >= role_dominance_ratio → ROLE_BIASED，记录 top_role_code
否则                                    → BALANCED，top_role_code 仍写但不展示徽章
```

默认阈值（固定）：`role_dominance_ratio=0.70`。

### 2.4 边界与约定

| 场景 | 处理 |
|------|------|
| `total_clicks = 0` | 不参与打标，`tag_result` 无该条 |
| `function_code IS NULL`（未归类） | **不**参与打标 |
| 并列第一（两个角色占比相同） | 按 `role_code` 字典序取第一个，保证幂等 |
| 某条快照缺失 | 下钻接口用 catalog 兜底：`clicks / uniqUsers` 仍可计算，`freqTag/userTag/roleTag` 返回 `null`，前端展示「—」 |
| `role_code` 在事件发生后被删除 | 仍按事件时刻冗余的 `role_code` 聚合（不回查当前角色） |

---

## 3. 聚合周期

| 周期 | 起止 |
|------|------|
| `DAY` | 自然日 00:00:00.000 ~ 23:59:59.999 |
| `WEEK`（默认） | 周一 00:00 ~ 周日 23:59 |
| `MONTH` | 自然月首日 00:00 ~ 末日 23:59 |

- 默认使用 `WEEK`，周期不对外开放配置；如需调整需发版。
- **跨周期查询**：`/admin/usage/report/drill` 取**交集内最新快照**；`/admin/usage/functions/tags?period=CURRENT` 取当前周期

---

## 4. 打标重算策略

| 触发时机 | 范围 | 方式 |
|---------|------|------|
| 每日 01:00 定时任务 | 前一日数据 + **滚动覆盖当前周期** | 以「存在即更新」方式写入打标结果表 |
| 首次部署 / 数据补录 | 手动触发脚本 | 不在接口范围内，由运维跑补数 SQL |

**关键约定**：阈值采用固定默认值 50/500/3/20/0.70/WEEK，不对外开放运行时调整；历史快照保留原有标签语义。

---

## 5. 报表计算规则

### 5.1 KPI 卡（`/admin/usage/report`）

| 指标 | 口径 |
|------|------|
| `totalEvents` | `COUNT(*) FROM sys_event_log WHERE event_time ∈ [start, end]` |
| `activeUsers` | `COUNT(DISTINCT user_id)` 同范围 |
| `activeFunctions` | `COUNT(DISTINCT function_code) WHERE function_code IS NOT NULL` 同范围 |
| `roleBiasedCount` | `COUNT(*) FROM sys_function_tag_result WHERE role_tag='ROLE_BIASED'` 当前周期 |

### 5.2 趋势图

- 固定按**自然日**切片，即使跨度 < 1 天也至少返回 1 个点
- 双 Y 轴切换：`events`（事件数）/ `users`（活跃用户数）

### 5.3 TOP 功能柱状

- 默认按 `total_clicks` 降序，取 **Top10**
- `function_code IS NULL` 的事件合并为一行「未归类」，参与排名

### 5.4 路由聚合主表

| 字段 | 计算 |
|------|------|
| `routePath` | `GROUP BY route_path` |
| `functionCount` | 该路由下出现过的 `DISTINCT function_code` 数（含 NULL 桶按 0 算） |
| `clicks` | 该路由下事件总数 |
| `uniqUsers` | 该路由下去重用户数 |
| `ratio` | `clicks / kpi.totalEvents`，保留 4 位小数 |

### 5.5 路由下钻

- **交互方式**：在路由聚合表当前行下方展开嵌套二级表（AcTable `expandable` + `#expanded` slot），不跳转页面
- **触发**：点击操作列「下钻」按钮或表格内置 +/− 按钮，切换展开/收起
- **数据加载**：展开时调用 `POST /report/drill`，传入 `{ routePath, startDate, endDate }`，后端在 `buildDrillParams` 中剥离 `/busyming` 前缀后查询 `sys_event_log`
- 返回该路由下所有 `function_code` 明细（含 NULL 桶一行「未归类」）
- **嵌套表列**：功能编码 | 功能名称 | 事件数 | 用户数
- `freqTag / userTag / roleTag` 从 `sys_function_tag_result` **当前周期**快照读取，缺失返回 null

---

## 6. 流水查询边界

| 场景 | 处理 |
|------|------|
| 未传 `startTime/endTime` | 默认近 24h |
| 跨度 > 90 天 | 硬返回 400（避免全分区扫描） |
| `routeKeyword` 模糊 | 仅前缀匹配（走 `route_path(64)` 索引前缀），不支持尾部 `%` |
| `functionCode=__UNCLASSIFIED__` | 转换为 `function_code IS NULL` |
| 禁用 `DATE(event_time)` | Mapper XML 一律用 `event_time >= ? AND event_time < ?` 避免索引失效 |
| 导出 > 5 万行 | 返回 413，前端引导至「离线导出中心」（export-center 模块） |

---

## 7. 权限与可见性

| 接口 | 权限编码 |
|------|---------|
| 埋点批量上报 | 仅校验 Token 有效 |
| 流水查询 / 导出 | `MENU:RND:MANAGE:USAGE_EVENTS` |
| 使用情况报表 / 路由下钻 / 打标清单 / 功能注册表下拉 | `MENU:RND:MANAGE:USAGE_REPORT` |

**授权建议**（SKILL.md Tips 最后一条，最小授予原则）：
- `ADMIN` ✅ 三个权限全给
- `DATA_ANALYST` ✅ `EVENTS` + `REPORT`
- `WAREHOUSE_OPS` ❌ 都不给（非数据岗位）
- `VIEWER` ✅ 仅 `REPORT`

**账套隔离**：所有查询 SQL 必须带 `system_book_code = #{systemBookCode}`，从 Token 注入不信任前端。

---

## 8. 未归类事件处理

| 场景 | 处理 |
|------|------|
| 上报时 `functionCode` 为空 | 直接写 NULL 入库 |
| 上报时 `functionCode` 不在 `sys_function_catalog` | **不拒绝**，写 NULL 入库（SKILL.md 第「上报时机」节） |
| 报表/流水展示 | 独立呈现为「未归类」桶（以 `function_code IS NULL` 过滤） |
| 打标 | 不参与（跳过 NULL） |
| 产品侧处置 | 看到「未归类」数量 → 回 `sys_function_catalog` 补录 |

---

## 9. 异常与降级

| 场景 | 处理 |
|------|------|
| 埋点接口超时 | 前端重试 3 次，仍失败落 localStorage 队列 |
| 单次 batch 部分字段非法 | **整批拒绝** + 返回 400（前端需保证质量，避免拆分重试逻辑复杂化） |
| 打标 Job 超时 | 单条重试由 Job 内部控制，失败升级 FAIL 状态并告警 |
| `sys_function_tag_result` 空表 | 报表降级，`freqTag/userTag/roleTag` 全返 null，前端展示「尚未生成标签」 |

---

## 10. 徽章颜色映射（前端约定，此处仅登记口径）

| 维度 | 值 | 颜色 |
|------|----|------|
| `freq_tag` | HIGH | 红（`--primary`） |
|  | MID | 橙（`--warn`） |
|  | LOW | 灰（`--text-tertiary`） |
| `user_tag` | WIDE | 蓝（`--info`） |
|  | MID | 浅蓝 |
|  | NARROW | 灰 |
| `role_tag` | ROLE_BIASED | 紫（`--purple`）+ 附角色名 |
|  | BALANCED | 绿（`--positive`） |

徽章点击跳「打标清单 Tag 筛选」视图，便于快速回溯同类功能。

---

## 11. 功能目录自动注册机制

`sys_function_catalog` 在本模块中不仅作为功能下拉字典，还承担「首次出现即入库」的自动注册职责。

| 维度 | 说明 |
|------|------|
| 触发点 | `EventIngestServiceImpl.batchInsert()` 在写入 `sys_event_log` 前，同事务调用 `autoRegisterCatalog()` |
| 注册条件 | 本批 docs 中出现的 `functionCode` 不在内存中已加载的 catalog 字典（`loadCatalogNameMap`）里、且未在本批 pending 集合里 |
| 写入方式 | `FunctionCatalogMapper.batchInsertIgnore()`：`INSERT IGNORE INTO sys_function_catalog ...`，依赖唯一键 `uk_book_function_code(system_book_code, function_code)` 自动去重，冲突忽略不抛异常 |
| functionName 兜底链 | 埋点上报值（`EventItem.functionName`）→ 前端 `deriveFunctionName()` 自动抓取 → 兜底用 `functionCode` 占位（运营可在管理页人工补全） |
| 错误处理 | 最佳努力原则：插入失败仅记 `WARN` 日志，**不阻塞埋点主链路** |
| 默认值 | `enabled=1`、`sortOrder=0`、`parentPermCode=''`（运营后续手动关联菜单） |
| 账套 | 与当前登录用户的 `systemBookCode` 一致；缺省回退 `AppConfig.systemBookCode` |

**设计决策**（2026-05-14 确认）：采用同步 `INSERT IGNORE` 而非异步队列，降低运维复杂度。

**管理页与自动注册的分工**：自动注册只负责「有就不插、没有就插」的基础登记；人工运营通过功能目录管理页（[page-structure.md §4](./page-structure.md)）补全 `functionName` / `parentPermCode` / `sortOrder` 并按需启停。两者互不冲突：管理页不开放新增/物理删除，避免与自动注册争抢唯一键。

---

## 12. SDK 接入与运维

本节记录双端埋点 SDK 的接入开关、本地模式、紧急熄火、后端限流熔断、新增/删除埋点流程、查漏扫描命令与铺点优先级。在「自动注册」（§11）机制下，**不再维护「前端 data-fn / Trackable 逐条清单」**，`sys_function_catalog` 即为事实真源。

### 12.1 SDK 首次开启（真实上报）

**Web 端**：

SDK 在 `src/main.ts` 中通过 `initUsageTracker()` + `attachGlobalTrackDelegation()` 自动初始化。DevTools Network 可看到 `POST /api/v1/events/batch` 批量请求（每批 ≤ 20 条 / 5s 防抖）。

**App 端**：`App.tsx` 中调用 `initUsageTracker({ endpoint, clientType: 'APP', app, release, getToken })`；`endpoint: ''` 走本地模式；AppState 切后台时 SDK 自动 flush 队列。

### 12.2 本地模式（默认，零网络副作用）

- Web：`VITE_USAGE_ENDPOINT=''` → `console.debug('[usage]', batch)` + `localStorage.usageQueue` 队列
- App：`endpoint: ''` → `AsyncStorage.usageQueue` 队列 + `console.debug`
- 用途：前端铺点阶段未接后端、非生产环境调试、合规审计期「静默采集」

### 12.3 紧急熄火（运行时，不用发版）

| 端 | 操作 | 效果 |
|---|---|---|
| Web | DevTools Console：`localStorage.setItem('usage_sdk_disabled','1')` 后刷新 | SDK init 直接 `return`，零采集零网络 |
| App | 远端下发或本地：`AsyncStorage.setItem('usage_sdk_disabled','1')` 冷启 | 同上 |
| 恢复 | 删除 key 后刷新/冷启 | 恢复正常采集 |

**编译期完全移除**（Web）：`.env.production` 设 `VITE_ENABLE_USAGE_SDK=false`，重新构建后 SDK 代码被死代码消除。

### 12.4 后端限流 / 应急熔断（Nacos 热更）

配置项：`app.usage-analytics.ingest.rate-limit-rps`

| 场景 | Nacos 值 | 接口行为 |
|---|---|---|
| 正常 | `10`（默认） | 单用户 ≤ 10 req/s 正常落库；超限返回 `429` |
| 压力偏高 | `3` 或 `5` | 降低写库 QPS；超限 `429` |
| **应急熔断** | **`0`** | 返回 `200` 但 `accepted=0/rejected=N`；完全不落库、不触发前端重试 |

修改立即生效，无需重启。前端 SDK 收到 `accepted=0` 会暂停上报 5 分钟（自愈熔断）。

### 12.5 新增/删除埋点流程

**新增——Web**：在元素上追加埋点属性（大写三段式功能码），不改业务逻辑；首次上报后后端自动注册到功能目录，运营在功能目录管理页补全功能名称即可。

**新增——App（Trackable 组件首选）**：用 Trackable 组件包裹触发元素，声明功能码与中文描述。

**新增——App（函数式兜底）**：在点击回调首行上报，必须容错兜底、不阻断业务逻辑。

**删除**：仅需移除页面代码中的 `data-fn` / `<Trackable>` / `trackClick` 调用；`sys_function_catalog` **保留记录**（仅改状态为停用），避免历史数据失联。

### 12.7 铺点优先级与命名检查

| 优先级 | 动作类型 | 原因 |
|---|---|---|
| 高 | 提交 / 保存 / 审核 / 删除 / 导出 / 分享 | 业务价值高，分析核心动作 |
| 中 | 查询 / 筛选 / 重置 / 刷新 | 反映使用频次 |
| 低 | 详情 / 跳转 / 展开 | VIEW 已自动上报，CLICK 可选 |
| 不铺 | 翻页 / 排序 / 纯 UI 开关 / 关闭弹窗 | 噪声大、价值低 |

**命名检查清单**（参§1.4）：三段式 / 全大写 / 与同模块动词风格一致 / 与 `sys_function_catalog` 同名 code。
