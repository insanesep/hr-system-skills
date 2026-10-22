---
name: MCP接入管理
description: MCP接入管理。Use when 权限管理员需要为研发、产品等人员分配业务系统 / 研发工具（SLS、ARMS，按业务域划分）/ 数据库的 MCP 权限，使用人员需要在已分配权限内生成个人令牌并获取 MCP 客户端配置，MCP 管理员需要维护服务目录与研发工具资源的业务域归属和开放，数据源管理员需要登记只读数据源并配置库表开放、脱敏与行数超时上限，或需要查阅与导出 MCP 调用审计。端型：Web。
metadata: {"domain":"产研","subdomain":"平台能力","platform":["web"]}
---

# MCP接入管理

## 模块概述

DevHub 统一的 MCP 接入入口：权限管理员按人分配业务系统、研发工具（SLS 日志库 / ARMS 应用按业务域划分）与数据库权限；研发、产品等使用人员只能在已分配范围内自助生成个人令牌，一键获得可粘贴到 Qoder / Claude Code / Cursor 等客户端的 MCP 配置；平台网关在每次调用时实时校验令牌、分配与开放状态，透传持有人身份，对日志与数据库强制只读与脱敏，并留存调用审计与授权变更记录。

## 端

- **Web 管理端**：我的令牌、生成令牌、令牌详情、权限分配、分配权限、MCP 服务目录、研发工具资源、数据源管理、数据源详情、调用审计十页；无 App 端
- **服务对象**：研发、产品等 DevHub 用户（令牌使用者）；权限管理员；MCP 管理员；数据源管理员

## When to Use

- 研发或产品希望让 AI Agent 查询业务系统数据、检索某业务域的 SLS 日志、查看 ARMS 调用链或只读查询数据库，需要在已分配权限内生成令牌与 MCP 配置
- 权限管理员需要为某人或一批人分配 / 收回权限、设置有效期，或追溯谁在何时分配了什么
- MCP 管理员需要同步阿里云 SLS / ARMS 资源，按资源组、标签或名称规则划分业务域与环境，并决定哪些资源可被分配
- 数据源管理员开放某个数据库实例给 Agent 只读查询，需配置库表开放、敏感字段脱敏与行数超时上限
- 令牌即将到期需续期、需调整授权范围，或怀疑令牌泄露需立即吊销；安全或运维需要查阅与导出调用审计

## Prerequisites

| 资料 | 用途 | 所属仓库 |
| ---- | ---- | ---- |
| [references/business-rule.md](references/business-rule.md) | 角色边界、接入领域与服务目录、令牌规则、MCP 配置生成、异常场景 | 本模块 |
| [references/state-machine.md](references/state-machine.md) | 令牌状态枚举与流转 | 本模块 |
| [references/permission-rules.md](references/permission-rules.md) | 权限点矩阵、权限分配（粒度、理由、有效期、通知）、调用时授权判定、身份透传、限流 | 本模块 |
| [references/devtool-rules.md](references/devtool-rules.md) | 阿里云 SLS / ARMS 能力依据、业务域与资源目录、归属规则、日志检索与调用链查询规则 | 本模块 |
| [references/datasource-rules.md](references/datasource-rules.md) | 数据源登记、库表开放、只读约束、行数超时上限、脱敏 | 本模块 |
| [references/audit-rules.md](references/audit-rules.md) | 调用记录、结果与原因枚举、汇总指标、保留期与导出、授权变更记录 | 本模块 |
| [references/data.md](references/data.md) | 服务、工具、令牌、授权项、调用记录、数据源、库表、脱敏绑定、研发工具资源、归属规则、权限分配项、授权变更记录实体定义 | 本模块 |
| [references/web-ui.md](references/web-ui.md) | Web 十页的区块、导航、操作反馈与表单校验 | 本模块 |
| [用户权限 · 权限与角色 API](../../../busyming-skills-common/api/mmhm/system/用户权限/references/permission-api.md) | 菜单与按钮功能权限校验、业务系统身份透传的权限依据 | common |
| [用户权限 · 用户与组织 API](../../../busyming-skills-common/api/mmhm/system/用户权限/references/user-org-api.md) | 被分配人选人、部门岗位展示、账号停用 / 离职自动收回与吊销 | common |
| [用户权限 · 脱敏 API](../../../busyming-skills-common/api/mmhm/system/用户权限/references/mask-api.md) | 数据库字段与日志内容脱敏规则库，本模块只做绑定与引用 | common |
| [消息通知 · 发送 API](../../../busyming-skills-common/api/mmhm/system/消息通知/references/send-api.md) | 令牌到期提醒、吊销通知、权限分配 / 收回 / 到期提醒的企微发送 | common |
| [导入导出 · 任务 API](../../../busyming-skills-common/api/mmhm/system/导入导出/references/task-api.md) | 调用审计导出异步任务 | common |
| [阿里云渠道 · 监控与日志](../../../busyming-skills-common/api/mmhm/devops/阿里云渠道/references/observe-api.md) | SLS 资源发现与日志检索、ARMS 应用与调用链查询的只读能力来源 | common |
| [公共能力依赖导航](../../../busyming-skills-common/AGENTS.md) | 业务系统领域各系统对外能力真源索引（按系统域） | common |

