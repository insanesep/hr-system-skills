# 功能使用情况分析 共享布局与页面索引

## 共享布局

三个菜单页面的路由 / 权限码、区块职责、字段与列、交互行为、按钮权限码分别归各叶子 Web UI 文档。

前端页面通用硬约束（设计 Token、骨架、卡片化拓扑、面包屑、三态、图标、KPI、日期范围控件等）统一以前端页面规范为准，本文件不复述。业务页主内容不带外壳，面包屑 / 顶栏 / 侧边由 Layout 承载；共用外壳资产见 [_shell.css](../assets/web/_shell.css)。

## 页面索引

| 菜单功能 | 功能入口 | Web UI | 原型 |
|------|------|------|------|
| 事务流水明细 | [SKILL.md](../事务流水明细/SKILL.md) | [页面结构](../事务流水明细/references/web-ui.md#1-事务流水明细usage-eventshtml) | [usage-events.html](../事务流水明细/assets/web/usage-events.html) |
| 使用情况报表 | [SKILL.md](../使用情况报表/SKILL.md) | [页面结构](../使用情况报表/references/web-ui.md#2-使用情况报表usage-reporthtml) | [usage-report.html](../使用情况报表/assets/web/usage-report.html) |
| 功能目录管理 | [SKILL.md](../功能目录管理/SKILL.md) | [页面结构](../功能目录管理/references/web-ui.md#3-功能目录管理)、[接入系统页签](../功能目录管理/references/web-ui.md#接入系统页签) | — |

跨页面的业务判定与数据口径只引用[业务规则真源](business-rule.md)。
