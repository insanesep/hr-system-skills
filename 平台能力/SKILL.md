---
name: 平台能力
description: 平台能力分组索引。Use when 需要定位 DevHub 的我的令牌、权限分配、数据源管理、研发工具资源或调用审计功能，选择对应菜单叶子并加载跨功能共享的 MCP 接入、数据、权限与页面约定。仅 Web 端。
metadata: {"domain":"产研","subdomain":"平台能力","platform":["web"]}
---

# 平台能力

## 分组定位

平台能力是五个同级菜单的文档分组，不是独立聚合页面。按具体任务进入下辖叶子；详情、表单、弹窗与页签均归相应菜单功能，不建立额外菜单层级。

菜单归属与路由以 [前端路由](../../busyming-devhub-web/src/router/index.ts) 为依据；「研发工具资源」是菜单名称，「研发代码仓」是其页面主体。资产只作只读视觉参考，[服务列表资产](assets/web/service-list.html)不对应第六个菜单。

## 下辖菜单功能

| 菜单功能 | 入口 | 路由 | 功能范围 |
| ---- | ---- | ---- | ---- |
| 我的令牌 | [SKILL.md](我的令牌/SKILL.md) | `/mcp-access/tokens` | 个人令牌、生成与编辑、续期与吊销、详情、接入配置及本人权限 |
| 权限分配 | [SKILL.md](权限分配/SKILL.md) | `/mcp-access/grants` | 按人或批量分配工具族与数据库范围、有效期、理由及变更记录 |
| 数据源管理 | [SKILL.md](数据源管理/SKILL.md) | `/mcp-access/datasources` | 只读数据源登记、详情、库表开放、脱敏与查询上限 |
| 研发工具资源 | [SKILL.md](研发工具资源/SKILL.md) | `/mcp-access/devtool-resources` | 研发代码仓、云效成员与身份映射事实的查询和同步 |
| 调用审计 | [SKILL.md](调用审计/SKILL.md) | `/mcp-access/audit` | 调用证据、拒绝原因、汇总、明细及导出 |

## 共享规则真源

- [业务规则](references/business-rule.md)：角色职责、已注册工具、令牌与配置生成。
- [权限与授权判定](references/permission-rules.md)：功能权限、显式分配、令牌交集、当前成员应用范围与身份透传；权限定义不在叶子复制。
- [数据定义](references/data.md)：跨功能对象、关系及字段语义。
- [Web 共用说明与五叶正文索引](references/web-ui.md)：菜单与非菜单页面归属、布局和实现边界；具体 UI 正文只保留在对应叶子。

## 公共依赖与关联入口

- [SLS 能力](../../busyming-skills-common/agent/MCP/sls/SKILL.md)与[契约](../../busyming-skills-common/agent/MCP/sls/references/mcp-tools.md)、[ARMS 能力](../../busyming-skills-common/agent/MCP/arms/SKILL.md)与[契约](../../busyming-skills-common/agent/MCP/arms/references/mcp-tools.md)。
- [用户权限](../../busyming-skills-common/api/mmhm/system/用户权限/references/permission-api.md)、[用户与组织](../../busyming-skills-common/api/mmhm/system/用户权限/references/user-org-api.md)、[脱敏](../../busyming-skills-common/api/mmhm/system/用户权限/references/mask-api.md)、[通知](../../busyming-skills-common/api/mmhm/system/消息通知/references/send-api.md)、[导出任务](../../busyming-skills-common/api/mmhm/system/导入导出/references/task-api.md)；公共能力真源见[公共导航](../../busyming-skills-common/AGENTS.md)。
- [人员产出报告](../研发报告/人员产出报告/SKILL.md)与[报告配置](../研发报告/报告配置/SKILL.md)：报告业务及统计口径不由令牌级审计替代；[黑灯工厂工单](../运维管理/黑灯工厂工单/SKILL.md)：服务端扫描仍遵守其项目配置和权限，不由个人令牌分配替代。
