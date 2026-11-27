-- 任务D2 种子
USE hrbp;

INSERT INTO recruit_job (id, job_no, demand_id, position_name, job_level, headcount, hired, job_status) VALUES
(8101,'J-0001',8001,'高级后端开发工程师','P6',2,0,'在招'),
(8102,'J-0002',8002,'前端开发工程师','P4',2,0,'在招'),
(8103,'J-0003',8003,'产品经理','P4',1,0,'在招')
ON DUPLICATE KEY UPDATE job_status = VALUES(job_status);

INSERT INTO recruit_candidate (id, name, gender, phone, email, current_company, current_position, years_exp, education, source_channel, talent_pool) VALUES
(8201,'李雷','男','13911112222','lilei@example.com','云帆科技','Java工程师',5,'本科','BOSS直聘',0),
(8202,'韩梅梅','女','13933334444','hanmm@example.com','蓝鲸网络','前端工程师',4,'本科','猎聘',0),
(8203,'林涛','男','13955556666','lintao@example.com','远山信息','产品专员',3,'硕士','内推',0),
(8204,'赵雪','女','13977778888','zhaoxue@example.com','明澈软件','测试工程师',2,'本科','BOSS直聘',1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO recruit_application (id, job_id, demand_id, candidate_id, apply_status, entry_source, first_result, second_result, final_result) VALUES
(8301,8101,8001,8201,'终试','过程创建','通过','通过',NULL),
(8302,8101,8001,8202,'复试','过程创建','通过',NULL,NULL),
(8303,8102,8002,8203,'已筛选','过程创建',NULL,NULL,NULL)
ON DUPLICATE KEY UPDATE apply_status = VALUES(apply_status);

INSERT INTO recruit_interview (id, application_id, round, interview_time, location, interviewer, invite_status, interview_status, conclusion, comment) VALUES
(8401,8301,'初试','2026-11-20 10:00:00','3F-会议室A','王强','已接受','已完成','通过','基础扎实'),
(8402,8301,'复试','2026-11-24 14:00:00','3F-会议室A','李娜','已接受','已完成','通过','系统设计能力不错'),
(8403,8301,'终试','2026-11-28 10:00:00','3F-会议室B','张伟','已邀约','待面试',NULL,NULL),
(8404,8302,'初试','2026-11-22 15:00:00','视频面试','赵敏','已接受','已完成','通过',NULL),
(8405,8302,'复试','2026-11-29 10:00:00','视频面试','李娜','待邀约','待面试',NULL,NULL)
ON DUPLICATE KEY UPDATE interview_status = VALUES(interview_status);

INSERT INTO recruit_offer (id, offer_no, application_id, candidate_name, position_name, job_level, monthly_base, monthly_perf, annual_bonus_months, sign_bonus, annual_package, offer_status, valid_until, onboard_date) VALUES
(8501,'OF-2026-0001',8302,'韩梅梅','前端开发工程师','P4',18000,2000,3,0,258000,'已发送','2026-12-05','2026-12-15')
ON DUPLICATE KEY UPDATE offer_status = VALUES(offer_status);
