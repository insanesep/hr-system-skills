# 事务流水明细 Web UI 功能描述

> 通用约束见[共享布局](../../references/page-structure.md#共享布局)，业务口径见[共享业务规则](../../references/business-rule.md)。原型见 [usage-events.html](../assets/web/usage-events.html)。

## 1. 事务流水明细（usage-events.html）

- **路由**：`/portal/usage-events`
- **权限码**：`MENU:RND:MANAGE:USAGE_EVENTS`
- **页面类型**：列表页

### 区块职责

| 区块 | 说明 |
|------|------|
| 顶部筛选条 | 时间范围（默认近 24 小时，单一日期范围控件） / 端（Web/App） / 用户（输入联想） / 角色（下拉） / 路由关键词 / 功能（下拉，取自功能目录） / 事件类型 |
| 统计摘要 | 当前筛选条件下：事件总数、去重用户数、去重功能数、最近事件时间 |
| 表格列 | 端 \| 用户名 \| 角色 \| 手机号 \| 页面（路由） \| 功能 \| 事件类型 \| 时间 \| 操作（查看详情） |
| 右侧抽屉 | 点击行展开：事件详情 + 该用户近期相邻事件时间线 + 近 7 日行为摘要 |
| 导出 | 支持导出 CSV，最多 5 万行；超量引导至离线导出 |

### 按钮权限码

- 导出 CSV：`BTN:RND:MANAGE:USAGE_EVENTS:EXPORT`
- 查看详情：受 `MENU:RND:MANAGE:USAGE_EVENTS` 进入页即授予，无独立按钮码
