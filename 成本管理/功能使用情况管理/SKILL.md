---
name: usage-analytics
description: 功能使用情况分析。Use when 开发或迭代 Web 后台的前端事件流水、使用情况统计报表（页面→功能下钻）、功能自动打标（频次/人次/角色偏好 三维度，固定阈值）、功能目录自动注册与运营管理（埋点新 functionCode 同事务 INSERT IGNORE 落库 + 管理页分页查询/编辑/启停），涉及 sys_event_log、sys_function_catalog、sys_function_tag_result 表，以及 /api/v1/events/batch、/api/v1/admin/usage/*、/api/v1/admin/usage/catalog/* 接口。端型：仅 Web 端。
---

# 功能使用情况分析

面向「鸣鸣很忙管理中心」的功能分析模块，量化衡量每个功能被使用的程度，支撑产品侧对功能价值的判断、运营侧对用户行为的洞察、以及管理侧对角色权限包的复核。

## 端

**仅 Web 端**（管理后台）。数据采集覆盖 Web + App 所有业务页面，但流水查询、统计报表仅在 Portal「系统设置」下呈现。

## 产品背景

现有 RBAC 只规定了「谁能用」，但缺失「谁真的在用、用得多还是少」的闭环观测：新功能上线后多少人在用？同一报表究竟是哪个角色在用？哪些功能可以下线、哪些应加入工作台宫格？

usage-analytics 按 RBAC 三层模型延伸一层「行为事实层」：记录所有前端事件 → 聚合成使用情况 → 自动打标（高/中/低频、广度、角色偏好），为产品迭代与权限优化提供量化依据。

## 数据模型

本模块新增 3 张表，与用户 / 角色 / 权限体系协作。表结构、字段、索引、保留期策略等实现细节以代码仓为准，不内嵌。

| 表名 | 角色 |
|------|------|
| `sys_event_log` | 前端事务流水（普通表，PolarDB MySQL 兼容版回退） |
| `sys_function_catalog` | 路由 × 功能 注册表，与 `sys_permission` 一一对应 |
| `sys_function_tag_result` | 三维度打标结果快照（按 `(function_code, period_start, period_end)` 唯一）；阈值采用固定默认值 50/500/3/20/0.70/WEEK |
| `sys_usage_menu_snapshot` | 报表菜单聚合快照（菜单 × 窗口档 7/30/90 × 端 × TOP/ROUTE，每日 01:30 Job 滚动覆盖）；报表「近 N 天含今天」查询读快照 + 今日实时增量（`user_ids` 集合并集保证 uniqUsers 精确），其余查询回落实时流式扫描 |

> **登记一致性硬约束**：新增菜单时 `sys_permission` / `sys_function_catalog` / 前端路由表三处必须同步登记，不允许任一处缺失；本模块自身 3 个页面登记为 `RND.MANAGE.USAGE_{EVENTS|REPORT|CATALOG}`，路由 `/portal/usage-{events|report|catalog}`（扁平 kebab-case，DEF-02 真源），与父权限 `MENU:RND:MANAGE` 同源。
>
> **保留期策略**：`sys_event_log` 由 DBA 按需 `DELETE` + `OPTIMIZE TABLE`，或走冷备 / 数仓归档；不通过分区滚动维护（上线初期数据量有限，后续如需可手动预建 RANGE 分区 / 按月分表 / 冷备归档）。`sys_user` / `sys_role` / `sys_permission` 完整 DDL 参见 busyming-portal。

## 前端埋点协议

完整上报时机、批量策略（20/5s + 同 code 3s 防抖 + VIEW 3s 去重）、未归类处理、`function_code` 命名规范（`{MODULE}.{PAGE}.{ACTION}` 三段式 / App 加 `APP.` 前缀）、埋点机制（VIEW 自动 / Trackable / trackClick）详见 [references/business-rules.md §1](./references/business-rules.md)；SDK 接入开关、本地模式、紧急熄火、Nacos 限流熔断、新增/删除埋点流程、查漏扫描命令与铺点优先级详见 [references/business-rules.md §12](./references/business-rules.md)。在「自动注册」机制下，`sys_function_catalog` 即为前端铺点事实真源，不再维护逐条镜像清单。

跨文档补充（仅本 SKILL 登记）：

- 事件批量上报端点与全部接口的签名 / DTO / 错误码以代码仓契约为准，不内嵌；后端责任矩阵、限流、权限校验、参数与返回模型同。
- `systemBookCode` / `userId` / `userName` / `userRoleName` / `userPhone` / `roleCode` 均由后端从 Token 自动注入，前端不传不信任；`clientType` 由前端 SDK 传值（兼容从 `X-Client-Type` 请求头读取）。
- `eventTime` 真源：`yyyy-MM-dd HH:mm:ss.SSS`（本地时区、含毫秒，与 `sys_event_log.event_time DATETIME(3)` 对齐）；不接受 `Z` / `+08:00` / 毫秒时间戳等其他变体。

## 页面结构

Portal「系统设置」下新增「功能使用情况分析」分组，包含 3 个子页面。原型位于 [asset/](./asset/)，已对齐 前端页面规范（真源：page-gen.prompt.md v3.4.0）。各页面区块定义、字段与列、按钮权限码详见 [references/page-structure.md](./references/page-structure.md)。

| 页面 | 路由 | 权限码 | 职责 |
|------|------|--------|------|
| 事务流水明细（usage-events.html） | `/portal/usage-events` | `MENU:RND:MANAGE:USAGE_EVENTS` | 按筛选条件查看原始事件流水、抽屉详情、CSV 导出 |
| 使用情况报表（usage-report.html） | `/portal/usage-report` | `MENU:RND:MANAGE:USAGE_REPORT` | KPI / 趋势 / TOP10 / 角色偏好 / 路由聚合下钻 |
| 功能目录管理（UsageCatalog.vue） | `/portal/usage-catalog` | `MENU:RND:MANAGE:USAGE_CATALOG` | 自动注册表的查询 / 编辑元数据 / 启停（不开放新增/物理删除） |

> **使用情况报表（产品向硬约束）**：
> - **顶部全局筛选**：时间范围（默认近 30 天） / 端 / 角色 / **功能名称（二级，数据源 `sys_function_catalog`）** / 聚合粒度（日/周/月）。选中具体功能后，KPI、三 Chart、路由聚合表均按该功能过滤，为全局维度筛选而非列表局部筛选。
> - **KPI 卡类型**：4 等分卡统一使用「左文本 + 右 sparkline」布局；连续变化量（总事件、活跃功能）走 area+line 折线，离散周期对比（活跃用户、不活跃功能）走 bar 柱；上升是好事用主色 / 成功色，「不活跃功能数」用警告色。禁止使用纯文本 KPI 卡。
> - **页面明细统一按「功能名称」展示**：所有可视层一律以 `function_name`（中文）为主显示文本，`function_code` 仅用于代码定位与 CSV 导出列。
> - **路由统一到二级路由**：所有页面级聚合一律以 `/{level1}/{level2}` 形式展示，不展开 `:id` / 三级以下子路径；下钻明细才进入功能粒度。
> - **三 Chart 一排**：合并为单一 `.tpl-panel--analysis`，按 `1fr 1fr 1fr` 三列等宽呈现「按日趋势折线」「TOP 10 高频功能（标签：`{功能名} · {二级路由}`）」「角色偏好分布饼图」。
> - **路由聚合表必须含 0 触发路由**：数据源为 `sys_function_catalog` 全量启用项 `LEFT JOIN` 周期事件，事件数 / 用户数为 0 也呈现并打 `INACTIVE` 灰色标签；默认按事件数降序、0 触发置末尾，支持「仅未触发」筛选。

## 功能目录自动注册

`sys_function_catalog` 在本模块中不仅作为功能下拉字典，还承担「首次出现即入库」的自动注册职责：埋点上报新 `functionCode` 时，`EventIngestServiceImpl.batchInsert()` 在写入 `sys_event_log` 前同事务通过 `INSERT IGNORE` 落库，依赖唯一键去重；最佳努力原则不阻塞主链路。`functionName` 走「上报值 → 前端 `deriveFunctionName()` → `functionCode` 占位」三级兜底，运营在功能目录管理页人工补全。详细触发点、写入方式、错误处理、默认值与设计决策详见 [references/business-rules.md §11](./references/business-rules.md)。

## 打标算法

三维度（频次 freq_tag / 人次 user_tag / 角色偏好 role_tag）独立判定，阈值采用固定默认值 50/500/3/20/0.70/WEEK，每日 01:00 SchedulerX 重算当前周期，结果用于使用情况报表的徽章展示与 Tag 筛选。详细算法、聚合周期、边界、徽章颜色映射、徽章点击跳「按 Tag 筛选」视图、未归类桶展示与补录闭环详见 [references/business-rules.md §2、§3、§4、§8、§10](./references/business-rules.md)。支持按任一维度筛选功能清单，辅助产品与权限复核。
