# 数据模型 DDL · 每日日志异常报表

> 本 SQL 为方案侧草案，最终发版以 `docs/{yyyyMMdd}/log-error-daily-report/` 下的迁移脚本为准。
> 字段定义遵循「SQL字段定义规范（主键UNSIGNED + 非空默认值 + 审计字段）」。

```sql
CREATE TABLE log_error_daily_report (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    report_date         DATE            NOT NULL                COMMENT '统计日期(T-1)',
    app_name            VARCHAR(64)     NOT NULL DEFAULT ''     COMMENT '应用名',
    fingerprint         CHAR(32)        NOT NULL DEFAULT ''     COMMENT '异常指纹MD5',
    error_class         VARCHAR(255)    NOT NULL DEFAULT ''     COMMENT '异常类名',
    error_message       VARCHAR(2000)   NOT NULL DEFAULT ''     COMMENT '异常消息(归一化)',
    occur_count         INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '出现次数',
    first_occur_at      DATETIME        NULL                    COMMENT '首次出现',
    last_occur_at       DATETIME        NULL                    COMMENT '最后出现',
    trace_id_samples    VARCHAR(512)    NOT NULL DEFAULT '[]'   COMMENT 'TraceId样例JSON数组',
    message_sample      TEXT            NULL                    COMMENT '原始消息样例(截断2000字符)',
    stack_trace_sample  TEXT            NULL                    COMMENT '原始堆栈样例(截断8000字符)',
    log_store           VARCHAR(64)     NOT NULL DEFAULT ''     COMMENT '所属LogStore',
    status              VARCHAR(16)     NOT NULL DEFAULT 'PENDING' COMMENT '状态:PENDING/RESOLVED/IGNORED',
    resolved_by         VARCHAR(64)     NOT NULL DEFAULT ''     COMMENT '处理人(用户名)',
    resolved_at         DATETIME        NULL                    COMMENT '处理时间',
    resolve_remark      VARCHAR(500)    NOT NULL DEFAULT ''     COMMENT '处理备注',
    create_time         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    create_by           VARCHAR(64)     NOT NULL DEFAULT 'system',
    update_by           VARCHAR(64)     NOT NULL DEFAULT 'system',
    is_deleted          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_date_app_fingerprint (report_date, app_name, fingerprint),
    KEY idx_date_status (report_date, status),
    KEY idx_status_count (status, occur_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日日志异常聚合报表';
```

## 字段说明

| 字段 | 类型 | 关键约束 |
|---|---|---|
| `report_date + app_name + fingerprint` | 唯一键 | 业务幂等键，重跑走 `INSERT ON DUPLICATE KEY UPDATE` |
| `status` | 枚举 | 重跑时禁止覆盖此字段 |
| `resolved_by / resolved_at / resolve_remark` | 处理快照 | 重跑时禁止覆盖 |
| `occur_count / first_occur_at / last_occur_at / trace_id_samples / message_sample / stack_trace_sample` | 统计快照 | 重跑允许覆盖 |
| `idx_date_status` | 列表筛选索引 | 覆盖默认查询条件（按日期 + 状态） |
| `idx_status_count` | 排序索引 | 默认按 PENDING + 出现次数倒序 |

## 重跑 UPDATE 字段白名单

ON DUPLICATE KEY UPDATE 仅 SET 以下列，确保用户处理状态不被覆盖：

```
occur_count, first_occur_at, last_occur_at,
trace_id_samples, message_sample, stack_trace_sample,
error_class, error_message, log_store,
update_time, update_by
```

明确**不**在 SET 列表中的字段：`status / resolved_by / resolved_at / resolve_remark / create_time / create_by`。
