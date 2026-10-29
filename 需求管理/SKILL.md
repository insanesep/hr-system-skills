---
name: 需求管理
description: 需求管理菜单分组的导航与共享资料入口。Use when 定位需求工单、审批配置、外链、SLA 看板或 SLA 规则配置的需求与原型，或查阅跨功能业务、状态、权限、数据及专题规则；具体功能正文由五个同级子 SKILL 承载。端型：Web + App（含公开 H5）+ server。
metadata:
  domain: 研发
  clients: web,app,server
---

# 需求管理

## 分组定位与功能索引

本目录对应 DevHub「需求管理」菜单分组，不是独立功能页面；仅维护下辖功能与共享资料指针，不复制页面正文。代码菜单与路由真源见 [前端路由](../../busyming-devhub-web/src/router/index.ts)，standalone 外壳见 [PortalLayout](../../busyming-devhub-web/src/layouts/PortalLayout.vue)。

| 菜单功能 | 功能入口 | 应用路由 | route.name / 菜单资源码 |
|----------|----------|----------|------------------------|
| 需求工单管理 | [SKILL.md](需求工单管理/SKILL.md) | `/requirement/list` | `devhubRequirementList` |
| 需求审批配置 | [SKILL.md](需求审批配置/SKILL.md) | `/requirement/config` | `devhubRequirementConfig` |
| 需求外链管理 | [SKILL.md](需求外链管理/SKILL.md) | `/requirement/public-link` | `devhubRequirementPublicLink` |
| 需求SLA看板 | [SKILL.md](需求SLA看板/SKILL.md) | `/requirement/sla-dashboard` | `devhubRequirementSlaDashboard` |
| SLA规则配置 | [SKILL.md](SLA规则配置/SKILL.md) | `/requirement/sla-config` | `devhubRequirementSlaConfig` |

五个菜单同级；详情与提交为需求工单管理的非菜单页面，公开 H5 与生成结果、配置弹窗归各功能。`/subapp/devhub` 是部署 base，不是路由名称或菜单层级。独立运行与微应用均按共享 Web UI 的菜单归属、完整面包屑及返回恢复规则导航；微应用外壳由门户提供。

## Prerequisites

| 共享资料 | 真源 |
|----------|------|
| 流程、产品线与角色、审批链、通知、缺陷分流、排期及 Qoder 承接 | [业务规则](references/business-rule.md) |
| 状态、级次、驳回重提、撤回与外部单差异 | [状态机](references/state-machine.md) |
| 菜单资源码、按钮权限、角色与数据可见范围 | [权限规则](references/permission-rules.md) |
| 需求、快照、流水、配置、外链、附件、SLA、AI、会话与审计 | [数据定义](references/data.md) |
| 三端附件上传、存储、追加与删除 | [附件规则](references/other-rule-attachment.md) |
| 催办、升级、目标日期预警、滞留与时效指标 | [审批时效与 SLA](references/other-rule-sla.md) |
| 触达红线、方案生成、确认与补材、per-PM 开关 | [AI 方案确认](references/other-rule-ai-plan.md) |
| 审批引擎、镜像、双向回写与语义差异 | [流程中心接入](references/other-rule-flow-center.md) |
| 外链与外部免登录提交 | [需求外链管理规则](需求外链管理/references/other-rule-public-link.md) |
| Web 全局语义、跨页导航与功能 UI 正文索引 | [Web 共享入口](references/web-ui.md) |
| App / 公开 H5 全局约定与两份正文索引 | [App 共享入口](references/app-ui.md) |

| 下游与外部依赖 | 职责与引用入口 |
|----------------|----------------|
| 功能排期与项目映射真源 | [功能排期管理](../研发管理/功能排期管理/SKILL.md)，项目映射见其 [业务规则 §9](../研发管理/功能排期管理/references/business-rule.md#9-项目归属与配置) |
| 缺陷修复单承接 | [黑灯工厂工单](../运维管理/黑灯工厂工单/SKILL.md) |
| 页面模板与原型样式 | [Web 模板](../../busyming-skills-design/templates/web/) / [移动模板](../../busyming-skills-design/templates/mobile/)；样式接入真源见 [设计入口](../../busyming-skills-design/SKILL.md) 与 [平台硬约束](../../busyming-skills-design/shared/platform-guidelines.md#2-平台硬约束) |
| 企微消息、异步导出、数据一致性、数据库定义、Qoder 与 OSS | busyming-skills-common 承载共享消息、导出、数据规则、Qoder 接入与对象存储能力；本模块引用公共能力，不复制其接口细节 |
| 流程中心、采购邀约、商品申请审批范式 | busyming-skills-system 承载流程中心审批流转；busyming-skills-procurement 承载采购邀约的 token 反查范式；busyming-skills-product 承载商品申请审批范式 |
| 任务中心与需求打磨规范 | 任务中心提供或签待办聚合与关闭规则；需求打磨规范提供提交描述引导依据 |

按专题查规则并进入相应功能阅读页面正文；共享规则定义跨功能逻辑，功能页面定义各菜单的交互要求。
