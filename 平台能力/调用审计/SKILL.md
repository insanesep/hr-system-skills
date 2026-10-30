---
name: 调用审计
description: 调用审计。Use when 权限管理员、MCP 管理员或数据源管理员需要查询全量 MCP 调用证据、核对实际工具与目标、成功拒绝失败原因、查看汇总与明细详情，或 MCP 管理员需要按当前筛选条件导出审计记录。仅 Web 端。
metadata: {"domain":"产研","subdomain":"平台能力","platform":["web"]}
---

# 调用审计

## 功能与入口

- 菜单归属：平台能力 → 调用审计；入口 `/mcp-access/audit`，路由编码（name）为 `devhubMcpAudit`。
- 服务对象：权限管理员、MCP 管理员与数据源管理员查看全量调用；导出属于 MCP 管理员职责。权限定义仅引用 [共享权限矩阵](../references/permission-rules.md#1-权限点矩阵)。
- 查看权限码为 `devhubMcpAudit`，路由声明该 `meta.permCode`；导出动作权限码为 `devhubMcpAuditExport`，与路由 name 分开识别。

## 页内功能

- 查询调用记录，按时间范围、持有人、令牌名称 / 前缀与结果筛选，支持今天、近 7 天和近 31 天快捷时间段；支持接入领域与目标对象筛选，见 [UI 正文](references/web-ui.md#调用审计)。
- 查看调用次数、成功率、拒绝次数、活跃令牌数与数据库查询次数；明细展示实际工具、目标对象、结果原因、返回数量、截断、脱敏与耗时，不将缺失证据补为零值。
- 行「详情」打开调用详情抽屉；有令牌关联时可进入 [我的令牌](../我的令牌/SKILL.md)所属详情页，查看他人令牌仍须令牌管理权限。
- 导出沿用当前筛选条件，限额、异步任务、摘要与保留期统一引用 [审计规则](references/audit-rules.md)，本页不编辑或删除记录。

## 页内与非菜单边界

本功能只有调用审计菜单页；调用详情为页内抽屉，不新增详情路由或菜单。令牌链接的目标 `/mcp-access/tokens/:id` 属于平台能力 → 我的令牌的非菜单详情页；授权变更抽屉归权限分配，个人令牌调用记录归我的令牌，不复制到本功能页面正文。

## Prerequisites

- [域及项目管理 · 执行映射](../../研发管理/域及项目管理/references/business-rule.md#execution-mapping)与[产研人员管理 · 权限边界](../../研发管理/产研人员管理/references/permission-rules.md#boundaries)：核对当前基础引用，不改写历史调用、授权与经办人证据。

## 规则、页面与资产

- [Web 页面正文](references/web-ui.md#调用审计)：筛选、汇总、明细、抽屉、导出反馈及导航的唯一正文，保留领域与目标筛选的产品目标。
- [审计规则](references/audit-rules.md)：记录范围、结果原因、可见范围、汇总、保留导出及授权变更的真源。
- [共享业务规则](../references/business-rule.md)、[权限规则](../references/permission-rules.md)、[数据定义](../references/data.md)只引用不复制；工具目标含义由[研发工具规则](../研发工具资源/references/devtool-rules.md)与[数据源规则](../数据源管理/references/datasource-rules.md)定义。
- [原型](assets/web/call-audit.html)只作视觉参考；规则真源在 `references/`。
- 实现依据：[调用审计页](../../../busyming-devhub-web/src/views/mcp/CallAuditView.vue)与[路由](../../../busyming-devhub-web/src/router/index.ts)。
