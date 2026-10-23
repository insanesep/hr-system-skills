---
name: 故障报告
description: 故障报告。Use when 需要登记产研故障并跟踪处理、复盘与闭环——故障单关联错误日志指纹报表、服务器监控快照与黑灯工厂工单等运维证据，复盘产出改进措施逐项跟踪至闭环。端型：仅 Web 端。
metadata:
  domain: 研发
  clients: web
---

# 故障报告

## 模块概述

面向研发、运维与管理层的故障全生命周期管理：**登记 → 处理 → 复盘 → 闭环**，关联运维证据沉淀复盘资产，替代群消息散落与口头复盘。与「运维管理 / 黑灯工厂管理」分工：黑灯工单 = agent 巡检产出的自动化修复闭环；故障报告 = 影响业务的故障事件的**人工复盘闭环**，可关联黑灯工单作为证据，同一事件两边互相引用、不重复展开。

## 端

- **web**：研发报告 → 故障报告（故障列表 + 登记 / 编辑弹窗 + 故障详情），仅桌面端使用，不提供 App 入口

## When to Use

- 新增或调整故障定级、复盘时限、状态流转或闭环确认规则
- 调整运维证据（错误日志 / 监控快照 / 黑灯工单）的关联与跳转溯源方式
- 调整改进措施的跟踪、逾期判定或复盘打回流程
- 生成或复核故障列表、故障详情页原型

## Prerequisites

| 引用资源 | 路径 | 用途 | 所属仓库 |
|---------|------|------|---------|
| 业务规则 | [references/business-rule.md](references/business-rule.md) | 名词约定、业务流程、定级、状态机、复盘时限与高亮、删除与证据约束、权限编码 | 本模块 |
| 数据定义 | [references/data.md](references/data.md) | 故障单、运维证据关联、复盘记录、改进措施的字段口径与实体关系 | 本模块 |
| Web 页面 | [references/web-ui.md](references/web-ui.md) | 故障列表、登记 / 编辑弹窗、故障详情的区块元素、导航关系、操作反馈与表单校验 | 本模块 |
| 页面模板 | [order-list.html](../../../busyming-skills-design/templates/web/order-list.html) | 故障列表 `order-list` 的整页范例 | busyming-skills-design |
| 页面模板 | [order-detail.html](../../../busyming-skills-design/templates/web/order-detail.html) | 故障详情 `order-detail` 的整页范例 | busyming-skills-design |
| 原型样式链 | [templates.css](../../../busyming-skills-design/templates/web/templates.css) + [pc.css](../../../busyming-skills-design/components/web/tokens/pc.css) | 原型样式链：components/web/tokens/pc.css → docs-site/demos/pc/css/convert-el-plus.css → docs-site/ep-base-shim.css → templates/web/templates.css（`--busy-*` Token 与 `busy-*` / `.tpl-*` 组件类） | busyming-skills-design |
| 错误日志管理 | [SKILL.md](../../运维管理/错误日志管理/SKILL.md) | 故障证据来源（错误日志指纹报表项引用） | busyming-skills-devops |
| 服务器监控 | [SKILL.md](../../运维管理/服务器监控/SKILL.md) | 故障证据来源（异常快照引用） | busyming-skills-devops |
| 黑灯工厂管理 | [SKILL.md](../../运维管理/黑灯工厂管理/SKILL.md) | 故障证据来源（工单引用）；自动化修复闭环与人工故障复盘的分工边界 | busyming-skills-devops |

## 页面功能概览

| 页面 | 原型 | 功能 |
|------|------|------|
| 故障列表 | [assets/web/fault-list.html](assets/web/fault-list.html) | KPI 卡（处理中 / 待复盘 / 逾期未复盘 / 本月新增）+ 筛选（状态 / 定级 / 发生日期 / 负责人 / 关键词）+ 故障表格（服务端分页，带数据更新时间戳）+ 登记入口；详见 [references/web-ui.md §故障列表](references/web-ui.md#故障列表) |
| 故障登记 / 编辑弹窗 | 同故障列表原型 | 标题、现象、影响范围、定级、发生 / 发现时间、负责人、关联项目；详情页进入为简版模式（隐藏定级与发生 / 发现时间）；详见 [references/web-ui.md §故障登记--编辑弹窗](references/web-ui.md#故障登记--编辑弹窗) |
| 故障详情 | [assets/web/fault-detail.html](assets/web/fault-detail.html) | 页头 + 生命周期步骤条 + 逾期警示 + 故障信息 + 处置过程记录 + 运维证据关联区（只读引用，不提供跳转）+ 复盘区（时间线 / 根因 / 处置回顾 / 改进措施 checklist）+ 状态操作（标记已恢复 / 提交复盘 / 打回 / 闭环确认）；详见 [references/web-ui.md §故障详情](references/web-ui.md#故障详情) |

## Tips

- 规则查找：状态流转、定级与复盘时限、证据与删除约束统一看 references/business-rule.md，字段口径看 references/data.md，不在本文件补写
- 页面类型：故障为工单类单据，列表取 `order-list`，详情取 `order-detail`（操作型，状态操作沉底操作栏）
- 原型只引用 design-system.css，不写私有样式；两页通过导航栏「原型页面」互联，详情页可切换处理中 / 待复盘 / 复盘中 / 已闭环四种状态演示
