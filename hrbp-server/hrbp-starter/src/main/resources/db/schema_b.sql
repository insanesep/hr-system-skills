-- 任务B：主数据域（部门树 / 职级矩阵 / 岗位 / 员工）
USE hrbp;

-- ========== 组织管理 ==========
-- 部门（五级组织树）
CREATE TABLE IF NOT EXISTS org_department (
    id BIGINT PRIMARY KEY,
    parent_id BIGINT DEFAULT 0 COMMENT '上级部门，根=0',
    dept_name VARCHAR(30) NOT NULL,
    dept_code VARCHAR(32) NOT NULL COMMENT '全局唯一，删除后释放',
    level_type VARCHAR(16) NOT NULL COMMENT '公司/中心/部门/小组/子小组',
    dept_path VARCHAR(512) COMMENT '路径，如 /1/12/123/',
    leader_id BIGINT COMMENT '负责人（员工id）',
    quota INT DEFAULT 0 COMMENT '编制人数 0-9999',
    sort INT DEFAULT 0,
    status TINYINT DEFAULT 1 COMMENT '1启用 0停用',
    found_date DATE COMMENT '成立日期',
    revoke_date DATE COMMENT '撤销日期',
    remark VARCHAR(512),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_dept_code (dept_code)
);

-- 职级（职级矩阵唯一真源：M/P/S/O 四序列）
CREATE TABLE IF NOT EXISTS org_job_level (
    id BIGINT PRIMARY KEY,
    level_code VARCHAR(8) NOT NULL UNIQUE COMMENT '如 P5、M3',
    sequence CHAR(1) NOT NULL COMMENT 'M/P/S/O',
    seq_no INT NOT NULL COMMENT '序号',
    level_category VARCHAR(16) NOT NULL COMMENT '战略决策层/总监级/经理级/主管级/员工级',
    is_management TINYINT DEFAULT 0 COMMENT '管理岗标记',
    status TINYINT DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

-- 岗位序列（职位族）
CREATE TABLE IF NOT EXISTS org_job_family (
    id BIGINT PRIMARY KEY,
    family_code VARCHAR(32) NOT NULL UNIQUE,
    family_name VARCHAR(64) NOT NULL,
    level_range VARCHAR(16) COMMENT '适用职级段，如 P3-P8',
    build_status VARCHAR(16) DEFAULT '未建设' COMMENT '未建设/建设中/已启用/停用',
    remark VARCHAR(512),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

-- 标准职位
CREATE TABLE IF NOT EXISTS org_position (
    id BIGINT PRIMARY KEY,
    position_code VARCHAR(32) NOT NULL UNIQUE COMMENT '序列编码-四位序号',
    position_name VARCHAR(64) NOT NULL,
    family_id BIGINT NOT NULL COMMENT '所属岗位序列',
    position_type VARCHAR(8) NOT NULL COMMENT '专业/管理',
    level_min VARCHAR(8) COMMENT '适用职级下限',
    level_max VARCHAR(8) COMMENT '适用职级上限',
    default_level VARCHAR(8) COMMENT '默认职级',
    default_emp_type VARCHAR(16) COMMENT '默认用工形式',
    status VARCHAR(16) DEFAULT '待启用' COMMENT '待启用/已启用/已停用',
    version INT DEFAULT 1,
    remark VARCHAR(512),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

-- ========== 员工档案 ==========
-- 员工
CREATE TABLE IF NOT EXISTS emp_employee (
    id BIGINT PRIMARY KEY,
    emp_no VARCHAR(32) NOT NULL UNIQUE COMMENT '工号',
    emp_name VARCHAR(64) NOT NULL,
    gender VARCHAR(4),
    birth_date DATE,
    phone VARCHAR(32) COMMENT '脱敏存储展示，明文加密/不落明文（本版按需求只读展示脱敏）',
    email VARCHAR(128),
    id_card VARCHAR(32),
    dept_id BIGINT,
    position_id BIGINT COMMENT '当前标准职位',
    position_name VARCHAR(64) COMMENT '当前职位名称（冗余快照）',
    job_level VARCHAR(8) COMMENT '当前职级',
    direct_leader_id BIGINT COMMENT '直属上级',
    work_location VARCHAR(64),
    hire_date DATE COMMENT '入职日期',
    regular_date DATE COMMENT '转正日期',
    emp_status VARCHAR(8) DEFAULT '在职' COMMENT '在职/离职',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0
);

-- 任职记录
CREATE TABLE IF NOT EXISTS emp_job_record (
    id BIGINT PRIMARY KEY,
    emp_id BIGINT NOT NULL,
    dept_id BIGINT,
    dept_name VARCHAR(64),
    position_name VARCHAR(64),
    record_type VARCHAR(8) NOT NULL COMMENT '新入职/调岗/晋升/降职',
    start_date DATE NOT NULL,
    end_date DATE,
    is_current TINYINT DEFAULT 0 COMMENT '至多一条为1',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);

-- 绩效记录（员工档案页签只读展示）
CREATE TABLE IF NOT EXISTS emp_perf_record (
    id BIGINT PRIMARY KEY,
    emp_id BIGINT NOT NULL,
    period_name VARCHAR(32) NOT NULL COMMENT '考核周期',
    grade VARCHAR(2) COMMENT '等级 S/A/B/C/D',
    score DECIMAL(5,2),
    evaluator VARCHAR(64),
    eval_date DATE,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);

-- 合同信息（员工档案页签只读展示，真源在合同管理）
CREATE TABLE IF NOT EXISTS emp_contract (
    id BIGINT PRIMARY KEY,
    emp_id BIGINT NOT NULL,
    contract_no VARCHAR(64) NOT NULL UNIQUE,
    contract_type VARCHAR(16) NOT NULL COMMENT '固定期限/无固定期限/以完成一定工作任务为期限',
    sign_date DATE,
    start_date DATE,
    end_date DATE,
    status VARCHAR(8) DEFAULT '生效中' COMMENT '待签订/待生效/生效中/已续签/已到期/已解除',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);

-- 员工附件
CREATE TABLE IF NOT EXISTS emp_attachment (
    id BIGINT PRIMARY KEY,
    emp_id BIGINT NOT NULL,
    file_name VARCHAR(128) NOT NULL,
    file_type VARCHAR(16) DEFAULT '其他' COMMENT '简历/证件/其他',
    file_size BIGINT,
    file_path VARCHAR(512),
    uploader VARCHAR(64),
    upload_date DATE,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted TINYINT DEFAULT 0,
    KEY idx_emp (emp_id)
);
