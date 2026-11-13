# 研发报告 用量数据接口

> 本文件为研发报告共用的用量类数据源真源，供人员产出报告与项目进度报告按各自人员及项目范围引用。功能排期卡片 MCP 调用、容错口径与报告推送旁路契约见共享真源 [`../../报告配置/references/data-source-api.md`](../../报告配置/references/data-source-api.md)。
>
> 配置来源按会话类型区分：服务端生成会话由服务端注入基址与令牌；外部会话从生成环境约定的 `config.yaml` 读取（`api.devops_base_url` / `api.foundation_base_url`）。
>
> 🚨 令牌只从会话配置读取使用，禁止把 token 值写进任何报告、日志输出或 skill 文件。
> 接口调用统一设置 30s 超时。响应统一取 `data` 字段（无 `data` 时整体即数据）。
> 响应可能较大：先将响应落盘为临时文件，再读取分析。
>
> 人员范围：周报、日报、项目进度报告与外部会话的 Qoder 数据包统一引用 [项目管理 #report-scope](../../../研发管理/项目管理/references/business-rule.md#report-scope) 的生成名单快照（兼容 `scope=ROSTER`），人员标识裁决见 [#identity](../../../研发管理/项目管理/references/business-rule.md#identity)。项目进度报告另按域参与关系过滤。调用方注入或外部取数均关联同一快照，不以组织全量兜底；名单外不计入，同门户稳定 ID 多角色只计一次，角色不重建名单。无 Qoder 账号、身份歧义、记录非法或来源查询失败标「未取得」；已确认 Qoder 账号的成员在自然日无快照记录时按无用量明确补 0，不伪造完整团队总量。

统计区间记为 START ~ END，格式 YYYY-MM-DD。

源失败或拉取失败时对应指标标「未取得」，严禁编造数字或补 0；单接口失败不影响其他源。Qoder 已确认账号的成员缺行按无用量补 0，身份歧义、记录非法或来源查询失败不得作为完整团队总量。

## 1. Qoder 成员用量（devops，GET）

- 数据字段：`data.members[] / colTotals[] / grandTotal`
- 金额换算：Credits ÷ 2000 × 300，取整，单位元

## 2. Qoder 模型用量占比（devops，GET）

- 数据字段：`data.members[] / tiers[] / matrix[i][j]（成员 i 在等级 j 的 Credits）/ rowTotals / colTotals / grandTotal`

## 3. 功能使用量报表（devops）

- 数据字段：`data.kpi{totalEvents,activeUsers,activeFunctions,inactiveFunctionsCount}`、
  `data.trend[]{date,events,users}`、
  `data.routes[]{routePath,routeName,clicks,uniqUsers,ratio,inactive}`

## 4. MCP 工具使用情况（foundation）

- 数据字段：`data.kpi{totalCalls,activeUsers,activeTools,registeredTools,inactiveToolsCount,successRate,avgDurationMs}`、
  `data.scopes[]{scopeCn,calls,uniqUsers,activeTools,ratio}`、
  `data.tools[]{toolNameCn,scopeCn,calls,uniqUsers,successRate,avgDurationMs,ratio}`、
  `data.inactiveTools[]`（中文名，零调用工具）
- 工具名与业务域**直接用接口返回的中文名**，禁止自行翻译改写
