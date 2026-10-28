---
name: 权限分配
description: 权限分配。Use when 权限管理员需要按人员查询分配、为本人或他人新增或收回 SLS / ARMS 工具族及数据库实例库表权限、设置有效期与理由、批量追加分配，或查看人员授权变更记录。仅 Web 端，不提供逐应用或独立环境授权。
metadata: {"domain":"产研","subdomain":"平台能力","platform":["web"]}
---

# 权限分配

## 功能与入口

- 菜单归属：平台能力 → 权限分配；入口 `/mcp-access/grants`，路由编码（name）为 `devhubMcpGrant`。
- 服务对象：权限管理员，可为本人或其他人员分配；查看与操作的权限定义仅引用 [共享权限矩阵](../references/permission-rules.md#1-权限点矩阵)。
- 菜单与保存操作的权限码为 `devhubMcpGrant`，列表、单人及批量路由均声明该 `meta.permCode`；路由 name 与权限码分别登记。

## 页内功能

- 按人员与分配状态查询，查看数据库粒度汇总、有效研发工具族、最近到期、生效令牌数及最近调整；工具汇总加载失败不能误显示为未分配。
- 「新建分配」先在弹窗选择人员，再进入单人表单；行操作进入该人员分配表单；勾选人员后进入批量表单。
- 单人表单回显当前有效分配，支持新增、保持、标记收回和撤销收回；批量只追加，不移除已有权限。有效期、理由、重复分配及通知规则见 [共享分配规则](../references/permission-rules.md#2-权限分配)。
- 在人员「变更记录」抽屉查看分配与收回证据，记录口径引用 [审计规则](../调用审计/references/audit-rules.md#6-授权变更记录)。
- 本功能只分配 SLS / ARMS 工具族与数据库实例 / 库 / 表。业务工具无需管理员预分配；仓成员事实只派生动态应用范围，不产生逐应用、业务域或独立环境授权。

## 所属非菜单页面

| 页面 | 路径 | 路由编码（name） |
| ---- | ---- | ---- |
| 分配权限（单人） | `/mcp-access/grants/:userId` | `devhubMcpGrantEdit` |
| 批量分配 | `/mcp-access/grants/batch`，携带已选人员 | `devhubMcpGrantBatch` |

单人与批量共用分配表单；人员选择弹窗与变更记录抽屉均不另设菜单。保存回到权限分配列表；取消按浏览器历史返回，从列表进入时回到列表。

## 规则、页面与资产

- [Web 页面正文](references/web-ui.md)：[权限分配列表](references/web-ui.md#权限分配)、[分配表单](references/web-ui.md#分配权限)，保留表单校验、二次确认、反馈与未保存离开确认的产品目标。
- [共享权限与授权规则](../references/permission-rules.md)是权限定义、分配粒度及调用交集的唯一真源；配套 [业务规则](../references/business-rule.md)与[数据定义](../references/data.md)，不在本叶复制。
- 数据库可分配范围引用 [数据源规则](../数据源管理/references/datasource-rules.md)；仓与成员事实引用 [研发工具规则](../研发工具资源/references/devtool-rules.md)。
- 只读视觉参考：[列表](assets/web/grant-list.html)、[表单](assets/web/grant-form.html)。资产中的业务域或应用授权树不构成规则。
- 实现依据：[列表](../../../busyming-devhub-web/src/views/mcp/GrantListView.vue)、[表单](../../../busyming-devhub-web/src/views/mcp/GrantFormView.vue)与[路由](../../../busyming-devhub-web/src/router/index.ts)。
