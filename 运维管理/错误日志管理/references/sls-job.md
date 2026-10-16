# SLS 查询与定时任务约束

## 任务标识

| 项 | 值 |
|---|---|
| Bean 名 | `logErrorDailyReportJob` |
| 中文名 | `每日日志异常报表汇总` |
| Cron | `0 0 2 * * ?`（每日 02:00，**走 Nacos 配置**，禁硬编码） |
| 重试 | 3 次，间隔 10 / 30 / 60 min |
| 入参 | `reportDate=yyyy-MM-dd`（可选，缺省 T-1） |
| 时区 | `Asia/Shanghai` |
| 失败告警 | 连续失败 2 次 → 企微告警 |

清理任务：
- Bean `logErrorDailyReportCleanJob`
- Cron `0 30 2 * * ?`
- 删除 `report_date < TODAY - 90`

## SLS 查询规则

- 复用 `SlsService#getLogsByCondition`（`busyming-sls-spring-boot-starter`）
- LogStore 默认 `${spring.application.name}-${spring.profiles.active}`，多个 LogStore 由配置 `busyming.log-error-report.logstores: [...]` 提供
- 时间窗：`[T-1 00:00:00, T-1 23:59:59]`（系统时区）
- 过滤：`level: ERROR OR level: FATAL`
- 分页：`pageSize=500`，循环至 `total=0`
- 单 LogStore 单日上限 100,000 条；超限只取前 100,000 并触发"采集截断"告警
- 任务时间晚于窗口结束 ≥ 2h，避免 SLS 写入延迟漏数据

## 关键不变量

1. **静默丢数据防控**：SLS 查询失败 / JSON 解析失败 / 落库失败必须 throw，让 ScheduleX 标记任务失败；禁止 `catch (Exception ignored) {}`
2. **重跑幂等**：同 `reportDate + appName + fingerprint` 走 ON DUPLICATE KEY UPDATE，仅刷新统计字段，**不动**用户处理状态字段（见 `ddl.md` UPDATE 字段白名单）
3. **traceIdSamples**：JSON 数组，最多 5 个元素，按出现先后保留前 5 个
4. **样例截断**：`message_sample` ≤ 2000 字符；`stack_trace_sample` ≤ 8000 字符

## 处理流程伪代码

```
fun execute(reportDate ?: T-1):
    window = [00:00:00, 23:59:59] of reportDate in Asia/Shanghai
    aggMap = LinkedHashMap<groupKey, Aggregator>()  // 顺序保留 traceId 样例

    for logStore in configuredLogStores:
        cursor = 0; pulled = 0
        loop:
            page = sls.query(logStore, level in [ERROR, FATAL], window, pageSize=500, offset=cursor)
            if page.empty: break
            for log in page:
                fp = fingerprint(log)
                key = (reportDate, appNameOf(log), fp)
                aggMap.computeIfAbsent(key, Aggregator::new).accept(log)
            pulled += page.size
            if pulled >= 100_000:
                alert("SLS 采集截断", logStore, reportDate)
                break
            cursor += page.size

    for (key, agg) in aggMap:
        upsertWithStatusGuard(toEntity(key, agg))    // 仅 SET 统计字段

    if alertEnabled:
        for entity where occur_count >= alertThreshold and not yet alerted today:
            sendWecomAlert(entity); markAlerted(entity)
```

## 手动重跑入口

- 接口 `POST /log-error-report/rerun`，参数 `reportDate`
- 仅"运维管理员"可调用，需打操作日志
- 内部直接复用上述流程，复跑后状态字段不变
