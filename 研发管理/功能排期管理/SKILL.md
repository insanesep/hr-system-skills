---
name: 功能排期管理
description: 研发排期工作台：启用中项目的 harness 工程仓 git commit 自动生成排期卡片，PM 把卡片从待排期池拖到月历排期，跟踪待开发、开发中、开发完成与延期，研发发现需求问题时转待澄清、产品以修订 commit 完成澄清并自动合并，并维护项目映射真源；全部能力经 DevHub MCP 开放给产品与研发的 agent。待排期池与非需求改动列表按页查询，卡片以项目色标签标识归属。Use when 需要把 harness 工程仓提交转为排期卡片并按日排期, 需要跟踪卡片领取、完成与延期状态, 需要把有问题的需求卡转待澄清或完成、撤回澄清, 需要为开发完成卡关联完成 commit 回执, 需要合并同模块卡片或把非需求改动移出排期, 需要维护项目与 harness 工程、代码服务仓的映射, 需要调整待排期池与非需求改动列表的分页或卡片项目标识, 需要让 agent 经 MCP 查询或操作排期卡片。端型：Web + server + MCP。
metadata:
  domain: 研发
  clients: web,server,mcp
---

# 功能排期管理

## 模块概述

面向产品与研发管理人员的排期工具：启用中项目的 harness 工程仓每个 commit 自动生成一张待开发卡片进入待排期池，PM 拖拽卡片到月历排期，按待开发 / 开发中 / 开发完成跟踪进度，延期自动呈现，完成时可关联完成 commit，让排期与真实交付一一对应。研发发现需求有问题无法开发时，填写澄清问题把卡片转为待澄清并移出排期；产品修订需求文档提交后，以修订 commit 完成澄清，修订卡与原卡自动合并并回到待排期池。待排期池与非需求改动列表按页浏览，卡片以项目色标签标识归属。卡片按源仓归属项目，本模块的项目配置是项目映射的唯一真源。全部能力经 DevHub MCP 开放，产品与研发的 agent 与 PC 同权同规则。

## 端

- **web**：研发排期工作台与卡片详情页，位于「研发 / 研发管理 / 功能排期管理」，仅桌面端使用，不提供 App 入口
- **server**：源仓 commit 采集出卡，无前端
- **mcp**：DevHub MCP 工具，按能力分组供令牌勾选，规则见 [references/other-rule-mcp.md](references/other-rule-mcp.md)

## When to Use

- 新增或调整 commit 出卡、拖拽排期、延期判定等排期规则
- 调整卡片状态流转、完成 commit 回执或非需求改动旁路
- 调整需求澄清的发起、完成与撤回，或澄清完成时的自动合并
- 调整合并卡、搜索筛选、统计口径或待排期池行为
- 调整待排期池、非需求改动列表的分页，或卡片项目标签与配色
- 维护项目与 harness 工程、代码服务仓的映射，或评估映射对下游的影响
- 新增或调整排期能力对应的 MCP 工具、能力分组与权限
- 生成或复核研发排期工作台、卡片详情页原型

## Prerequisites

