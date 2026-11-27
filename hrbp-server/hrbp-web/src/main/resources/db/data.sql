-- 种子数据：账号、角色、HR 菜单树
USE hrbp;

-- 管理员账号 admin/admin123
INSERT INTO sys_user (id, username, password, real_name, status) VALUES
(1, 'admin', '$2y$10$aKU7uVJ75gqA1HuvMB3bi.c9rVRm0rWc7urQZhgHS63I5u6ytLFTC', '系统管理员', 1)
ON DUPLICATE KEY UPDATE real_name = VALUES(real_name);

-- 角色
INSERT INTO sys_role (id, role_code, role_name, remark) VALUES
(1, 'HR_ADMIN', 'HR管理员', '全量权限'),
(2, 'HRBP', 'HRBP', '本中心写入与审批'),
(3, 'CENTER_LEADER', '中心负责人', '本中心审批'),
(4, 'DEPT_LEADER', '部门负责人', '本部门审批与只读'),
(5, 'DIRECT_MANAGER', '直接上级', '本团队评价与审批'),
(6, 'RECRUITER', '招聘HR', '招聘过程操作'),
(7, 'EMPLOYEE', '员工本人', '有限只读')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

-- 菜单树：M目录 C菜单（按钮权限后续按模块补）
INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, icon, perm_code, sort, status) VALUES
-- 工作台
(100, 0, '工作台', 'C', '/hr/workbench', 'Monitor', 'MENU:HR:WORKBENCH', 1, 1),
-- 员工档案
(200, 0, '员工档案', 'M', '/hr/employee-group', 'User', NULL, 2, 1),
(201, 200, '员工资料', 'C', '/hr/employee/list', 'UserFilled', 'MENU:HR:EMPLOYEE', 1, 1),
(202, 200, '人才信息', 'C', '/hr/talent/list', 'Star', 'MENU:HR:TALENT', 2, 1),
(203, 200, '员工成长记录', 'C', '/hr/growth/list', 'TrendCharts', 'MENU:HR:GROWTH', 3, 1),
-- 组织管理
(300, 0, '组织管理', 'M', '/hr/org', 'OfficeBuilding', NULL, 3, 1),
(301, 300, '部门管理', 'C', '/hr/department/tree', 'Grid', 'MENU:HR:DEPARTMENT', 1, 1),
(302, 300, '岗位管理', 'C', '/hr/position/list', 'Postcard', 'MENU:HR:POSITION', 2, 1),
(303, 300, '编制管理', 'C', '/hr/establishment/list', 'Histogram', 'MENU:HR:ESTABLISHMENT', 3, 1),
-- HR管理
(400, 0, 'HR管理', 'M', '/hr/manage', 'Suitcase', NULL, 4, 1),
(401, 400, '招聘管理', 'M', '/hr/recruit', 'Magnet', NULL, 1, 1),
(402, 401, '招聘需求管理', 'C', '/hr/recruit/demand/list', 'Document', 'MENU:HR:RECRUIT_DEMAND', 1, 1),
(403, 401, '招聘过程管理', 'C', '/hr/recruit/workbench', 'Promotion', 'MENU:HR:RECRUIT_PROCESS', 2, 1),
(404, 401, '招聘数据看板', 'C', '/hr/recruit/dashboard', 'DataAnalysis', 'MENU:HR:RECRUIT_DASHBOARD', 3, 1),
(405, 400, '入职管理', 'C', '/hr/onboarding/list', 'CirclePlus', 'MENU:HR:ONBOARDING', 2, 1),
(406, 400, '转正管理', 'C', '/hr/regularization/list', 'CircleCheck', 'MENU:HR:REGULARIZATION', 3, 1),
(407, 400, '合同管理', 'C', '/hr/contract/list', 'Notebook', 'MENU:HR:CONTRACT', 4, 1),
(408, 400, '考勤管理', 'C', '/hr/attendance/list', 'AlarmClock', 'MENU:HR:ATTENDANCE', 5, 1),
(409, 400, '绩效管理', 'M', '/hr/performance', 'Trophy', NULL, 6, 1),
(410, 409, '绩效参数配置', 'C', '/hr/performance/config', 'SetUp', 'MENU:HR:PERF_CONFIG', 1, 1),
(411, 409, '绩效目标管理', 'C', '/hr/performance/target', 'Aim', 'MENU:HR:PERF_TARGET', 2, 1),
(412, 409, '绩效评价', 'C', '/hr/performance/review', 'EditPen', 'MENU:HR:PERF_REVIEW', 3, 1),
(413, 409, '绩效通晒', 'C', '/hr/performance/calibration', 'ScaleToOriginal', 'MENU:HR:PERF_CALIBRATION', 4, 1),
(414, 400, '调岗晋升', 'C', '/hr/movement/list', 'Switch', 'MENU:HR:MOVEMENT', 7, 1),
(415, 400, '离职管理', 'C', '/hr/offboarding/list', 'Remove', 'MENU:HR:OFFBOARDING', 8, 1),
(416, 400, '人才盘点九宫格', 'C', '/hr/talent-review/list', 'Menu', 'MENU:HR:TALENT_REVIEW', 9, 1)
ON DUPLICATE KEY UPDATE menu_name = VALUES(menu_name), path = VALUES(path), perm_code = VALUES(perm_code);
