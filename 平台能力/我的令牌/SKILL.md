---
name: 我的令牌
description: 我的令牌。Use when DevHub 用户需要查询个人 MCP 令牌、自助生成或编辑名称与授权范围、续期或吊销、复制下载接入配置、查看本人权限与变更或令牌调用记录，或令牌管理员需要查看全部令牌和按权限吊销他人令牌。仅 Web 端。
metadata: {"domain":"产研","subdomain":"平台能力","platform":["web"]}
---

# 我的令牌

## 功能与入口

- 菜单归属：平台能力 → 我的令牌；入口 `/mcp-access/tokens`，路由编码（name）为 `devhubMcpToken`。
- 服务对象：研发、产品等令牌使用者；具备令牌管理权限的 MCP 管理员可查看全部令牌与他人详情、吊销他人令牌，不能代其编辑工具选择。
- 功能权限定义统一引用 [共享权限矩阵](../references/permission-rules.md#1-权限点矩阵)。菜单资源码为 `devhubMcpToken`，编辑授权范围的权限码为 `devhubMcpTokenEdit`；路由 name 与菜单 / 按钮权限码分别登记，本人范围与管理员操作均按功能权限及服务端规则判定。

## 页内功能

- 查询本人令牌，按状态及名称 / 前缀筛选，查看授权领域、到期与最近使用时间；令牌管理员可切换全部令牌范围。
- 在「我的权限」抽屉查看本人数据库与 SLS / ARMS 工具族分配、有效期、可用性及最近变更；续期与吊销在弹窗完成。
- 自助生成令牌并显式选择当前有效范围；已注册业务工具默认可选，观测工具族与数据库需已有有效分配，生成与编辑至少选择一项有效 scope。具体规则只引用 [共享令牌规则](../references/business-rule.md#3-令牌规则)。
- 详情展示令牌生命周期、选择范围与当前可用性，支持接入配置复制下载及本人本令牌近 30 天调用记录；明文仅生成时展示一次。配置规则见 [共享业务规则](../references/business-rule.md#4-mcp-配置生成)。

## 所属非菜单页面

| 页面 | 路径 | 路由编码（name） |
| ---- | ---- | ---- |
| 生成令牌 | `/mcp-access/tokens/create` | `devhubMcpTokenCreate` |
| 编辑授权范围 | `/mcp-access/tokens/:id/edit` | `devhubMcpTokenEdit` |
| 令牌详情 | `/mcp-access/tokens/:id` | `devhubMcpTokenDetail` |

生成与编辑共用表单；生成结果、我的权限、续期与吊销均不另设菜单。保存、取消与返回目标见本功能 UI 正文。

## Prerequisites

- [项目管理 · 权限边界](../../研发管理/项目管理/references/permission-rules.md#boundaries)：产研业务身份与门户、MCP 生命周期边界只读引用。

## 规则、页面与资产

- [Web 页面正文](references/web-ui.md)：[列表](references/web-ui.md#我的令牌)、[生成 / 编辑](references/web-ui.md#生成--编辑令牌)、[详情](references/web-ui.md#令牌详情)，保留表单校验、反馈及未保存离开确认的产品目标。
- [令牌状态机](references/state-machine.md)：本功能状态枚举与流转真源。
- [共享业务规则](../references/business-rule.md)、[权限规则](../references/permission-rules.md)、[数据定义](../references/data.md)；调用记录内容引用 [审计规则](../调用审计/references/audit-rules.md)，不复制共享规则。
- 原型只作视觉参考：[列表](assets/web/token-list.html)、[表单](assets/web/token-form.html)、[详情](assets/web/token-detail.html)；规则真源在 `references/`。
- 实现依据：[列表](../../../busyming-devhub-web/src/views/mcp/TokenListView.vue)、[表单](../../../busyming-devhub-web/src/views/mcp/TokenFormView.vue)、[详情](../../../busyming-devhub-web/src/views/mcp/TokenDetailView.vue)与[路由](../../../busyming-devhub-web/src/router/index.ts)。
