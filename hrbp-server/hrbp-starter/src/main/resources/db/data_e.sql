-- 任务E 种子
USE hrbp;

-- 入职单：李雷（Offer已接受）、韩梅梅（Offer已发送）
INSERT INTO ob_onboarding (id, onboard_no, offer_id, emp_name, phone, dept_id, dept_name, position_name, job_level, plan_date, onboard_result, doc_status, collect_status, material_status) VALUES
(8601,'OB-2026-0001',NULL,'李雷','139****2222',1111,'后端一组','高级后端开发工程师','P6','2026-11-20','待到岗','待入职','已提交','已交齐'),
(8602,'OB-2026-0002',NULL,'韩梅梅','139****4444',1112,'前端一组','前端开发工程师','P4','2026-11-20','待到岗','待入职','已发送','未交齐')
ON DUPLICATE KEY UPDATE doc_status = VALUES(doc_status);

-- 转正单：周杰（试用期将满）
INSERT INTO reg_regularization (id, reg_no, emp_id, emp_name, dept_name, position_name, job_level, trial_start, trial_end, trial_months, doc_status) VALUES
(8701,'RG-2026-0001',9008,'周杰','后端一组','后端开发工程师','P3','2026-07-11','2026-12-11',5,'待评估')
ON DUPLICATE KEY UPDATE doc_status = VALUES(doc_status);

-- 合同：张伟（生效中，无固定）、李娜（生效中）
INSERT INTO ctr_contract (id, contract_no, emp_id, emp_name, contract_type, sign_date, start_date, end_date, status, source_type) VALUES
(8801,'HT-2024-E0001-01',9001,'张伟','无固定期限','2024-03-15','2024-03-15',NULL,'生效中','续签生成'),
(8802,'HT-2026-E0002-01',9002,'李娜','固定期限','2026-07-01','2026-07-01','2029-06-30','生效中','续签生成'),
(8803,'HT-2023-E0003-01',9003,'王强','固定期限','2023-04-20','2023-04-20','2026-12-15','生效中','入职生成')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 成长事件：入职事件
INSERT INTO growth_event (id, event_no, emp_id, emp_no, emp_name, event_type, event_date, title, summary, source_module, source_no, idem_key) VALUES
(8901,'EV-2026-0001',9008,'E0008','周杰','入职','2022-07-11','周杰入职','入职后端一组，后端开发工程师 P3','入职管理','OB-2022-0008','OB-2022-0008#1#入职')
ON DUPLICATE KEY UPDATE title = VALUES(title);
