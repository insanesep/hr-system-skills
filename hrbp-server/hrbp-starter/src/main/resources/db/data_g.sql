-- 任务G 种子
USE hrbp;

INSERT INTO review_cycle (id, cycle_name, start_date, end_date, status) VALUES
(9901,'2026 下半年人才盘点','2026-07-01','2026-12-31','进行中')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO review_detail (id, cycle_id, emp_id, emp_name, dept_name, position_name, job_level, match_level, potential, is_key_position, key_develop, manager_action) VALUES
(9951,9901,9001,'张伟','人力资源部','人力资源总监','M4','高','高',1,'是','继任者计划'),
(9952,9901,9002,'李娜','平台研发部','研发经理','M3','高','高',1,'是','晋升答辩'),
(9953,9901,9003,'王强','后端一组','高级后端开发工程师','P6','高','中',0,'是','技术专家路线'),
(9954,9901,9004,'赵敏','前端一组','前端开发工程师','P4','中','中',0,'待观察','关注产出稳定性'),
(9955,9901,9006,'刘洋','人力资源部','HRBP','P4','高','中',0,'否',NULL),
(9956,9901,9007,'孙丽','品牌营销部','产品经理','P4','中','高',0,'是','轮岗锻炼'),
(9957,9901,9008,'周杰','后端一组','后端开发工程师','P3','中','中',0,'待观察','加强代码评审'),
(9958,9901,9005,'陈晨','质量保障部','测试工程师','P4','低','低',0,'否','绩效改进计划')
ON DUPLICATE KEY UPDATE match_level = VALUES(match_level);

INSERT INTO talent_record (id, record_no, emp_id, emp_name, record_type, version, content, record_date, status) VALUES
(9971,'IV-2026-0001',9003,'王强','访谈沟通',1,'Q3 一对一沟通：关注技术深度成长，希望参与架构设计','2026-09-15','有效'),
(9972,'TR-2026-0001',9003,'王强','人才盘点',1,'2026H1 盘点：高绩效中潜力，建议技术专家路线','2026-07-20','有效'),
(9973,'RP-2026-0001',9002,'李娜','述职',1,'年中述职：团队交付率 95%，人才梯队建设完成','2026-08-10','有效')
ON DUPLICATE KEY UPDATE content = VALUES(content);
