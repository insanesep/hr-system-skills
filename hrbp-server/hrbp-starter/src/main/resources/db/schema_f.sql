-- 任务F：考勤 + 绩效
USE hrbp;

-- ========== 考勤 ==========
-- 日考勤记录
CREATE TABLE IF NOT EXISTS att_record (
    id BIGINT PRIMARY KEY,
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    att_date DATE NOT NULL,
    shift_name VARCHAR(32) DEFAULT '标准班',
    check_in TIME, check_out TIME,
    day_status VARCHAR(8) NOT NULL DEFAULT '正常' COMMENT '正常/迟到/早退/缺卡/旷工/请假/加班/出差/休息日/节假日',
    exception_type VARCHAR(32) COMMENT '异常类型多值',
    data_source VARCHAR(16) DEFAULT '系统生成',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_emp_date (emp_id, att_date)
);

-- 假勤申请
CREATE TABLE IF NOT EXISTS att_leave (
    id BIGINT PRIMARY KEY,
    leave_no VARCHAR(32) NOT NULL UNIQUE,
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    leave_type VARCHAR(8) NOT NULL COMMENT '请假/加班/出差/补卡',
    sub_type VARCHAR(16) COMMENT '事假/病假/年假等',
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    hours DECIMAL(5,1),
    reason VARCHAR(512),
    approve_status VARCHAR(8) DEFAULT '待审批' COMMENT '待审批/已通过/已驳回/已撤销',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);

-- 月度汇总
CREATE TABLE IF NOT EXISTS att_month (
    id BIGINT PRIMARY KEY,
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    month VARCHAR(7) NOT NULL COMMENT 'YYYY-MM',
    should_days INT DEFAULT 0, actual_days INT DEFAULT 0,
    late_count INT DEFAULT 0, early_count INT DEFAULT 0, miss_count INT DEFAULT 0, absent_count INT DEFAULT 0,
    leave_hours DECIMAL(6,1) DEFAULT 0, overtime_hours DECIMAL(6,1) DEFAULT 0, travel_days INT DEFAULT 0,
    status VARCHAR(8) DEFAULT '待确认' COMMENT '待确认/已确认/已锁定',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_emp_month (emp_id, month)
);

-- ========== 绩效 ==========
-- 考核周期
CREATE TABLE IF NOT EXISTS perf_period (
    id BIGINT PRIMARY KEY,
    period_name VARCHAR(32) NOT NULL UNIQUE,
    period_type VARCHAR(8) NOT NULL COMMENT '季度/年度',
    start_date DATE, end_date DATE,
    stage VARCHAR(12) NOT NULL DEFAULT '目标设定' COMMENT '目标设定/目标已生效/自评中/上级评价中/团队通晒/中心通晒/结果已生效/已归档',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

-- 绩效目标
CREATE TABLE IF NOT EXISTS perf_target (
    id BIGINT PRIMARY KEY,
    period_id BIGINT NOT NULL,
    owner_type VARCHAR(8) DEFAULT '个人' COMMENT '个人/组/部门',
    emp_id BIGINT,
    emp_name VARCHAR(64),
    dept_name VARCHAR(64),
    title VARCHAR(128) NOT NULL,
    metric_desc VARCHAR(512) COMMENT '指标描述',
    standard VARCHAR(256) COMMENT '衡量标准',
    weight INT NOT NULL COMMENT '权重%',
    progress INT DEFAULT 0 COMMENT '进度%',
    status VARCHAR(8) DEFAULT '草稿' COMMENT '草稿/待确认/已生效/已归档',
    version INT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_period_emp (period_id, emp_id)
);

-- 考核表（员工 × 周期）
CREATE TABLE IF NOT EXISTS perf_review (
    id BIGINT PRIMARY KEY,
    period_id BIGINT NOT NULL,
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    dept_name VARCHAR(64),
    self_score DECIMAL(5,1) COMMENT '自评总分',
    manager_score DECIMAL(5,1) COMMENT '上级总分',
    suggest_grade VARCHAR(2) COMMENT '建议等级',
    final_grade VARCHAR(2) COMMENT '最终等级 S/A/B/C/D',
    follow_plan VARCHAR(512) COMMENT '后续计划',
    non_b_reason VARCHAR(256) COMMENT '非B原因',
    status VARCHAR(12) DEFAULT '未开始' COMMENT '未开始/自评中/待上级评价/待通晒/已校准/已生效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_period_emp (period_id, emp_id)
);

-- 评价项（目标权重快照 + 双向评分）
CREATE TABLE IF NOT EXISTS perf_review_item (
    id BIGINT PRIMARY KEY,
    review_id BIGINT NOT NULL,
    target_title VARCHAR(128),
    weight INT,
    self_score DECIMAL(4,1), self_comment VARCHAR(512),
    manager_score DECIMAL(4,1), manager_comment VARCHAR(512),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_review (review_id)
);

-- 等级参数（建议等级映射）
CREATE TABLE IF NOT EXISTS perf_grade_config (
    id BIGINT PRIMARY KEY,
    grade VARCHAR(2) NOT NULL UNIQUE,
    score_floor DECIMAL(4,1) NOT NULL COMMENT '分数下限',
    coefficient DECIMAL(3,1) NOT NULL COMMENT '绩效系数',
    distribution_pct INT COMMENT '分布基线%',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);