## 页面功能概览

| 页面 | 职责 | 原型 |
| ---- | ---- | ---- |
| 我的令牌 | 本人令牌列表、续期、吊销、查看我的权限与变更；管理员切换全部令牌并吊销他人令牌 | `assets/web/token-list.html` |
| 生成令牌 | 在本人已分配权限内按三个领域勾选授权范围；生成后一次性展示令牌明文与 MCP 配置；复用为编辑授权范围 | `assets/web/token-form.html` |
| 令牌详情 | 基本信息、授权范围及其可用性、MCP 接入配置复制与下载、本令牌近 30 天调用记录 | `assets/web/token-detail.html` |
| 权限分配 | 按人员查看已分配权限概览、到期情况，进入单人或批量分配，查看授权变更记录 | `assets/web/grant-list.html` |
| 分配权限 | 为单人增删或为多人追加业务系统、研发工具（按业务域 / 资源）、数据库权限，设置有效期与高风险理由 | `assets/web/grant-form.html` |
| MCP 服务目录 | 登记业务系统 / 研发工具 MCP 服务、同步工具清单、标注写入类工具、服务与工具启停 | `assets/web/service-list.html` |
| 研发工具资源 | 同步 SLS 日志库与 ARMS 应用，按归属规则或手工划分业务域与环境，控制开放 | `assets/web/devtool-resources.html` |
| 数据源管理 | 登记只读数据源（自动检测只读权限）、业务域、行数与超时上限、启停 | `assets/web/datasource-list.html` |
| 数据源详情 | 同步库表、库 / 表开放、字段脱敏绑定 | `assets/web/datasource-detail.html` |
| 调用审计 | 按时间、人员、令牌、领域、业务域、结果筛选，汇总指标、明细与详情、导出 | `assets/web/call-audit.html` |

- 权限分配与调用判定：详见 [references/permission-rules.md §2](references/permission-rules.md#2-权限分配) 与 [§3](references/permission-rules.md#3-调用时授权判定)
- SLS / ARMS 业务域划分与查询限制：详见 [references/devtool-rules.md §2](references/devtool-rules.md#2-业务域与资源目录)
- 令牌生成、续期、吊销与配置生成：详见 [references/business-rule.md §3](references/business-rule.md#3-令牌规则) 与 [§4](references/business-rule.md#4-mcp-配置生成)
- 数据库只读与脱敏：详见 [references/datasource-rules.md §3](references/datasource-rules.md#3-只读约束)
- 各页交互：详见 [references/web-ui.md](references/web-ui.md)

## 关联模块

| 模块 | 关系 |
| ---- | ---- |
| [研发报告/人员产出报告](../../研发报告/人员产出报告/SKILL.md) | 周报「MCP 工具用量」口径以该模块为准；本模块调用记录为令牌级审计明细，不替代其统计口径 |
| [研发报告/报告配置](../../研发报告/报告配置/SKILL.md) | 其功能排期卡片 MCP 调用口径为既有 MCP 消费方，接入本模块后沿用其调用口径 |
| [运维管理/黑灯工厂管理](../../运维管理/黑灯工厂管理/SKILL.md) | 服务端 bug 扫描依赖 SLS 日志检索，可通过研发工具领域令牌接入 |

## Tips

- 「能分配什么」由 MCP 管理员与数据源管理员通过启用、开放控制，「分配给谁」由权限管理员决定，使用人员只能在分配范围内生成令牌
- SLS / ARMS 按业务域分配时自动覆盖该域之后开放的资源；新同步的资源、工具与库表默认不开放
- 令牌明文只在生成时展示一次；遗失只能吊销重建
