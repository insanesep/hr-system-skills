---
name: 事务流水明细
description: 研发管理下的事务流水明细。Use when 需要按接入系统、时间、端、用户、角色、路由、功能及事件类型查询原始事件，查看详情、相邻事件时间线与行为摘要，或导出 CSV 与离线导出。端型：仅 Web 管理界面，数据覆盖 Web + App。
---

# 事务流水明细

## 功能职责与入口

按接入系统查询前端原始事件流水，提供事件详情抽屉、该用户近期相邻事件时间线、近 7 日行为摘要与 CSV 导出（超 5 万行转离线导出）。详情与抽屉归本菜单，不另设菜单入口。

- **菜单归属**：研发管理 → 功能使用情况分析 → 事务流水明细。
- **路由**：`/portal/usage-events`。
- **菜单权限**：`devhubUsageEvents`。
- **按钮权限**：见 [Web UI §按钮权限码](references/web-ui.md#按钮权限码)；授权范围与账套隔离见[共享权限规则](../references/business-rule.md#7-权限与可见性)。

## 资料指针

- [共享业务规则](../references/business-rule.md)：事件采集、身份信息信任边界、未归类与降级规则的唯一真源；查询时间与导出边界见 [§6](../references/business-rule.md#6-流水查询边界)。
- [Web UI](references/web-ui.md#1-事务流水明细usage-eventshtml)：筛选、统计摘要、表格、详情抽屉与导出区块。
- [Web 原型](assets/web/usage-events.html)。
- [分组索引](../SKILL.md)与[共享布局](../references/page-structure.md#共享布局)。