| 引用资源 | 路径 | 用途 | 所属仓库 |
|---------|------|------|---------|
| 业务规则 | [references/business-rule.md](references/business-rule.md) | 出卡、排期、发版日、统计、搜索筛选、待排期池、合并卡、项目归属与配色、非需求改动列表、需求澄清 | 本模块 |
| 状态机 | [references/state-machine.md](references/state-machine.md) | 状态枚举、流转、延期判定、锁定守卫 | 本模块 |
| 字段规则 | [references/field-rules.md](references/field-rules.md) | 编号、标题、负责人、排期日期、需求性质、业务对接人、完成 commit、项目字段、澄清问题、修订 commit、撤回理由 | 本模块 |
| 权限规则 | [references/permission-rules.md](references/permission-rules.md) | 菜单与按钮权限编码、无权限时的入口表现、服务端校验 | 本模块 |
| 数据定义 | [references/data.md](references/data.md) | 卡片、完成回执、合并明细、流水、发版日、项目、澄清记录 | 本模块 |
| Web 页面 | [references/web-ui.md](references/web-ui.md) | 工作台与卡片详情页的区块元素、导航、操作反馈与表单校验 | 本模块 |
| MCP 能力 | [references/other-rule-mcp.md](references/other-rule-mcp.md) | 能力分组、工具清单与权限对应、调用约束、需求澄清的 agent 约定 | 本模块 |
| 页面模板 | [order-list.html](../../../busyming-skills-design/templates/web/order-list.html) | 研发排期工作台 `order-list` 的整页范例 | busyming-skills-design |
| 页面模板 | [order-detail.html](../../../busyming-skills-design/templates/web/order-detail.html) | 卡片详情页 `order-detail` 的整页范例 | busyming-skills-design |
| 原型样式入口 | [templates.css](../../../busyming-skills-design/templates/web/templates.css)（+ [pc.css](../../../busyming-skills-design/components/web/tokens/pc.css)、[runtime.css](../../../busyming-skills-design/docs-site/pc/runtime.css)） | 原型样式链：`components/web/tokens/pc.css` → `docs-site/pc/runtime.css` → `docs-site/ep-base-shim.css` → `templates/web/templates.css`，与 registry/prototype.json 中 PC 组件的样式清单一致 | busyming-skills-design |
| 功能使用情况分析 | [SKILL.md](../功能使用情况分析/SKILL.md) | 埋点登记：菜单权限、功能目录与前端路由三处一并登记 | busyming-skills-devops |
| 需求管理 | [business-rule.md §5](../../需求管理/references/business-rule.md#5-排期关联规则) | 需求单单向关联卡片；业务对接人为空时的提交人兜底来源 | busyming-skills-devops |
| 企微个人消息 | [需求管理 business-rule.md §4](../../需求管理/references/business-rule.md#4-通知与企微推送) | 澄清发起、完成与撤回通知；与需求管理共用 DevHub 企微应用消息通道，事务提交后异步推送，失败不回滚 | busyming-skills-devops |
| 平台能力 | [SKILL.md](../../平台能力/SKILL.md) | 个人令牌生成、能力分组勾选与调用审计 | busyming-skills-devops |
| 仓库访问契约 | [DevhubGitClient.java](../../../busyming-devhub/busyming-devhub-api/src/main/java/io/busyming/basic/devhub/api/facade/DevhubGitClient.java) | 通用 Git 的分支、commit 查询与统计契约，项目选仓同时保留云效 Codeup | busyming-devhub |
| 菜单与角色 | system 菜单管理与角色配置；权限编码以生效菜单管理数据为准 | 权限编码与角色授予 | busyming-skills-system |

下游引用方（以本模块为真源）：

| 模块 | 路径 | 引用内容 |
|------|------|---------|
| 研发报告共享数据源 | [data-source-api.md](../../研发报告/报告配置/references/data-source-api.md) | 卡片、流水、非需求改动、发版日 |
| 项目进度报告 | [SKILL.md](../../研发报告/项目进度报告/SKILL.md) | 项目映射、卡片状态 |
| 报告配置 | [SKILL.md](../../研发报告/报告配置/SKILL.md) | 项目映射（报告项目扩展只读引用本模块项目配置，扩展维护项目 key / 分支策略） |
| 黑灯工厂管理 | [SKILL.md](../../运维管理/黑灯工厂工单/SKILL.md) | 项目映射定位 harness 工程与代码仓 |
| 需求管理 | [business-rule.md §5](../../需求管理/references/business-rule.md#5-排期关联规则) | 关联卡片的状态（含待澄清）与候选卡片 |
| 自动分配与领取任务 | [SKILL.md](../../../busyming-skills-common/agent/MCP/auto-claim-tasks/SKILL.md) | 排期 MCP 工具、待分配口径与澄清后的编号续接 |

## 页面功能概览

| 页面 | 原型 | 功能 |
|------|------|------|
| 研发排期工作台 | [assets/web/feature-schedule.html](assets/web/feature-schedule.html) | 指挥栏、分页待排期池、月 / 周 / 列表视图、筛选抽屉、合并与配置弹层、待澄清入口与待澄清列表弹层、转待澄清与澄清处理弹窗；卡片带项目色标签；详见 [references/web-ui.md §研发排期工作台](references/web-ui.md#研发排期工作台) |
| 卡片详情页 | [assets/web/feature-schedule-detail.html](assets/web/feature-schedule-detail.html) | 页头与业务提示、开发进度、关键摘要，基本信息 / 子卡明细 / 完成 commit / 澄清记录 / 操作日志页签，页头右上角操作区与编辑、排期、标记完成、回退、转待澄清、完成澄清、撤回澄清弹窗；详见 [references/web-ui.md §卡片详情页](references/web-ui.md#卡片详情页) |

## Tips

- 查规则先按类型定位：状态问题看 state-machine.md，字段取值看 field-rules.md，MCP 看 other-rule-mcp.md，其余看 business-rule.md，不在本文件补写规则
- 需求澄清的发起、自动合并与撤回见 business-rule.md §11；澄清完成后卡片以新合并卡编号继续流转，调整合并规则时同步核对 §11.3
- 页面类型：工作台取 `order-list`，排期看板没有专用模板，按工单类单据列表对齐，月视图、周视图是同一列表的展示形态；卡片详情取 `order-detail`，状态流转与危险操作集中到页头右上角操作区
- 调整项目映射前先读 business-rule.md §9 的归属解析与不做快照取舍，并核对下游引用方
- 项目标签配色与未归属兜底见 field-rules.md §9，调色板与循环规则见 business-rule.md §9
- 需求性质的写入来源见 field-rules.md §6
- 卡片视觉取设计系统组件与状态语义，原型只引用 design-system.css，不写私有样式
- 两页原型共用 `assets/web/feature-schedule-data.js` 的会话内演示数据，导航栏「原型页面」切换页面、演示卡片与整页状态
