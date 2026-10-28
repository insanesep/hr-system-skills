---
name: 需求SLA看板
description: 跨产品线与业务线查看审批时效、端到端周期、超时率、趋势和当前滞留需求，支持下钻及手动催办。Use when 调整 SLA 指标口径、筛选、图表、滞留需求表、导出或 SLA 看板 Web 原型。端型：Web + server。
metadata:
  domain: 研发
  clients: web,server
---

# 需求SLA看板

## 职责与边界

承载跨归属的审批时效横向对比、历史趋势与实时滞留压力，并提供需求下钻和手动催办。指标、可见范围、催办去重与统计导出的完整目标以共享 SLA 与权限规则为准，不因页面缺口取消。

本页不承载审批或阈值写操作：审批回 [需求工单管理](../需求工单管理/SKILL.md)，阈值维护归 [SLA规则配置](../SLA规则配置/SKILL.md)；单一归属的审批统计归 [需求审批配置](../需求审批配置/SKILL.md)。

## 菜单与关联页面

- 实际菜单路径：需求管理 / 需求SLA看板；应用路由 `/requirement/sla-dashboard`，route.name 与菜单资源码均为 `devhubRequirementSlaDashboard`。`/subapp/devhub` 为部署 base，不是路由名称。
- 时效卡片、图表与滞留需求表属于本页；指标下钻至需求列表的滞留视角，表格编号进入非菜单需求详情，右上「SLA 配置」进入同级规则配置页，不新建详情或弹窗目录。
- standalone 侧栏为「需求管理」平级分组，完整产品目标面包屑见 Web UI；筛选不入地址。手动催办是本页操作入口，权限与反馈沿用共享规则。App 无独立看板入口。

## 资料与资产

- 先读 [共享业务规则](../references/business-rule.md)、[权限规则](../references/permission-rules.md)、[审批时效与 SLA](../references/other-rule-sla.md)，指标真源为其 [SLA 仪表盘指标](../references/other-rule-sla.md#6-sla-仪表盘指标)。
- 时间与状态来源见 [审批流水数据](../references/data.md#4-审批流水) 和 [状态机](../references/state-machine.md)。
- 页面正文：[SLA 仪表盘页](references/web-ui.md#sla-仪表盘页)；共用 [Web 全局约定与跨页导航](../references/web-ui.md)。
- 资产目录 [assets/web/](assets/web/)，原型 [requirement-sla-dashboard.html](assets/web/requirement-sla-dashboard.html)；页面类型为 `report`。
- 只读实现真源：[路由](../../../busyming-devhub-web/src/router/index.ts)、[看板页面](../../../busyming-devhub-web/src/views/requirement/SlaDashboardView.vue)；其余依赖见 [分组入口](../SKILL.md#prerequisites)。
