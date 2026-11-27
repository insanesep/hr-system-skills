-- 任务D1：招聘需求管理
USE hrbp;

-- 招聘需求
CREATE TABLE IF NOT EXISTS recruit_demand (
    id BIGINT PRIMARY KEY,
    demand_no VARCHAR(32) NOT NULL UNIQUE COMMENT '需求编号',
    recruit_quarter VARCHAR(8) NOT NULL COMMENT '招聘季度 如 2026Q1',
    est_line_id BIGINT COMMENT '关联编制明细行',
    dept_id BIGINT NOT NULL,
    dept_path VARCHAR(256) COMMENT '组织快照',
    position_id BIGINT,
    position_name VARCHAR(64) NOT NULL,
    job_level VARCHAR(8),
    level_category VARCHAR(16),
    job_category VARCHAR(8) COMMENT '岗位类别 关键/S1/S2/A',
    job_family VARCHAR(64) COMMENT '岗位族',
    work_nature VARCHAR(16) COMMENT '工作性质',
    emp_type VARCHAR(16) NOT NULL COMMENT '用工形式',
    headcount INT NOT NULL COMMENT '需求人数',
    arrived INT DEFAULT 0 COMMENT '已到岗',
    offered INT DEFAULT 0 COMMENT '已发Offer',
    accepted INT DEFAULT 0 COMMENT '已接受Offer',
    in_transit INT DEFAULT 0 COMMENT '在途人数',
    demand_status VARCHAR(8) NOT NULL DEFAULT '草稿' COMMENT '草稿/待审批/招聘中/已完成/已关闭',
    warning_flag VARCHAR(32) COMMENT '需求警示 编制变更待处理/超编需求',
    expect_date DATE COMMENT '期望到岗日期',
    final_interviewer VARCHAR(64) COMMENT '业务终面人',
    recruit_owner VARCHAR(64) COMMENT '招聘负责人',
    collaborate_hr VARCHAR(64) COMMENT '协同招聘HR',
    outsource_flag TINYINT DEFAULT 0 COMMENT '外包需求标记',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_status (demand_status),
    KEY idx_dept (dept_id)
);

-- 需求授权（只读授权）
CREATE TABLE IF NOT EXISTS recruit_demand_grant (
    id BIGINT PRIMARY KEY,
    demand_id BIGINT NOT NULL,
    grantee_name VARCHAR(64) NOT NULL COMMENT '被授权人',
    grant_by VARCHAR(64),
    revoked TINYINT DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_demand (demand_id)
);

-- 操作记录（招聘域通用，只增不改）
CREATE TABLE IF NOT EXISTS recruit_op_log (
    id BIGINT PRIMARY KEY,
    biz_type VARCHAR(16) NOT NULL COMMENT '需求/职位/应聘者/面试/Offer/台账',
    biz_id BIGINT NOT NULL,
    op_type VARCHAR(32) NOT NULL,
    content VARCHAR(512),
    operator VARCHAR(64),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_biz (biz_type, biz_id)
);
