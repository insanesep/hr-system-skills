# 企微告警模板（灰度后启用）

## 触发条件

- 单个报表项 `occur_count >= alertThreshold`（默认 50，Nacos 配置 `busyming.log-error-report.alertThreshold`）
- 同 `(reportDate, appName, fingerprint)` 一天只发一次（本地去重表 `log_error_daily_alert_record`）
- 全局开关 `busyming.log-error-report.alertEnabled=false` 默认关闭，灰度后开启

## 接收方

企微应用消息，群或人由"研发告警"配置项决定，复用「创建企微应用消息发送公共skill」的发送能力。

## 消息模板（Markdown）

```
**【日志异常告警】{appName}**

> 日期：{reportDate}
> 异常：{errorClass}
> 出现次数：{occurCount}
> 首次：{firstOccurAt}
> 最后：{lastOccurAt}

**消息样例**
{messageSampleTruncated 200}

**TraceId 样例**：{traceIdSamples join ", "}

[查看详情]({webDetailUrl})  ·  [跳转 SLS]({slsConsoleUrl})
```

## 字段约束

- `messageSampleTruncated`：超过 200 字符截断 + `…`
- `webDetailUrl`：`{portalBaseUrl}/ops/log-error-report?id={id}`，前端打开后自动展开详情抽屉
- `slsConsoleUrl`：取首个 traceId 的 deeplink

## 失败兜底

- 企微推送失败不阻断主任务
- 失败记录写 `log_error_daily_alert_record.send_status = FAIL`，下次任务执行时由独立补偿任务重试 3 次
