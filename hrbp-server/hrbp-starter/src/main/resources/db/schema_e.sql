-- 任务E：入转调离 + 合同 + 成长事件
USE hrbp;

-- 入职单
CREATE TABLE IF NOT EXISTS ob_onboarding (
    id BIGINT PRIMARY KEY,
    onboard_no VARCHAR(32) NOT NULL UNIQUE,
    offer_id BIGINT COMMENT '来源Offer',
    emp_name VARCHAR(64) NOT NULL,
    phone VARCHAR(32),
    dept_id BIGINT,
    dept_name VARCHAR(64),
    position_name VARCHAR(64),
    job_level VARCHAR(8),
    plan_date DATE NOT NULL COMMENT '计划入职日期',
    actual_date DATE COMMENT '实际入职日期',
    onboard_result VARCHAR(8) DEFAULT '待到岗' COMMENT '待到岗/已到岗/未到岗/已取消',
    doc_status VARCHAR(8) DEFAULT '待入职' COMMENT '待入职/已入职/未到岗/已取消',
    collect_status VARCHAR(8) DEFAULT '未发送' COMMENT '信息采集 未发送/已发送/已暂存/已提交',
    material_status VARCHAR(8) DEFAULT '未提交' COMMENT '材料 未提交/未交齐/已交齐',
    emp_id BIGINT COMMENT '确认入职后生成的员工id',
    remark VARCHAR(512),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

-- 转正单
CREATE TABLE IF NOT EXISTS reg_regularization (
    id BIGINT PRIMARY KEY,
    reg_no VARCHAR(32) NOT NULL UNIQUE,
    onboard_no VARCHAR(32),
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    dept_name VARCHAR(64),
    position_name VARCHAR(64),
    job_level VARCHAR(8),
    trial_start DATE,
    trial_end DATE,
    trial_months INT COMMENT '试用期月数',
    reg_type VARCHAR(16) DEFAULT '按期' COMMENT '按期/提前/延期/试用期不通过',
    eval_score DECIMAL(3,1) COMMENT '评估总分 1-5',
    eval_conclusion VARCHAR(8) COMMENT '通过/延期/不通过',
    doc_status VARCHAR(8) DEFAULT '待评估' COMMENT '待评估/待审批/已转正/已延期/未通过/已撤销',
    actual_date DATE COMMENT '实际转正日期',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);

-- 异动单（调岗/晋升/降职）
CREATE TABLE IF NOT EXISTS mv_movement (
    id BIGINT PRIMARY KEY,
    mv_no VARCHAR(32) NOT NULL UNIQUE,
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    mv_type VARCHAR(8) COMMENT '调岗/晋升/降职（由职级自动判定）',
    from_dept VARCHAR(64), from_position VARCHAR(64), from_level VARCHAR(8),
    to_dept_id BIGINT, to_dept VARCHAR(64), to_position VARCHAR(64), to_level VARCHAR(8),
    reason VARCHAR(512),
    effective_date DATE NOT NULL,
    doc_status VARCHAR(8) DEFAULT '草稿' COMMENT '草稿/待审批/待生效/已生效/已驳回/已撤销',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);

-- 离职单
CREATE TABLE IF NOT EXISTS off_offboarding (
    id BIGINT PRIMARY KEY,
    off_no VARCHAR(32) NOT NULL UNIQUE,
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    dept_name VARCHAR(64),
    position_name VARCHAR(64),
    off_type VARCHAR(16) NOT NULL COMMENT '主动离职/协商一致/公司单方/合同到期不续签/试用期不通过/退休/其他',
    off_reason VARCHAR(256),
    last_work_date DATE NOT NULL,
    handover_status VARCHAR(8) DEFAULT '待交接' COMMENT '待交接/交接中/已完成',
    doc_status VARCHAR(8) DEFAULT '草稿' COMMENT '草稿/待审批/待离职/待确认/已离职/已撤销',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);

-- 合同
CREATE TABLE IF NOT EXISTS ctr_contract (
    id BIGINT PRIMARY KEY,
    contract_no VARCHAR(64) NOT NULL UNIQUE,
    emp_id BIGINT NOT NULL,
    emp_name VARCHAR(64),
    contract_type VARCHAR(16) NOT NULL COMMENT '固定期限/无固定期限/任务期限',
    sign_date DATE,
    start_date DATE NOT NULL,
    end_date DATE COMMENT '无固定期限为空',
    status VARCHAR(8) DEFAULT '待签订' COMMENT '待签订/待生效/生效中/已续签/已到期/已解除',
    source_type VARCHAR(16) DEFAULT '入职生成' COMMENT '入职生成/手工补录/续签生成',
    origin_no VARCHAR(64) COMMENT '原合同编号（续签）',
    release_date DATE, release_reason VARCHAR(256),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);

-- 成长事件（事件总线，只增不改）
CREATE TABLE IF NOT EXISTS growth_event (
    id BIGINT PRIMARY KEY,
    event_no VARCHAR(40) NOT NULL UNIQUE,
    emp_id BIGINT NOT NULL,
    emp_no VARCHAR(32),
    emp_name VARCHAR(64),
    event_type VARCHAR(16) NOT NULL COMMENT '入职/转正/调岗/晋升/降职/绩效/离职/合同签订/合同续签/合同解除等',
    event_date DATE NOT NULL,
    title VARCHAR(128),
    summary VARCHAR(300),
    source_module VARCHAR(16),
    source_no VARCHAR(64),
    event_status VARCHAR(8) DEFAULT '有效' COMMENT '有效/已更正/已撤销',
    idem_key VARCHAR(128) NOT NULL UNIQUE COMMENT '幂等键=来源单据号+版本+事件类型',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);
