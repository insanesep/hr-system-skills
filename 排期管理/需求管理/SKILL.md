---
name: 需求管理
description: 需求受理与多级审批归集：内部员工选定提交对象（产品经理）后按其审批链逐级或签审批，功能需求通过后关联排期卡片并生成 Qoder 开发会话，缺陷修复单自动分流黑灯工厂；有点推荐另支持一次性外链免登录提交。Use when 需要调整需求提交、审批链匹配或状态流转规则, 需要调整排期关联、缺陷分流或 Qoder 会话承接, 需要维护外链邀约与外部提交口径, 需要调整附件、审批时效 SLA 或 AI 方案确认规则, 需要生成或复核需求管理 Web / App / 公开 H5 原型。端型：Web + App（含公开 H5）+ server。
metadata:
  domain: 研发
  clients: web,app,server
---

# 需求管理

## 模块概述

面向全公司业务线的需求受理中枢：内部员工先选定提交对象（产品经理），系统按其专属审批链逐级或签审批；功能需求审批通过后由产品经理关联功能排期卡片，并生成 Qoder 开发会话承接实施；缺陷修复单是人工报 bug 的唯一入口，审批通过后自动转黑灯工厂。需求按鸣鸣很忙、有点推荐两条产品线分治，有点推荐另可由内部人发放一次性外链，让外部人员免登录提交。解决需求散落在企微群与 Excel、看不清「谁提的、卡在哪级、排没排上开发」的问题。

## 端

- **web**：「研发 / 需求管理」下 5 个菜单共 7 页，承担提交与草稿、审批、排期关联、外链、审批链与 SLA 配置、统计导出，为主操作端
- **app**：App 员工端 3 页（轻量提交、审批、进度查看，仅图片附件）；公开 H5 3 页（外部人凭外链免登录提交，单向收口）
- **server**：SLA 定时扫描催办、AI 方案生成、流程中心事件回写、黑灯工厂建单与 Qoder 会话生成，无前端

## When to Use

- 调整需求提交、审批链匹配、或签与快照、状态流转规则
- 调整排期关联、缺陷修复分流黑灯工厂或 Qoder 开发会话承接
- 维护有点推荐外链邀约、外部提交字段与单向收口口径
- 调整附件上传、审批时效 SLA 催办或 AI 方案确认规则
- 生成或复核需求管理 Web、App 与公开 H5 原型

## Prerequisites

