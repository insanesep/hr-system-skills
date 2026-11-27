-- 任务C：编制管理
USE hrbp;

-- 编制明细行（部门-职位-职级 级）
CREATE TABLE IF NOT EXISTS est_line (
    id BIGINT PRIMARY KEY,
    est_no VARCHAR(32) NOT NULL UNIQUE COMMENT '编制编号',
    est_plan_type VARCHAR(8) NOT NULL COMMENT '新增/保留/调出/划拨',
    year INT NOT NULL COMMENT '编制年度',
    start_date DATE NOT NULL COMMENT '编制起',
    end_date DATE NOT NULL COMMENT '编制止',
    quota INT NOT NULL DEFAULT 0 COMMENT '编制数量 0-9999',
    dept_lv1 VARCHAR(64) COMMENT '一级组织',
    dept_lv2 VARCHAR(64) COMMENT '二级组织',
    dept_lv3 VARCHAR(64) NOT NULL COMMENT '三级组织',
    dept_lv4 VARCHAR(64),
    dept_lv5 VARCHAR(64),
    dept_id BIGINT NOT NULL COMMENT '挂靠部门',
    position_id BIGINT COMMENT '标准职位',
    position_name VARCHAR(64) NOT NULL,
    direct_leader VARCHAR(64) COMMENT '直线上级',
    level_sequence CHAR(1) COMMENT '职级序列 M/P/S/O',
    job_level VARCHAR(8) COMMENT '职级',
    level_category VARCHAR(16) COMMENT '职级类别',
    emp_type VARCHAR(16) NOT NULL COMMENT '用工形式 全职-正式/实习生/劳务外包/兼职PT',
    incumbent INT NOT NULL DEFAULT 0 COMMENT '在编人数',
    recruit_hold INT NOT NULL DEFAULT 0 COMMENT '招聘占用（含台账预占）',
    est_status VARCHAR(8) NOT NULL DEFAULT '生效中' COMMENT '待审批/生效中/已驳回/已停用/已结束',
    source VARCHAR(16) DEFAULT '手工新增' COMMENT '手工新增/批量导入/划拨生成',
    remark VARCHAR(512),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_dept (dept_id),
    KEY idx_status (est_status)
);

-- 在编人员记录
CREATE TABLE IF NOT EXISTS est_incumbent (
    id BIGINT PRIMARY KEY,
    est_line_id BIGINT NOT NULL,
    emp_id BIGINT NOT NULL,
    emp_no VARCHAR(32),
    emp_name VARCHAR(64),
    source VARCHAR(16) NOT NULL COMMENT '招聘入职/存量初始化/编制纠错',
    confirm_status VARCHAR(16) NOT NULL DEFAULT '已确认' COMMENT '待编制确认/已确认',
    over_remark VARCHAR(256) COMMENT '超编处理备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_line (est_line_id),
    KEY idx_emp (emp_id)
);

-- 编制变更记录（只增不改）
CREATE TABLE IF NOT EXISTS est_change_log (
    id BIGINT PRIMARY KEY,
    est_line_id BIGINT NOT NULL,
    change_type VARCHAR(16) NOT NULL COMMENT '新增/调增/调减/延期/缩短/停用/启用/审批通过/审批驳回/在编确认/在编回减/划拨/纠错/导入',
    before_value VARCHAR(256),
    after_value VARCHAR(256),
    reason VARCHAR(512),
    operator VARCHAR(64),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_line (est_line_id)
);

-- 编制规划行（年度 × 组织 × 职级类别）
CREATE TABLE IF NOT EXISTS est_plan (
    id BIGINT PRIMARY KEY,
    year INT NOT NULL,
    org_name VARCHAR(64) NOT NULL COMMENT '组织（中心/部门）',
    level_category VARCHAR(16) NOT NULL,
    origin_quota INT DEFAULT 0 COMMENT '原编制数',
    adjust_quota INT DEFAULT 0 COMMENT '本次调整数（可编辑）',
    adjust_reason VARCHAR(512),
    march_headcount INT DEFAULT 0 COMMENT '3月在职快照',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_plan (year, org_name, level_category)
);
