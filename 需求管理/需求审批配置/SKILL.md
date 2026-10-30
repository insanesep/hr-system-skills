---
name: 需求审批配置
description: 按产品线、业务线和提交对象维护专属链、默认链、审批级次与或签审批人，维护企微群映射并查看审批统计。Use when 调整审批链配置、提交对象候选来源、AI 辅助开关、流程中心镜像或审批配置 Web 页面。端型：Web + server。
metadata:
  domain: 研发
  clients: web,server
---

# 需求审批配置

## 职责与边界

维护需求归属下的专属审批链、默认链与群消息映射，承载归属审批统计和产品经理粒度的 AI 辅助配置。匹配、快照、权限、统计导出与流程中心镜像均以共享规则为准；配置页面未呈现的目标能力仍保留，不另编审批逻辑。

本功能只管「谁来审」，SLA 阈值另归 [SLA规则配置](../SLA规则配置/SKILL.md)；需求提交时的链预览及实际审批处理归 [需求工单管理](../需求工单管理/SKILL.md)。

## 菜单与关联页面

- 实际菜单路径：需求管理 / 需求审批配置；应用路由 `/requirement/config`，route.name 与菜单资源码均为 `devhubRequirementConfig`。
- `/subapp/devhub` 是部署 base，不是路由名称。standalone 侧栏在「需求管理」分组下平级展示，只有当前页单标题，不存在完整可点击面包屑。
- 产品线与业务线 Tab、群消息 inline 编辑、新增 / 编辑配置弹窗、启停与删除确认均属于本页，不新增菜单或详情目录；Tab 地址同步与产品目标面包屑见 UI 正文。
- 服务端按共享权限规则校验管理员与操作权限；standalone 侧栏不自动按管理员过滤菜单，不能把「仅管理员操作」写成代码已有的菜单隐藏。App 无独立配置入口。

## Prerequisites

- [产研人员管理](../../研发管理/产研人员管理/SKILL.md) · [身份](../../研发管理/产研人员管理/references/business-rule.md#identity) · [权限边界](../../研发管理/产研人员管理/references/permission-rules.md#boundaries)：产研职责候选；非产研审批人仍引用公共用户，既有链与快照不自动改写。

## 资料与资产

- 先读 [业务规则 · 审批链配置](../references/business-rule.md#3-审批链配置规则)、[权限规则](../references/permission-rules.md)、[数据定义 · 审批链配置](../references/data.md#5-审批链配置) 与 [状态机](../references/state-machine.md)。
- AI 配置见 [AI 方案确认 · per-PM 开关](../references/other-rule-ai-plan.md#8-per-pm-开关)；任何配置变更须按 [流程中心镜像纪律](../references/other-rule-flow-center.md#6-配置镜像同步纪律) 同步并回归。
- 页面正文：[审批链配置页](references/web-ui.md#审批链配置页)；共用 [Web 全局约定与跨页导航](../references/web-ui.md)。
- 资产目录 [assets/web/](assets/web/)，原型 [requirement-config.html](assets/web/requirement-config.html)。
- 只读实现真源：[路由](../../../busyming-devhub-web/src/router/index.ts)、[配置页面](../../../busyming-devhub-web/src/views/requirement/RequirementConfigView.vue)；其余依赖见 [分组入口](../SKILL.md#prerequisites)。
