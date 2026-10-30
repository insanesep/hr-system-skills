---
name: 需求工单管理
description: 内部需求提交与草稿、工单列表和详情、逐级或签审批、排期关联及缺陷分流的功能入口。Use when 调整需求工单提交、审批、进度查看、附件、AI 方案确认、导出或 Web / App 页面；审批链、外链与 SLA 配置分别查同级功能。端型：Web + App + server。
metadata:
  domain: 研发
  clients: web,app,server
---

# 需求工单管理

## 职责与边界

承载内部需求的提出、草稿与驳回重提、审批处理和进度查看，以及内部人员对外部提交单的查阅与审批。功能类需求的排期关联、Qoder 开发会话承接和缺陷修复单分流黑灯工厂，按共享业务规则执行；不另建状态机或复制审批匹配规则。

附件、AI 方案确认、流程中心接入、候选排期卡片、导出、分页和通知均按共享规则执行。审批链配置、外链邀约和 SLA 看板及配置各归同级功能。

## 菜单与关联页面

| 页面 | 实际应用路由 | route.name | 菜单归属 |
|------|--------------|------------|----------|
| 需求列表 | `/requirement/list` | `devhubRequirementList` | 需求管理 / 需求工单管理 |
| 需求详情 | `/requirement/detail/:id` | `devhubRequirementDetail` | 非菜单页面，归本功能 |
| 需求提交、草稿编辑、驳回重提 | `/requirement/submit`；编辑与重提以 `?id=` 直达 | `devhubRequirementSubmit` | 非菜单页面，归本功能 |

菜单资源码为 `devhubRequirementList`，不得用它替代详情或提交的 route.name。`/subapp/devhub` 是部署 base，不是路由名称或菜单层级。「需求管理」下的五个菜单同级，完整面包屑与返回恢复要求见共享 Web UI。

通过、驳回、关联排期、AI 确认与补材等弹窗归需求详情；App 的审批半屏、图片浏览器和方案全文只读子页仍归本功能，不建立菜单目录。App 工作台入口的资源码为 `devhubAppRequirement` / `devhubAppRequirementM`，不以 Web route.name 替代。公开 H5 表单与结果形态归 [需求外链管理](../需求外链管理/SKILL.md)。

## Prerequisites

- [产研人员管理](../../研发管理/产研人员管理/SKILL.md) · [身份](../../研发管理/产研人员管理/references/business-rule.md#identity) · [参与关系](../../研发管理/产研人员管理/references/business-rule.md#membership)：产研候选与身份只读消费。
- [域及项目管理](../../研发管理/域及项目管理/SKILL.md) · [清单](../../研发管理/域及项目管理/references/business-rule.md#source) · [执行映射](../../研发管理/域及项目管理/references/business-rule.md#execution-mapping)：归属引用与开发会话范围。

## 资料与资产

- 先读 [共享业务规则](../references/business-rule.md)、[权限规则](../references/permission-rules.md)、[状态机](../references/state-machine.md) 与 [数据定义](../references/data.md)。
- 附件见 [附件规则](../references/other-rule-attachment.md)；AI 见 [AI 方案确认](../references/other-rule-ai-plan.md)；审批引擎与回写见 [流程中心接入](../references/other-rule-flow-center.md)；滞留与催办见 [SLA 公共规则](../references/other-rule-sla.md)。
- 页面正文：[Web 列表、详情与提交](references/web-ui.md)；[App 员工端三页](references/app-ui.md#app-员工端)。共享视觉语义与跨页导航见 [Web 共享 UI](../references/web-ui.md) 和 [App 共享 UI](../references/app-ui.md)。
- Web 资产目录 [assets/web/](assets/web/)：[列表](assets/web/requirement-list.html)、[详情](assets/web/requirement-detail.html)、[提交](assets/web/requirement-submit.html)；App 资产目录 [assets/app/](assets/app/)：[列表](assets/app/requirement-list.html)、[详情](assets/app/requirement-detail.html)、[提交](assets/app/requirement-submit.html)。
- 只读实现真源：[路由](../../../busyming-devhub-web/src/router/index.ts)、[列表](../../../busyming-devhub-web/src/views/requirement/RequirementListView.vue)、[详情](../../../busyming-devhub-web/src/views/requirement/RequirementDetailView.vue)、[提交](../../../busyming-devhub-web/src/views/requirement/RequirementSubmitView.vue)。
- 下游与外部依赖统一见 [分组入口](../SKILL.md#prerequisites)，提交页描述引导须与需求打磨规范保持一致。
