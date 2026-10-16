# 后端接口规约

> 统一约束：路径 POST，Controller 直接返 VO，禁止返回 Map / DO / JSONObject。
> 错误码：`LOG_ERROR_REPORT.<场景>.<序号>`

## 接口列表

| # | 路径 | 用途 | 权限 |
|---|---|---|---|
| 1 | `POST /log-error-report/page` | 分页查询 | 菜单可见即可 |
| 2 | `POST /log-error-report/detail` | 详情 | 菜单可见即可 |
| 3 | `POST /log-error-report/stat` | 顶部统计卡 | 菜单可见即可 |
| 4 | `POST /log-error-report/resolve` | 标记已处理 | `OPS_LOG_ERROR_REPORT_RESOLVE` |
| 5 | `POST /log-error-report/unresolve` | 撤销标记 | `OPS_LOG_ERROR_REPORT_RESOLVE` |
| 6 | `POST /log-error-report/ignore` | 忽略噪声 | `OPS_LOG_ERROR_REPORT_IGNORE` |
| 7 | `POST /log-error-report/export` | 导出（接统一导出中心） | `OPS_LOG_ERROR_REPORT_EXPORT` |
| 8 | `POST /log-error-report/rerun` | 手动重跑 | `OPS_LOG_ERROR_REPORT_RERUN` |

## Request / VO 字段（核心）

### LogErrorReportPageRequest
- `reportDate: String`（yyyy-MM-dd，默认 T-1）
- `appName: String?`
- `status: String?`（PENDING / RESOLVED / IGNORED）
- `keyword: String?`（命中 errorClass / errorMessage / fingerprint）
- `minOccurCount: Integer?`
- `pageNum: Integer`（默认 1）
- `pageSize: Integer`（默认 20，最大 100）

### LogErrorReportVO（列表行）
- `id, reportDate, appName, errorClass, errorMessage, occurCount`
- `firstOccurAt, lastOccurAt`
- `status, resolvedBy, resolvedAt`
- `traceIdSamples: List<String>`（≤5）
- `slsConsoleUrl: String`（后端拼好的 deeplink）

### LogErrorReportDetailVO（详情）
- 在 `LogErrorReportVO` 基础上补：
  - `fingerprint, logStore`
  - `messageSample, stackTraceSample`
  - `resolveRemark`
  - `slsConsoleUrlByTraceId: Map<String, String>`（每个 traceId 一个跳转链接）

### LogErrorReportStatVO（统计卡）
- `totalGroups`（异常分组数）
- `totalOccurCount`（总次数）
- `pendingCount, resolvedCount, ignoredCount`

### ResolveRequest / IgnoreRequest
- `id: Long`
- `remark: String`（必填，≤500 字符；resolve / ignore 共用）

## 错误码

| Code | 场景 |
|---|---|
| `LOG_ERROR_REPORT.NOT_FOUND.001` | id 不存在 |
| `LOG_ERROR_REPORT.STATUS_INVALID.002` | 状态流转非法（如已 RESOLVED 再 resolve） |
| `LOG_ERROR_REPORT.RERUN_FORBIDDEN.003` | 非运维管理员调 rerun |
| `LOG_ERROR_REPORT.REMARK_REQUIRED.004` | resolve / ignore 未传备注 |
| `LOG_ERROR_REPORT.DATE_OUT_OF_RANGE.005` | 查询/重跑日期超出 90 天保留期 |

## 操作日志（六要素）

`resolve / unresolve / ignore / rerun` 四个写接口均必须打操作日志：

| 要素 | 取值 |
|---|---|
| 人 | 当前登录用户 |
| 时间 | now |
| 设备 | 请求 UA |
| 动作 | RESOLVE / UNRESOLVE / IGNORE / RERUN |
| 目标 | `log_error_daily_report#{id}` 或 `reportDate` |
| 变更详情 | 旧状态→新状态、备注 |

## SLS 控制台 Deeplink 拼接

```
https://sls.console.aliyun.com/lognext/project/{project}/logsearch/{logStore}
  ?query={URL_ENCODED:traceId:"<value>"}
  &startTime={epoch ms of firstOccurAt - 5min}
  &endTime={epoch ms of lastOccurAt + 5min}
```

`project` 取 `busyming.sls.project` 配置；`logStore` 取报表项 `log_store` 字段。
