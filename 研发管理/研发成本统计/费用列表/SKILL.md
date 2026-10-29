---
name: 费用列表
description: Use when 需要查询或新增研发费用单、编辑品牌分摊明细、查看费用构成，或执行审核、作废、删除。覆盖研发成本统计的费用列表及其非菜单费用明细新增 / 编辑 / 查看页，仅 Web 端。
metadata:
  domain: 研发
  clients: web
---

# 费用列表

## 职责定位

在「研发管理 → 研发成本统计 → 费用列表」管理研发费用单的录入、查询、品牌分摊与单据流转，支持追溯每笔费用的归属期间及品牌承担金额。费用归集、分摊和报表衔接遵循[共享业务规则](../references/business-rule.md)，不在本功能另立规则口径。

## 菜单入口与独立操作页

| 页面 | 路由 | 归属 |
|---|---|---|
| 费用列表 | `/rnd/dev-cost/list` | 本功能唯一菜单入口 |
| 费用明细（新增） | `/rnd/dev-cost/create` | 列表「新增费用」进入的非菜单操作页 |
| 费用明细（编辑） | `/rnd/dev-cost/edit/:id` | 列表行内「编辑」进入的非菜单操作页 |
| 费用明细（查看） | `/rnd/dev-cost/detail/:id` | 列表行内「查看」进入的非菜单只读页 |

费用明细的新增 / 编辑 / 查看共用表单页面，保存成功或点击返回回到费用列表；页面区块、校验与反馈以[费用明细 UI](references/web-ui.md#费用明细)为准。品牌成本透视查询归[品牌成本报表](../品牌成本报表/SKILL.md)。

## 权限与单据状态

- 路由权限：`MENU:RND:DEV_COST`，覆盖费用列表及其费用明细操作页，与品牌成本报表共用。
- 制单权限：`BTN:DEV_COST:CREATE`，覆盖新增、编辑、删除与表单保存；审核权限：`BTN:DEV_COST:AUDIT`，覆盖审核与作废。职责分离与按钮可用性以[权限与操作矩阵](../references/business-rule.md#4-权限与操作矩阵)为准。
- 单据业务状态为「待审核 / 已审核 / 已作废」；流转、可用动作、只读约束及终止规则以[单据状态机](../references/business-rule.md#1-单据状态机)为准。

## 资料真源

- [业务规则](../references/business-rule.md)：费用字段、品牌分摊、尾差、单据流转与权限。
- [数据模型](../references/data-model.md)：费用单及品牌分摊明细的产品字段与枚举。
- [费用列表 UI](references/web-ui.md#费用列表)与[费用明细 UI](references/web-ui.md#费用明细)：本功能完整页面描述。
- 原型：[费用列表](assets/web/cost-list.html)、[费用明细](assets/web/cost-detail.html)。
- [分组 UI 索引](../references/web-ui.md)与[共享前端页面约束](../SKILL.md#prerequisites)。
