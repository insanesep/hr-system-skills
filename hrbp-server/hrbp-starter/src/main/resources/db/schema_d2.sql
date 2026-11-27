-- 任务D2：招聘过程管理
USE hrbp;

-- 招聘职位（一个需求可拆多职位）
CREATE TABLE IF NOT EXISTS recruit_job (
    id BIGINT PRIMARY KEY,
    job_no VARCHAR(16) NOT NULL UNIQUE COMMENT 'J+5位序号',
    demand_id BIGINT NOT NULL,
    position_name VARCHAR(64) NOT NULL,
    job_level VARCHAR(8),
    headcount INT NOT NULL DEFAULT 1 COMMENT '在招人数',
    hired INT DEFAULT 0 COMMENT '已入职',
    job_status VARCHAR(8) DEFAULT '在招' COMMENT '在招/暂停/已关闭',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_demand (demand_id)
);

-- 应聘者
CREATE TABLE IF NOT EXISTS recruit_candidate (
    id BIGINT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    gender VARCHAR(4),
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(128),
    current_company VARCHAR(128),
    current_position VARCHAR(64),
    years_exp INT COMMENT '工作年限',
    education VARCHAR(16),
    expect_city VARCHAR(64),
    source_channel VARCHAR(32) COMMENT '来源渠道',
    lock_by VARCHAR(64) COMMENT '锁定人',
    lock_expire DATETIME COMMENT '锁定到期（7天）',
    talent_pool TINYINT DEFAULT 0 COMMENT '人才库状态',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_phone (phone)
);

-- 投递记录
CREATE TABLE IF NOT EXISTS recruit_application (
    id BIGINT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    demand_id BIGINT NOT NULL,
    candidate_id BIGINT NOT NULL,
    apply_status VARCHAR(16) NOT NULL DEFAULT '待筛选' COMMENT '待筛选/已筛选/初试/复试/终试/Offer/待入职/已入职/已淘汰/已放弃',
    entry_source VARCHAR(16) DEFAULT '过程创建' COMMENT '过程创建/台账填写/批量导入/渠道同步',
    pre_hold TINYINT DEFAULT 0 COMMENT '台账预占中 1/已释放 0',
    first_result VARCHAR(8) COMMENT '一面结果 通过/淘汰/待定',
    second_result VARCHAR(8),
    final_result VARCHAR(8),
    onboard_date DATE COMMENT '待入职日期',
    is_hired TINYINT DEFAULT 0,
    quit_reason VARCHAR(128) COMMENT '放弃原因',
    actual_level VARCHAR(8) COMMENT '实际入职职级',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_job (job_id),
    KEY idx_candidate (candidate_id)
);

-- 面试场次
CREATE TABLE IF NOT EXISTS recruit_interview (
    id BIGINT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    round VARCHAR(8) NOT NULL COMMENT '初试/复试/终试',
    interview_time DATETIME NOT NULL,
    location VARCHAR(128),
    interviewer VARCHAR(64) NOT NULL,
    invite_status VARCHAR(8) DEFAULT '待邀约' COMMENT '待邀约/已邀约/已接受/已拒绝',
    interview_status VARCHAR(8) DEFAULT '待面试' COMMENT '待面试/已完成/已取消/已改期',
    conclusion VARCHAR(8) COMMENT '通过/淘汰/待定',
    comment VARCHAR(1024),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_app (application_id)
);

-- Offer
CREATE TABLE IF NOT EXISTS recruit_offer (
    id BIGINT PRIMARY KEY,
    offer_no VARCHAR(32) NOT NULL UNIQUE,
    application_id BIGINT NOT NULL,
    candidate_name VARCHAR(64),
    position_name VARCHAR(64),
    job_level VARCHAR(8),
    monthly_base DECIMAL(12,2) COMMENT '月度固定',
    monthly_perf DECIMAL(12,2) COMMENT '月度绩效基数',
    annual_bonus_months DECIMAL(4,1) COMMENT '年度目标奖金月数',
    sign_bonus DECIMAL(12,2) COMMENT '签字费',
    annual_package DECIMAL(14,2) COMMENT '年度总包（派生）',
    offer_status VARCHAR(12) DEFAULT '待审批' COMMENT '待审批/审批中/待发送/已发送/已接受/已拒绝/已失效/已入职/已关闭',
    valid_until DATE COMMENT '有效期',
    onboard_date DATE COMMENT '拟入职日期',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_app (application_id)
);
