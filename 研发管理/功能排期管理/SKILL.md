---
name: 功能排期管理
description: 研发排期工作台。Use when 把源仓提交生成单张排期卡、维护排期领取完成与延期、发起或处理需求澄清、关联完成commit、合并卡片或移出非需求改动、按项目查询卡片或经MCP维护排期。项目、Git仓库、环境信息与成员统计范围引用项目管理；卡片项目按源仓匹配启用项目查询投影，排期账号及权限沿用公共系统规则。端型：Web + server + MCP。
metadata:
  domain: 产研
  clients: web,server,mcp
---

# 功能排期管理

## 模块概述

以源仓提交生成排期卡片，产品安排排期，研发领取并交付，支持需求澄清、合并与非需求改动旁路；卡片、回执和流程事实由本功能维护。项目、Git 仓库、环境信息与项目成员唯一归属「研发管理 / 项目管理」；报告人员范围由选定项目的成员管理定义，本功能只读消费，不提供配置表单。

## 端

Web：排期工作台、独立卡片详情。server：源仓采集与流程守卫。MCP：按实际登记工具与持有人权限操作；无 App 入口。

## When to Use

- 调整出卡、排期、延期、分页与筛选规则。
- 维护领取、完成、回执、合并与非需求改动。
- 发起、完成或撤回需求澄清。
- 生成或复核排期页面，核对 MCP 与 Web 同规则。

## Prerequisites

| 引用资源 | 路径 | 用途 | 所属仓库 |
|---------|------|------|---------|
| 业务规则 | [references/business-rule.md](references/business-rule.md) | 出卡、排期、发版日、统计、搜索筛选、待排期池、合并卡、项目归属消费与配色、非需求改动列表、需求澄清 | 本模块 |
| 状态机 | [references/state-machine.md](references/state-machine.md) | 状态枚举、流转、延期判定、锁定守卫 | 本模块 |
| 字段规则 | [references/field-rules.md](references/field-rules.md) | 编号、标题、负责人、排期日期、需求性质、业务对接人、完成 commit、项目字段只读引用、澄清问题、修订 commit、撤回理由 | 本模块 |
| 权限规则 | [references/permission-rules.md](references/permission-rules.md) | 菜单与按钮权限编码、基础配置边界、无权限时的入口表现、服务端校验 | 本模块 |
| 数据定义 | [references/data.md](references/data.md) | 卡片、完成回执、合并明细、流水、发版日、项目归属投影、成员只读引用、澄清记录 | 本模块 |
| Web 页面 | [references/web-ui.md](references/web-ui.md) | 工作台与卡片详情页的区块元素、导航、操作反馈与表单校验 | 本模块 |
| MCP 能力 | [references/other-rule-mcp.md](references/other-rule-mcp.md) | 能力分组、工具清单与权限对应、调用约束、需求澄清的 agent 约定 | 本模块 |
| 页面编排标准 | [web-operation-list.md](../../../busyming-skills-design/shared/page-standards/web-operation-list.md) | 研发排期工作台的区域编排 | busyming-skills-design |
| 页面编排标准 | [web-detail.md](../../../busyming-skills-design/shared/page-standards/web-detail.md) | 卡片详情页的区域编排 | busyming-skills-design |
| 原型样式入口 | [templates.css](../../../busyming-skills-design/shared/prototype/web/templates.css)（+ [pc.css](../../../busyming-skills-design/components/web/tokens/pc.css)、[runtime.css](../../../busyming-skills-design/docs-site/pc/runtime.css)） | 原型样式链：`components/web/tokens/pc.css` → `docs-site/pc/runtime.css` → `docs-site/ep-base-shim.css` → `shared/prototype/web/templates.css`，与 registry/prototype.json 中 PC 组件的样式清单一致 | busyming-skills-design |
| 项目管理 | [SKILL.md](../项目管理/SKILL.md) | 人工项目、harness 工程与代码服务仓、Git 配置、环境信息及项目成员唯一真源；本模块只读消费 | busyming-skills-devops |
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
| 项目进度报告 | [SKILL.md](../../研发报告/项目进度报告/SKILL.md) | 卡片状态与流水；项目及成员映射引用项目管理 |
| 报告配置 | [SKILL.md](../../研发报告/报告配置/SKILL.md) | 排期卡片与发版日事实；项目映射及人员统计范围引用项目管理 |
| 需求管理 | [business-rule.md §5](../../需求管理/references/business-rule.md#5-排期关联规则) | 关联卡片的状态（含待澄清）与候选卡片 |
| 自动分配与领取任务 | [SKILL.md](../../../busyming-skills-common/agent/MCP/auto-claim-tasks/SKILL.md) | 排期 MCP 工具、待分配口径与澄清后的编号续接 |

## 页面功能概览

| 页面 | 资产 | 职责 |
| --- | --- | --- |
| 排期工作台 | [feature-schedule.html](assets/web/feature-schedule.html) | 指挥栏、池、月周列表、筛选、合并及澄清 |
| 卡片详情 | [feature-schedule-detail.html](assets/web/feature-schedule-detail.html) | 业务状态、排期、回执、子卡和澄清流水 |

## Tips

- 排期不提供项目配置、Git 仓库配置、环境信息或项目管理快捷入口；项目及成员维护统一从研发管理菜单的项目管理进入。
- 卡片项目按源仓匹配启用项目的 harness 工程查询投影，不按目录或路径划分；映射变更只重算归属、标签、筛选及统计，不改写卡片事实，见 [业务规则 §9](references/business-rule.md#9-项目归属与配置)。
- 成员登记仅定义显示与报告统计映射；人员选择、领取与操作权限保留公共有效系统用户规则，不新增成员名单准入或外部仓授权。
