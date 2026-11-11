---
name: 功能目录管理
description: 研发管理下的功能目录管理。Use when 需要查询埋点自动注册的功能目录、编辑功能名称与菜单权限及排序、切换启用或停用状态，或登记接入系统、发放与重置 AppKey、维护允许来源域名。端型：仅 Web 管理界面。
---

# 功能目录管理

## 功能职责与入口

面向运营与管理员管理埋点自动注册的功能目录，提供查询、元数据编辑与启停，不开放新增或物理删除；同页「接入系统」页签登记各业务系统、发放 AppKey 与维护来源白名单。编辑弹窗、启停与接入系统页签归本菜单，不另设页面入口。

- **菜单归属**：研发管理 → 功能使用情况分析 → 功能目录管理。
- **路由**：`/portal/usage-catalog`。
- **菜单权限**：`devhubUsageCatalog`。
- **按钮权限**：见 [Web UI §按钮权限码](references/web-ui.md#按钮权限码)；授权范围与账套隔离见[共享权限规则](../references/business-rule.md#7-权限与可见性)。

## 资料指针

- [共享业务规则](../references/business-rule.md)：自动注册与运营分工、默认值、去重、错误处理的唯一真源，见 [§11](../references/business-rule.md#11-功能目录自动注册机制)；埋点删除后的停用与历史记录保留见 [§12.5](../references/business-rule.md#125-新增--删除埋点流程)。
- [Web UI](references/web-ui.md#3-功能目录管理)：筛选、工具栏提示、表格、编辑弹窗、启停、分页、接入系统页签与按钮权限。
- [埋点接入 skill](../../../../busyming-devhub-web/sdk/usage-tracker/SKILL.md)：交给接入方的 SDK 接入、编码规范与排查指引。
- [分组索引](../SKILL.md)与[共享布局](../references/page-structure.md#共享布局)。
