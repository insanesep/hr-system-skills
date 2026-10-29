# Web 端 UI 描述 · 平台能力

> 本文件只承载共用说明与五个菜单功能的正文索引，不重复页面正文。
> 组件选用、Token 纪律、三态等硬约束见 [设计主 Skill](../../../busyming-skills-design/SKILL.md) 与 [Web 组件规范](../../../busyming-skills-design/components/web/SKILL.md)。
> 共享真源：[业务规则](business-rule.md)、[权限与授权判定](permission-rules.md)、[数据定义](data.md)。功能专属规则随各叶子入口加载。

## 共用页面与导航约定

- 仅 Web 管理端，无 App 端；九类页面归属五个同级菜单。服务与业务工具由平台注册，不提供任意第三方服务登记或独立服务目录菜单。
- 菜单以 [路由](../../../busyming-devhub-web/src/router/index.ts) 的菜单标记、分组、标题和排序为依据：「平台能力 → 我的令牌 / 权限分配 / 数据源管理 / 研发工具资源 / 调用审计」。分组不是可跳转的聚合页面；生成、编辑、详情与批量分配均是所属功能内的非菜单页。
- 独立运行由 [PortalLayout](../../../busyming-devhub-web/src/layouts/PortalLayout.vue)承载外壳，微应用模式由门户提供外壳；菜单归属、页面标题、来源、去向与返回行为统一遵循各叶子正文的导航规则。
- 路由编码（name）与菜单 / 按钮权限码分开描述，守卫按声明的权限码校验，不以 name 代替功能权限；页面可进入不代替服务端的本人范围与操作授权判定。权限定义以 [权限规则](permission-rules.md#1-权限点矩阵) 为唯一真源。
- 子页正文定义产品交互要求；[Web 实现](../../../busyming-devhub-web/src/views/mcp)只作为代码引用入口。原型资产仅作只读视觉参考，其中的资源开放、业务域授权或服务登记不构成规则；[服务列表资产](../assets/web/service-list.html)不对应第六个菜单。
- 观测执行遵循公共 [SLS 契约](../../../busyming-skills-common/agent/MCP/sls/references/mcp-tools.md) 与 [ARMS 契约](../../../busyming-skills-common/agent/MCP/arms/references/mcp-tools.md)。

## 五叶页面正文索引

| 菜单功能 | 页面正文（唯一归属） | 专属规则 |
| ---- | ---- | ---- |
| [我的令牌](../我的令牌/SKILL.md) | [我的令牌](../我的令牌/references/web-ui.md#我的令牌)、[生成 / 编辑令牌](../我的令牌/references/web-ui.md#生成--编辑令牌)、[令牌详情](../我的令牌/references/web-ui.md#令牌详情) | [令牌状态机](../我的令牌/references/state-machine.md) |
| [权限分配](../权限分配/SKILL.md) | [权限分配](../权限分配/references/web-ui.md#权限分配)、[分配权限（含批量）](../权限分配/references/web-ui.md#分配权限) | [共享权限规则](permission-rules.md) |
| [数据源管理](../数据源管理/SKILL.md) | [数据源管理](../数据源管理/references/web-ui.md#数据源管理)、[数据源详情](../数据源管理/references/web-ui.md#数据源详情) | [数据库规则](../数据源管理/references/datasource-rules.md) |
| [研发工具资源](../研发工具资源/SKILL.md) | [研发代码仓页面主体](../研发工具资源/references/web-ui.md#研发代码仓)，不是另一个菜单 | [研发工具规则](../研发工具资源/references/devtool-rules.md) |
| [调用审计](../调用审计/SKILL.md) | [调用审计](../调用审计/references/web-ui.md#调用审计) | [审计规则](../调用审计/references/audit-rules.md) |