| 引用资源 | 路径 | 用途 | 所属仓库 |
|---------|------|------|---------|
| 业务规则 | [references/business-rule.md](references/business-rule.md) | 流程总览、产品线与角色、缺陷分流、审批链配置、通知、排期关联与 Qoder 会话、操作概要 | 本模块 |
| 状态机 | [references/state-machine.md](references/state-machine.md) | 状态枚举与流转、级次递进、驳回重提、撤回、外部单差异 | 本模块 |
| 权限规则 | [references/permission-rules.md](references/permission-rules.md) | 权限编码、角色操作、数据可见范围、审批权限校验 | 本模块 |
| 数据定义 | [references/data.md](references/data.md) | 需求、审批快照与流水、审批链配置、外链、附件、SLA 配置、AI 方案、会话与审计 | 本模块 |
| 外链邀约 | [references/other-rule-public-link.md](references/other-rule-public-link.md) | 一次性外链、外部提交字段、防刷、单向收口与统计 | 本模块 |
| 附件管理 | [references/other-rule-attachment.md](references/other-rule-attachment.md) | 三端上传限制、存储、审批中追加、H5 附件与删除 | 本模块 |
| 审批时效与 SLA | [references/other-rule-sla.md](references/other-rule-sla.md) | 催办、升级、目标日期预警、滞留看板、仪表盘指标、去重与定时扫描 | 本模块 |
| AI 方案确认 | [references/other-rule-ai-plan.md](references/other-rule-ai-plan.md) | 产品确认节点 AI 辅助的红线、触发、七步框架、确认与补材 | 本模块 |
| 流程中心接入 | [references/other-rule-flow-center.md](references/other-rule-flow-center.md) | 外部表单接入、审批链镜像、双向同步与语义差异 | 本模块 |
| Web 页面 | [references/web-ui.md](references/web-ui.md) | Web 7 页区块、导航、操作反馈与表单校验 | 本模块 |
| App 页面 | [references/app-ui.md](references/app-ui.md) | App 员工端 3 页与公开 H5 3 页 | 本模块 |
| 功能排期 | [SKILL.md](../功能排期/SKILL.md) | 排期卡片状态与候选卡片；项目映射真源见其 [business-rule.md §9](../功能排期/references/business-rule.md#9-项目归属与配置) | busyming-skills-devops |
| 黑灯工厂管理 | [SKILL.md](../../运维管理/黑灯工厂管理/SKILL.md) | 缺陷修复单建单口径与工单状态回传 | busyming-skills-devops |
| 页面模板 | [web/templates](../../../busyming-skills-design/web/templates/) · [mobile/templates](../../../busyming-skills-design/mobile/templates/) | 页面类型取值与整页范例 | busyming-skills-design |
| 原型样式入口 | [web](../../../busyming-skills-design/web/styles/design-system.css) · [mobile](../../../busyming-skills-design/mobile/styles/design-system.css) 的 design-system.css | 原型唯一样式入口与组件类 | busyming-skills-design |
| 企微消息、导出接入、数据一致性、数据库定义、Qoder 与 OSS 第三方能力 | 公共仓未迁入真源（agent、api、sdk、data 目录仅有占位） | 个人与群机器人推送；列表、统计与 SLA 明细异步导出；统计口径；实体表结构；开发会话与附件存储 | busyming-skills-common |
| 流程中心 | system 仓未迁入文档 | 审批流转引擎（外部表单模式） | busyming-skills-system |
| 采购邀约 | procurement 仓未迁入文档 | 免登录外链范式 | busyming-skills-procurement |
| 商品申请审批流程 | product 仓未迁入文档 | 多级审批范式参考 | busyming-skills-product |
| 任务中心、需求打磨规范 | 未迁入，归属仓待确认 | 或签待办聚合参考；提交表单描述引导文案依据 | 待确认 |

## 页面功能概览

| 端 | 页面 | 页面类型 | 原型 | 功能 |
|----|------|---------|------|------|
| web | [需求列表页](references/web-ui.md#需求列表页) | `order-list` | [requirement-list.html](assets/web/requirement-list.html) | KPI、五视角、多维筛选、导出与滞留催办 |
| web | [需求详情页](references/web-ui.md#需求详情页) | `order-detail` | [requirement-detail.html](assets/web/requirement-detail.html) | 需求信息、附件、AI 方案、审批时间线、排期或工单回传与审批操作 |
| web | [需求提交页](references/web-ui.md#需求提交页) | `order-form` | [requirement-submit.html](assets/web/requirement-submit.html) | 新增与编辑、提交对象与审批链预览、附件上传 |
| web | [外链管理页](references/web-ui.md#外链管理页) | `order-list` | [requirement-public-link.html](assets/web/requirement-public-link.html) | 外链生成、台账、二维码与撤销 |
| web | [审批链配置页](references/web-ui.md#审批链配置页) | `archive-list` | [requirement-config.html](assets/web/requirement-config.html) | 归属 Tab、群消息映射、专属链与默认链、AI 开关、审批统计 |
| web | [SLA 配置页](references/web-ui.md#sla-配置页) | `archive-list` | [requirement-sla-config.html](assets/web/requirement-sla-config.html) | 催办与升级阈值、去重窗口维护 |
| web | [SLA 仪表盘页](references/web-ui.md#sla-仪表盘页) | `report` | [requirement-sla-dashboard.html](assets/web/requirement-sla-dashboard.html) | 时效指标、业务线对比与趋势 |
| app | [我的需求列表](references/app-ui.md#我的需求列表) | `list` | [requirement-list.html](assets/app/requirement-list.html) | 三视角卡片列表 |
| app | [需求详情](references/app-ui.md#需求详情) | `detail` | [requirement-detail.html](assets/app/requirement-detail.html) | 只读详情、审批与 AI 方案操作 |
| app | [需求提交](references/app-ui.md#需求提交) | `form` | [requirement-submit.html](assets/app/requirement-submit.html) | 精简提交与图片上传 |
| app · H5 | [需求提交页](references/app-ui.md#需求提交页) | `form` | [requirement-public-submit.html](assets/app/requirement-public-submit.html) | 外部人免登录提交与预览确认 |
| app · H5 | [提交成功页](references/app-ui.md#提交成功页) / [链接失效页](references/app-ui.md#链接失效页) | `detail` | [requirement-public-result.html](assets/app/requirement-public-result.html) | 提交凭证与四类失效形态 |

## Tips

- 查规则先按类型定位：状态看 state-machine.md，权限看 permission-rules.md，字段看 data.md，外链、附件、SLA、AI、流程中心看对应 other-rule 文件，其余看 business-rule.md；不在本文件补写规则
- 审批链配置的任何变更都要同步流程中心镜像并回归，见 [other-rule-flow-center.md §6](references/other-rule-flow-center.md#6-配置镜像同步纪律)
- 需求描述质量直接影响 L1 驳回率，提交页描述引导文案须与需求打磨规范同步更新
- 菜单名称、路由与权限编码以生产菜单管理为准，页面标题与面包屑取菜单名称
- SLA 仪表盘没有看板模板，页面类型取 `report`；公开 H5 的提交成功页与链接失效页取 `detail`
