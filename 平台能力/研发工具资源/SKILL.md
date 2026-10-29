---
name: 研发工具资源
description: 研发工具资源。Use when 权限管理员或 MCP 管理员需要按项目和代码仓名称查询研发代码仓，核对云效仓 ID、有效研发成员与门户身份映射、同步状态，或 MCP 管理员需要同步项目代码服务仓及云效研发成员事实。仅 Web 端，不提供逐应用开放或授权。
metadata: {"domain":"产研","subdomain":"平台能力","platform":["web"]}
---

# 研发工具资源

## 功能与入口

- 菜单归属：平台能力 → 研发工具资源；入口 `/mcp-access/devtool-resources`，路由编码（name）为 `devhubMcpDevtool`。
- 「研发工具资源」是菜单入口与当前路由标题；「研发代码仓」是页面列表主体，不是父级或额外菜单。
- 服务对象：权限管理员与 MCP 管理员查看，MCP 管理员执行同步；职责与权限定义仅引用 [共享权限矩阵](../references/permission-rules.md#1-权限点矩阵)。
- 查看权限码为 `devhubMcpDevtool`，路由声明该 `meta.permCode`；同步动作权限码为 `devhubMcpDevtoolEdit`，与路由 name 分开识别。

## 页内功能

- 按项目与代码仓名称关键词查询、重置和分页；列表显示项目、研发代码仓、云效仓 ID、门户映射人数 / 云效有效研发成员数以及同步状态和最近同步时间。
- 异步同步项目代码服务仓与云效研发成员，立即返回 taskId；已有活动任务时复用同一任务，展示当前仓、读取与保存计数、失败清单，页面刷新可恢复进度。
- 用日志关键字 MCP_REPO_SYNC 按 taskId 查看阶段与每 15 秒运行心跳。同步不访问 SLS / ARMS，不改变工具分配或令牌选择。
- 项目 harness 与代码服务仓关系由 [功能排期管理](../../研发管理/功能排期管理/SKILL.md)的项目配置维护，本页无项目维护表单、开放开关、业务域枚举或观测分组配置。
- 仓成员事实只派生动态查询范围，不自动授予 SLS / ARMS 工具许可；范围与能力边界引用 [研发工具规则](references/devtool-rules.md)与[共享授权判定](../references/permission-rules.md#3-调用时授权判定)。

## 页内与非菜单边界

本功能只有该菜单列表页；成员统计为只读信息，不新增成员详情菜单。筛选与同步都在本页完成，无生成、编辑、详情或逐应用分配路由；切换其它能力使用平台能力下的同级菜单，不返回聚合页。

## 规则、页面与资产

- [Web 页面正文：研发代码仓主体](references/web-ui.md#研发代码仓)：字段、查询、同步、异常反馈与导航的唯一正文。
- [研发工具规则](references/devtool-rules.md)：项目代码仓真源、成员同步、快照新鲜度、目标识别及 SLS / ARMS 能力隔离。
- [共享业务规则](../references/business-rule.md)、[权限规则](../references/permission-rules.md)、[数据定义](../references/data.md)只引用不复制。
- [只读视觉参考](assets/web/devtool-resources.html)：其中的资源开放、业务域授权或应用配置不构成当前规则。
- 实现依据：[研发工具资源页](../../../code/02-devops/busyming-devhub-web/src/views/mcp/DevtoolResourceView.vue)、[路由](../../../code/02-devops/busyming-devhub-web/src/router/index.ts)；公共执行契约由[平台能力索引](../SKILL.md#公共依赖与关联入口)指向。
