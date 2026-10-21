# 研发周报 用量数据接口

> 本文件为研发周报（人员产出报告）专属的用量类数据源真源。排期双卡 MCP 调用、容错口径与报告推送旁路契约见共享真源 [`../../报告配置/references/data-source-api.md`](../../报告配置/references/data-source-api.md)。
>
> 配置来源按会话类型区分：服务端生成会话由服务端注入基址与令牌；外部会话从生成环境约定的 `config.yaml` 读取（`api.devops_base_url` / `api.foundation_base_url`）。
>
> 🚨 令牌只从会话配置读取使用，禁止把 token 值写进任何报告、日志输出或 skill 文件。
> 接口调用统一设置 30s 超时。响应统一取 `data` 字段（无 `data` 时整体即数据）。
> 响应可能较大：先将响应落盘为临时文件，再读取分析。
>
> 人员范围：研发周报/日报的 Qoder 成员与用量接口统一使用研发团队名单（`scope=ROSTER`，名单由报告配置维护）；名单外成员不得出现在报告中。服务端生成会话由调用方直接注入过滤后的数据，外部会话按同一范围调用。

统计区间记为 START ~ END，格式 YYYY-MM-DD。

任一接口无数据 / 拉取失败：对应指标、章节或人员字段直接省略，不在报告中写缺失或失败说明，严禁编造数字；单接口失败不影响其它接口。

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
