---
name: 品牌成本报表
description: Use when 需要按品牌、费用科目与年月透视查询研发成本，查看期间费用总额、分摊品牌数、涉及费用单数及行列合计。归属研发成本统计的只读报表菜单，仅 Web 端。
metadata:
  domain: 研发
  clients: web
---

# 品牌成本报表

## 职责定位

在「研发管理 → 研发成本统计 → 品牌成本报表」提供多品牌研发成本透视查询，支持费用期间、科目与品牌筛选，以及品牌行叠加科目的成本分析。统计与逐月分摊口径统一引用[报表统计规则](../references/business-rule.md#5-报表统计口径)。

## 菜单入口与页面归属

- 菜单路由：`/rnd/dev-cost/report`。
- 本菜单为只读透视页；查询、重置、叠加科目维度、KPI 与行列合计均属于本页，无下钻或独立操作页。
- 费用制单、审核、作废及费用明细新增 / 编辑 / 查看独立操作页归[费用列表](../费用列表/SKILL.md)，不归报表菜单。

## 权限

- 路由权限：`MENU:RND:DEV_COST`，与费用列表及其费用明细页共用。
- 报表只读，无额外按钮权限点；权限边界见[权限与操作矩阵](../references/business-rule.md#4-权限与操作矩阵)。

## 资料真源

- [业务规则](../references/business-rule.md)：费用归集、品牌分摊、状态、期间及报表统计口径。
- [数据模型](../references/data-model.md)：费用单、品牌分摊明细及枚举。
- [品牌成本报表 UI](references/web-ui.md#品牌成本报表)：完整区块、导航与交互反馈。
- [品牌成本报表原型](assets/web/cost-report.html)。
- [分组 UI 索引](../references/web-ui.md)与[共享前端页面约束](../SKILL.md#prerequisites)。
