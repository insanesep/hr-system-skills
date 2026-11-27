-- 任务G：人才信息 + 人才盘点九宫格
USE hrbp;

-- 人才信息记录（版本化，编辑=新版本，撤销=标记）
CREATE TABLE IF NOT EXISTS talent_record (
    id BIGINT PRIMARY KEY,
    record_no VARCHAR(32) NOT NULL COMMENT '类型前缀+年度流水 KI/IV/RP/OB/TR',
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    record_type VARCHAR(16) NOT NULL COMMENT '关键信息/访谈沟通/述职/会议观察/人才盘点',
    version INT NOT NULL DEFAULT 1,
    content TEXT,
    record_date DATE,
    status VARCHAR(8) DEFAULT '有效' COMMENT '有效/已撤销',
    revoke_reason VARCHAR(256),
    edit_reason VARCHAR(256) COMMENT '更正原因（编辑必填）',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp_type (emp_id, record_type),
    KEY idx_record_no (record_no)
);

-- 盘点周期
CREATE TABLE IF NOT EXISTS review_cycle (
    id BIGINT PRIMARY KEY,
    cycle_name VARCHAR(64) NOT NULL,
    start_date DATE, end_date DATE,
    status VARCHAR(8) DEFAULT '进行中' COMMENT '进行中/已锁定',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

-- 盘点明细（员工 × 周期唯一）
CREATE TABLE IF NOT EXISTS review_detail (
    id BIGINT PRIMARY KEY,
    cycle_id BIGINT NOT NULL,
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    dept_name VARCHAR(64),
    position_name VARCHAR(64),
    job_level VARCHAR(8),
    match_level VARCHAR(4) COMMENT '人岗匹配度 高/中/低',
    match_note VARCHAR(256),
    potential VARCHAR(4) COMMENT '潜力 高/中/低',
    potential_note VARCHAR(256),
    is_key_position TINYINT DEFAULT 0 COMMENT '是否关键岗',
    key_develop VARCHAR(8) COMMENT '重点培养 是/否/待观察',
    manager_action VARCHAR(256) COMMENT '后续管理动作',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_cycle_emp (cycle_id, emp_id)
);
