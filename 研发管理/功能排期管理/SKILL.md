---
name: 功能排期管理
description: 研发排期工作台。Use when 把源仓提交生成单张排期卡、维护排期领取完成与延期、发起或处理需求澄清、关联完成commit、合并卡片或移出非需求改动、按域项目查询卡片或经MCP维护排期。基础人员、域项目和仓映射分别引用产研人员管理与域及项目管理。端型：Web + server + MCP。
metadata:
  domain: 产研
  clients: web,server,mcp
---

# 功能排期管理

## 模块概述

以源仓提交生成排期卡片，产品安排排期，研发领取并交付，支持需求澄清、合并与非需求改动旁路；卡片、回执和流程事实由本功能维护，基础台账不在本功能重复建设。

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
| 字段规则 | [references/field-rules.md](references/field-rules.md) | 编号、标题、负责人、排期日期、需求性质、业务对接人、完成 commit、项目字段、澄清问题、修订 commit、撤回理由 | 本模块 |
| 权限规则 | [references/permission-rules.md](references/permission-rules.md) | 菜单与按钮权限编码、无权限时的入口表现、服务端校验 | 本模块 |
| 数据定义 | [references/data.md](references/data.md) | 卡片、完成回执、合并明细、流水、发版日、项目、澄清记录 | 本模块 |
| Web 页面 | [references/web-ui.md](references/web-ui.md) | 工作台与卡片详情页的区块元素、导航、操作反馈与表单校验 | 本模块 |
| MCP 能力 | [references/other-rule-mcp.md](references/other-rule-mcp.md) | 能力分组、工具清单与权限对应、调用约束、需求澄清的 agent 约定 | 本模块 |
| 页面编排标准 | [web-operation-list.md](../../../busyming-skills-design/shared/page-standards/web-operation-list.md) | 研发排期工作台的区域编排 | busyming-skills-design |
| 页面编排标准 | [web-detail.md](../../../busyming-skills-design/shared/page-standards/web-detail.md) | 卡片详情页的区域编排 | busyming-skills-design |
| 原型样式入口 | [templates.css](../../../busyming-skills-design/shared/prototype/web/templates.css)（+ [pc.css](../../../busyming-skills-design/components/web/tokens/pc.css)、[runtime.css](../../../busyming-skills-design/docs-site/pc/runtime.css)） | 原型样式链：`components/web/tokens/pc.css` → `docs-site/pc/runtime.css` → `docs-site/ep-base-shim.css` → `shared/prototype/web/templates.css`，与 registry/prototype.json 中 PC 组件的样式清单一致 | busyming-skills-design |
| 域及项目管理 | [SKILL.md](../域及项目管理/SKILL.md) | 域项目、代码仓与执行映射唯一真源；本模块只读消费 | busyming-skills-devops |
| 产研人员管理 | [SKILL.md](../产研人员管理/SKILL.md) | 新职责人员候选与稳定身份 | busyming-skills-devops |
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
| 项目进度报告 | [SKILL.md](../../研发报告/项目进度报告/SKILL.md) | 卡片状态与流水；基础映射引用域及项目管理 |
| 报告配置 | [SKILL.md](../../研发报告/报告配置/SKILL.md) | 排期卡片与发版日事实；项目映射引用域及项目管理 |
| 需求管理 | [business-rule.md §5](../../需求管理/references/business-rule.md#5-排期关联规则) | 关联卡片的状态（含待澄清）与候选卡片 |
| 自动分配与领取任务 | [SKILL.md](../../../busyming-skills-common/agent/MCP/auto-claim-tasks/SKILL.md) | 排期 MCP 工具、待分配口径与澄清后的编号续接 |

## 页面功能概览

| 页面 | 资产 | 职责 |
| --- | --- | --- |
| 排期工作台 | [feature-schedule.html](assets/web/feature-schedule.html) | 指挥栏、池、月周列表、筛选、合并及澄清 |
| 卡片详情 | [feature-schedule-detail.html](assets/web/feature-schedule-detail.html) | 业务状态、排期、回执、子卡和澄清流水 |

## Tips

- 基础配置只跳转新真源，不以排期编辑权限代替域项目维护权。
- 工作流程及证据不因基础人员或责任变化自动覆盖；卡片归属消费见 [业务规则 §9](references/business-rule.md#9-项目归属与配置)。
- 资产为存量演示，不构成新真源引用、目录多项目归属或外部同步已经上线的证据。
