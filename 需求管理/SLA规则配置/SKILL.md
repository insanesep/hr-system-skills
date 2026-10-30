---
name: SLA规则配置
description: 维护需求审批催办、升级与去重阈值，按产品线、优先级和审批级次配置并初始化默认规则。Use when 调整 SLA 匹配、阈值校验、启停、默认初始化、配置筛选与分页或 SLA 规则 Web 原型。端型：Web + server。
metadata:
  domain: 研发
  clients: web,server
---

# SLA规则配置

## 职责与边界

承载催办阈值、升级阈值和去重窗口的配置维护、启停及默认规则初始化，保留匹配、校验、即时生效、分页与审计的完整目标，业务正文只引用共享 SLA 规则，不另建阈值逻辑。

本功能管「多久没审就催」，与 [需求审批配置](../需求审批配置/SKILL.md) 的「谁来审」同级独立，不合并为其 Tab。效果与滞留治理见 [需求SLA看板](../需求SLA看板/SKILL.md) 和 [需求工单管理](../需求工单管理/SKILL.md)。

## 菜单与关联页面

- 实际菜单路径：需求管理 / SLA规则配置；应用路由 `/requirement/sla-config`，route.name 与菜单资源码均为 `devhubRequirementSlaConfig`。`/subapp/devhub` 为部署 base，不是路由名称。
- 新增 / 编辑配置弹窗、启停与删除确认、初始化默认规则均属于本页，不新增菜单或详情目录；入口为独立侧边菜单或 SLA 看板的「SLA 配置」，提示条可前往同级审批配置。
- standalone 侧栏在「需求管理」下平级展示，完整产品目标面包屑与筛选地址同步见 UI 正文，不能写成代码已有能力。写权限由服务端按管理员口径校验，侧栏不自动按管理员过滤。App 无独立规则配置入口。

## Prerequisites

- [产研人员管理 · 参与关系](../../研发管理/产研人员管理/references/business-rule.md#membership)与[域及项目管理 · 责任关系](../../研发管理/域及项目管理/references/business-rule.md#responsibility)：仅供已有明确项目的产研审批人升级取数，其他情况及实施兜底沿用共享 SLA 规则。

## 资料与资产

- 先读 [共享业务规则](../references/business-rule.md)、[权限规则](../references/permission-rules.md)、[审批时效与 SLA](../references/other-rule-sla.md)，差异化配置真源见其 [第 3 节](../references/other-rule-sla.md#3-差异化配置)。
- 字段与状态见 [SLA 配置数据](../references/data.md#8-sla-配置)、[状态机](../references/state-machine.md)；流程中心催办分工见 [流程中心接入](../references/other-rule-flow-center.md)。
- 页面正文：[SLA 配置页](references/web-ui.md#sla-配置页)；共用 [Web 全局约定与跨页导航](../references/web-ui.md)。
- 资产目录 [assets/web/](assets/web/)，原型 [requirement-sla-config.html](assets/web/requirement-sla-config.html)。
- 只读实现真源：[路由](../../../busyming-devhub-web/src/router/index.ts)、[规则配置页面](../../../busyming-devhub-web/src/views/requirement/SlaConfigView.vue)；其余依赖见 [分组入口](../SKILL.md#prerequisites)。
