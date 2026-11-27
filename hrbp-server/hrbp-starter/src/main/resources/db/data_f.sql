-- 任务F 种子
USE hrbp;

-- 等级参数
INSERT INTO perf_grade_config (id, grade, score_floor, coefficient, distribution_pct) VALUES
(9101,'S',98,2.0,10),(9102,'A',95,1.5,20),(9103,'B',85,1.0,50),(9104,'C',70,0.5,15),(9105,'D',0,0,5)
ON DUPLICATE KEY UPDATE score_floor = VALUES(score_floor);

-- 考勤：本周记录（张伟/李娜/王强）
INSERT INTO att_record (id, emp_id, emp_name, att_date, check_in, check_out, day_status, exception_type) VALUES
(9201,9001,'张伟','2026-11-23','09:01:00','18:30:00','正常',NULL),
(9202,9002,'李娜','2026-11-23','09:25:00','18:20:00','迟到','迟到'),
(9203,9003,'王强','2026-11-23','08:55:00','20:10:00','加班','加班'),
(9204,9001,'张伟','2026-11-24','09:00:00','18:30:00','正常',NULL),
(9205,9002,'李娜','2026-11-24',NULL,NULL,'缺卡','缺卡'),
(9206,9003,'王强','2026-11-24','08:50:00','18:40:00','正常',NULL)
ON DUPLICATE KEY UPDATE day_status = VALUES(day_status);

-- 假勤申请
INSERT INTO att_leave (id, leave_no, emp_id, emp_name, leave_type, sub_type, start_time, end_time, hours, reason, approve_status) VALUES
(9301,'QJ-2026-0001',9004,'赵敏','请假','年假','2026-11-30 09:00:00','2026-11-30 18:00:00',8,'家中有事','待审批'),
(9302,'QJ-2026-0002',9005,'陈晨','加班','工作日加班','2026-11-25 18:30:00','2026-11-25 21:30:00',3,'版本发布','已通过')
ON DUPLICATE KEY UPDATE approve_status = VALUES(approve_status);

-- 月度汇总
INSERT INTO att_month (id, emp_id, emp_name, month, should_days, actual_days, late_count, early_count, miss_count, absent_count, leave_hours, overtime_hours, status) VALUES
(9401,9001,'张伟','2026-11',21,19,0,0,0,0,0,0,'待确认'),
(9402,9002,'李娜','2026-11',21,19,2,0,1,0,0,0,'待确认'),
(9403,9003,'王强','2026-11',21,20,0,0,0,0,0,12,'待确认')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 绩效周期：2026Q4 上级评价中
INSERT INTO perf_period (id, period_name, period_type, start_date, end_date, stage) VALUES
(9501,'2026Q4','季度','2026-10-01','2026-12-31','上级评价中')
ON DUPLICATE KEY UPDATE stage = VALUES(stage);

-- 绩效目标：王强 2 条（合计 100%）
INSERT INTO perf_target (id, period_id, owner_type, emp_id, emp_name, dept_name, title, metric_desc, standard, weight, progress, status) VALUES
(9601,9501,'个人',9003,'王强','平台研发部','完成订单中心重构','订单中心微服务拆分与上线','按期上线且 P0 故障=0',60,80,'已生效'),
(9602,9501,'个人',9003,'王强','平台研发部','团队带教','带教 1 名初级工程师转正','转正评估通过',40,100,'已生效'),
(9603,9501,'个人',9004,'赵敏','平台研发部','交付人力系统前端','HRBP 前端页面按期交付','验收通过率 100%',100,90,'已生效')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 考核表
INSERT INTO perf_review (id, period_id, emp_id, emp_name, dept_name, self_score, status) VALUES
(9701,9501,9003,'王强','平台研发部',92,'待上级评价'),
(9702,9501,9004,'赵敏','平台研发部',88,'待上级评价')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 评价项
INSERT INTO perf_review_item (id, review_id, target_title, weight, self_score, self_comment) VALUES
(9801,9701,'完成订单中心重构',60,90,'已按期上线'),
(9802,9701,'团队带教',40,95,'周杰已转正'),
(9803,9702,'交付人力系统前端',100,88,'页面按期交付')
ON DUPLICATE KEY UPDATE self_score = VALUES(self_score);
