---
name: 数据源管理
description: 数据源管理。Use when 数据源管理员需要登记或编辑只读数据库实例、检测连通性与权限、维护数据库业务域及查询上限、启停数据源、同步库表、配置开放范围与字段脱敏，或权限管理员需要核对可分配的数据库对象。仅 Web 端。
metadata: {"domain":"产研","subdomain":"平台能力","platform":["web"]}
---

# 数据源管理

## 功能与入口

- 菜单归属：平台能力 → 数据源管理；入口 `/mcp-access/datasources`，路由编码（name）为 `devhubMcpDatasource`。
- 服务对象：数据源管理员负责登记与维护，权限管理员可查看数据源与详情；职责和权限定义仅引用 [共享权限矩阵](../references/permission-rules.md#1-权限点矩阵)。
- 查看权限码为 `devhubMcpDatasource`，列表与详情路由均声明该 `meta.permCode`；登记、编辑、启停、同步、开放及脱敏动作权限为 `devhubMcpDatasourceEdit`，不能把路由 name 当作动作权限。

## 页内功能

- 查询数据源，查看实例类型、环境、数据库业务域、业务系统、负责人、库表与开放数量、查询上限、连通状态、最近同步及启停状态。
- 登记与编辑通过弹窗维护只读接入信息、数据库业务域和行数 / 超时上限；只读检测、密码不回显及登记同步规则见 [数据源规则](references/datasource-rules.md#1-数据源登记)。
- 详情维护库表开放，显示已分配人数，在表节点查看字段与疑似敏感提示并绑定或解除门户脱敏规则；人员分配由 [权限分配](../权限分配/SKILL.md)维护，不在本页按人授权。
- 保持数据库自身的环境与业务域登记、筛选语义，不依赖研发代码仓业务域枚举；完整筛选、校验与未保存确认按 UI 正文执行。

## 所属非菜单页面

- 数据源详情：`/mcp-access/datasources/:id`，路由编码（name）为 `devhubMcpDatasourceDetail`；由列表或登记成功进入，归本功能，不另设菜单。
- 登记 / 编辑弹窗、库表开放配置与字段脱敏均属于本功能；编辑可在列表或详情打开，无独立表单菜单路由。
- 详情返回目标为数据源管理列表 `/mcp-access/datasources`；返回交互遵循本功能 UI 正文。

## 规则、页面与资产

- [Web 页面正文](references/web-ui.md)：[数据源管理](references/web-ui.md#数据源管理)、[数据源详情](references/web-ui.md#数据源详情)，保留生产 / 预发 / 测试 / 开发、业务域筛选及未保存守卫等产品目标。
- [数据库规则](references/datasource-rules.md)是只读登记、库表开放、脱敏与查询上限的功能真源；共享 [业务规则](../references/business-rule.md)、[权限规则](../references/permission-rules.md)、[数据定义](../references/data.md)只引用不复制。
- 只读视觉参考：[列表](assets/web/datasource-list.html)、[详情](assets/web/datasource-detail.html)。
- 实现依据：[列表](../../../busyming-devhub-web/src/views/mcp/DatasourceListView.vue)、[登记 / 编辑弹窗](../../../busyming-devhub-web/src/views/mcp/DatasourceEditModal.vue)、[详情](../../../busyming-devhub-web/src/views/mcp/DatasourceDetailView.vue)与[路由](../../../busyming-devhub-web/src/router/index.ts)。
