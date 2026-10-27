---
name: MCP接入管理
description: MCP接入管理。Use when DevHub 用户需要自助生成或编辑个人令牌、显式选择已注册业务工具或已获授权的 SLS/ARMS 工具族、获取 MCP 客户端配置，权限管理员需要按人分配或收回观测工具族与数据库权限，MCP 管理员需要同步项目观测应用和云效仓成员、核对应用归属与同步状态，数据源管理员需要维护只读数据源、库表开放、脱敏与查询上限，或需要查阅和导出调用审计。应用范围由云效代码仓成员事实派生，仅 Web 端。
metadata: {"domain":"产研","subdomain":"平台能力","platform":["web"]}
---

# MCP接入管理

## 模块概述

DevHub 统一 MCP 接入入口。用户自助生成个人令牌并显式勾选工具范围；SYSTEM 已注册内置业务工具默认可选，SLS/ARMS 工具族须经权限管理员显式分配，数据库沿用实例、库、表分配规则。观测应用范围由项目代码服务仓的云效成员事实动态派生，不由管理员或令牌逐应用配置。每次调用重新校验账号、令牌、工具许可与当前目标范围，保持身份透传、只读约束与审计。

## 端与服务对象

- 仅 Web 管理端，共九页；无 App 端。
- 面向研发、产品等 DevHub 用户、权限管理员、MCP 管理员与数据源管理员。
- 不提供任意第三方 MCP 服务登记或独立服务目录管理页面。

## When to Use

- 生成、续期、编辑或吊销个人令牌，获取客户端接入配置。
- 按人或批量分配、收回 SLS/ARMS 工具族与数据库权限，核对有效期及授权变更。
- 同步项目观测应用与云效仓成员，核对完整应用名、项目观测分组、身份映射和快照新鲜度。
- 维护数据库只读接入、库表开放、脱敏及查询上限，查阅或导出调用审计。

## Prerequisites

| 资料 | 用途 |
| ---- | ---- |
| [业务规则](references/business-rule.md) | 角色边界、已注册工具目录、令牌与配置生成 |
| [权限与授权判定](references/permission-rules.md) | 显式工具分配、动态应用范围与调用交集 |
| [观测应用规则](references/devtool-rules.md) | 项目与仓真源、成员同步、单应用查询及能力隔离 |
| [数据定义](references/data.md) | 令牌、授权、应用、成员快照与数据库对象 |
| [令牌状态机](references/state-machine.md) | 状态枚举与续期、过期、吊销流转；生成与编辑必须至少选择一项有效 scope，以业务规则为准 |
| [数据源规则](references/datasource-rules.md) | 数据库只读、库表开放、脱敏与查询上限 |
| [调用审计](references/audit-rules.md) | 调用证据、拒绝原因与授权变更记录 |
| [Web 页面规则](references/web-ui.md) | 九页交互与表单校验 |
| [SLS 公共能力](../../../busyming-skills-common/agent/MCP/sls/SKILL.md)、[工具契约](../../../busyming-skills-common/agent/MCP/sls/references/mcp-tools.md) | 完整 appName、连接身份、单应用日志取证 |
| [ARMS 公共能力](../../../busyming-skills-common/agent/MCP/arms/SKILL.md)、[工具契约](../../../busyming-skills-common/agent/MCP/arms/references/mcp-tools.md) | 调用链、诊断与指标执行契约 |
| [用户权限](../../../busyming-skills-common/api/mmhm/system/用户权限/references/permission-api.md)、[用户与组织](../../../busyming-skills-common/api/mmhm/system/用户权限/references/user-org-api.md) | 功能权限、人员状态与邮箱身份映射 |
| [脱敏能力](../../../busyming-skills-common/api/mmhm/system/用户权限/references/mask-api.md) | 数据库脱敏规则引用 |
| [消息通知](../../../busyming-skills-common/api/mmhm/system/消息通知/references/send-api.md)、[导出任务](../../../busyming-skills-common/api/mmhm/system/导入导出/references/task-api.md) | 通知与调用审计导出 |
| [公共能力导航](../../../busyming-skills-common/AGENTS.md) | 业务工具背后的能力真源 |

## 页面功能概览

| 页面 | 职责 | 视觉参考 |
| ---- | ---- | ---- |
| 我的令牌 | 本人令牌、续期与吊销、我的权限与变更；具备令牌管理权限者查看全部令牌 | [令牌列表](assets/web/token-list.html) |
| 生成或编辑令牌 | 至少选择一项有效 scope；业务工具显式勾选、观测仅勾工具族、数据库在分配内选择；生成时一次性展示明文 | [令牌表单](assets/web/token-form.html) |
| 令牌详情 | 工具选择与可用性、配置复制下载、本人令牌调用记录；不提供观测应用授权编辑 | [令牌详情](assets/web/token-detail.html) |
| 权限分配 | 按人员查看工具族与数据库分配、有效期、单人或批量入口及变更记录 | [分配列表](assets/web/grant-list.html) |
| 分配权限 | 单人增删或多人追加 SLS/ARMS 工具族与数据库权限；无应用或独立环境授权 | [分配表单](assets/web/grant-form.html) |
| 观测应用 | 按项目与完整应用名筛选，展示观测分组、SLS 就绪、ARMS 按需查询、仓成员数及同步状态；同步应用及成员 | [应用目录视觉参考](assets/web/devtool-resources.html) |
| 数据源管理 | 只读数据源登记、权限检测、数据库业务域、查询上限与启停 | [数据源列表](assets/web/datasource-list.html) |
| 数据源详情 | 库表同步、开放与字段脱敏绑定 | [数据源详情](assets/web/datasource-detail.html) |
| 调用审计 | 按时间、人员、令牌、接入领域、目标与结果筛选，汇总、明细、详情及导出 | [调用审计](assets/web/call-audit.html) |

资产只作视觉参考，业务规则以本模块文档和实际代码为准；参考图中的资源开放、业务域授权或服务登记不构成产品规则。

## 使用要点

- 云效代码仓名加环境后缀构成完整 appName，每个完整名字是独立应用；一条应用同时承载 SLS/ARMS，不拆成两类授权资源。
- 项目代码服务仓和观测分组是真源；harness 不自动成为应用仓，不从 Nacos 配置或发现分组猜观测归属。
- 仓成员只派生应用范围，不自动授予工具族。每次观测查询取当前工具 grant、令牌选择、有效成员范围与应用状态的交集。
- 应用和成员快照均在 24 小时后失效；每日 02:00 或手动同步。云端成员移除经下一次成功完整同步确认后，后续查询立即失效。
- 令牌必须至少选择一项有效 scope；增加工具分配不会自动加入已有令牌。非工具型 DEVTOOL 授权不生效，不升格为工具许可、不扩展已有令牌。
- 生产与非生产连接声明用于按应用后缀路由，不是独立环境授权；单能力不可用不应否定其他已取得证据。

## 关联模块

- [人员产出报告](../../研发报告/人员产出报告/SKILL.md)：周报 MCP 工具用量统计不由令牌级审计替代。
- [报告配置](../../研发报告/报告配置/SKILL.md)：报告侧沿用其业务与统计口径。
- [黑灯工厂管理](../../运维管理/黑灯工厂管理/SKILL.md)：个人 MCP 日志取证遵守完整应用名与当前成员范围；服务端扫描仍遵守该模块的项目配置和权限，不由个人令牌分配替代。
