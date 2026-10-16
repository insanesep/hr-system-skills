---
name: requirement-management-data-model
description: 需求管理 - 数据模型：需求主表、审批链快照、审批流水、审批链配置、事件审计、外链邀约、需求附件、审批 SLA 配置、AI 方案确认执行记录九表 DDL 与编号规则
type: reference
---

# 需求管理数据模型

共 9 张表：1 张主表 + 2 张审批过程表（快照 / 流水）+ 2 张配置表（审批链 / 审批 SLA）+ 1 张审计表 + 1 张外链邀约表 + 1 张附件表 + 1 张 AI 方案确认执行记录表。字段与状态枚举以 [`business-rule.md`](business-rule.md) 为业务真源，本文件仅承载落库结构。

> **实现落地差异（2026-08，已随代码实现确认，建表脚本真源见 `busyming-snackingdom/docs/requirement_management.sql`）**：
> 1. **业务唯一索引全部取消**：`requirement`/`config`/`snapshot` 表原文的 `UNIQUE KEY` 一律降为普通 `KEY`，唯一性由 Service 层「先查后写 + `FOR UPDATE` 行锁」保证（遵循项目 AGENTS.md 软删红线：`@TableLogic` + `UNIQUE KEY` 组合存在已删记录占槽位的隐形坑）。
> 2. **`requirement_no` 改为可空**：草稿不生成编号（§10），提交时才生成，故 `NOT NULL` 改为可空 + 普通 `KEY idx_requirement_no`。
> 3. **`requirement` 增补字段**：`approval_round`（当前轮次，与快照/流水对齐）、`submit_by_name` / `pm_user_name`（姓名快照，列表展示免联表，对齐 `product_apply` 惯例）。
> 4. **`requirement_approval_config.wecom_chat_id` → `wecom_webhook_key`**：企微 appchat chatId 能力项目未实现，群消息改走**企微群机器人 Webhook Key**（支持 Nacos KMS 引用名），复用 `report_push_config` 的 KMS 解析与脱敏体系；`WecomWebhookClient` 新增 `sendMarkdown`/`sendText`。
> 5. 主键统一 `BIGINT UNSIGNED`，全字段补齐 `DEFAULT` 与 `COMMENT`（项目 DDL 规范）。

> **产品线与外链能力增补（本次）**：
> 1. 新增 `product_line` 独立维度（`SNACK` / `YDTJ`），审批链匹配由三维扩为**四维**：`产品线 × 业务线 × 需求类型 × 优先级`。
> 2. `requirement_approval_config.biz_line` 类型由 `ENUM` 改为 `VARCHAR(16)`，以承载 `*` 通配值；`product_line=YDTJ` 时 `biz_line` 统一写 `*`，**不新增业务线枚举值**。
> 3. `requirement` 新增提交来源与外部身份字段，外部提交人**不落 `sys_user` / `sys_dept`**，仅以自由文本存储，避免污染组织架构主数据。
> 4. 新增 `requirement_public_link`（外链邀约表），一次性定向 token 范式对齐 [`采购邀约`](../../../../档案/供应商/采购邀约/references/business-rule.md)。

> **附件与时效管理增补（2026-08-18）**：
> 1. 新增 `requirement_attachment`（需求附件表），承载三端差异化上传（Web 全类型 / App 图片 / H5 图片受限），文件实体落 OSS，库内只存元信息与 `oss_key`。
> 2. 新增 `requirement_sla_config`（审批 SLA 配置表），承载审批节点催办与升级的时长阈值，与 `requirement_approval_config` 分表：**审批链配置管「谁审」，SLA 配置管「多久没审就催」**，二者维度不同不合表。
> 3. 🚨 **SLA 配置的优先级维度沿用本模块既有 `P0/P1/P2/P3` 枚举**（不引入 `URGENT/HIGH/NORMAL/LOW` 第二套口径）；`approval_level` 沿用 `INT` 1/2/3，与快照表 / 流水表完全对齐。
> 4. 节点停留时长**不新增落库字段**：以 `requirement_approval_log` 中当前轮次进入本级的最近一条流水 `operated_at` 为起算点实时计算（口径见 [`business-rule.md`](business-rule.md) §10.1）。

> **实现落地差异（2026-08-19，已随代码实现确认，建表脚本真源见 `busyming-snackingdom-devops/docs/20260819/liucao/requirement-attachment-sla/01_ddl.sql`）**：
> 1. **不做图片/视频内容安全审核**（用户裁决，本期整体不实现）：`requirement_attachment` **不建** `content_check_status` / `content_check_at` 两列，也不建 `idx_check_status` 索引；连带 §7 中「`rejected` 附件不展示不可下载」「`pending` 仅上传人可见」两条规则本期不存在。
> 2. **附件改前端 OSS STS 直传 + 后端只收元信息**（用户裁决）：文件实体由 Web / App 前端持 STS 临时凭证直传 OSS，后端仅接收 `{fileName, fileType, fileExt, fileSize, ossKey, ossBucket}` 元信息落库。🚨 后端仍按 `upload_source` **强校验**上报的 `file_ext`（白名单）/ `file_size`（大小上限）/ 张数上限（按类型分别计数），`file_type` 由扩展名反推**不信前端**。
> 3. **`oss_key` 路径不含 `requirement_id`**：由 `requirement/{requirement_id}/{uuid}.{ext}` 改为 **`requirement/{yyyyMM}/{uuid}.{ext}`** —— 直传发生在需求落库之前拿不到需求 ID，按月分目录同样满足批量回溯与 Bucket 生命周期管理。⚠️ App 端实测复用既有 `buildOssKey(dir, fileName)` 会多产生一层日期目录，实际 key 形如 `requirement/202608/2026-08-19/{ts}.{ext}`；前缀 `requirement/{yyyyMM}` 仍满足生命周期规则匹配，此实现细节如实记录。
> 4. **草稿态删除附件不清 OSS**：§7 原文的「草稿删除置 `deleted_flag=1` 并异步清理 OSS 文件」统一收敛为**只逻辑删除、不做 OSS 物理移除**（异步清理失败会以「OSS 报错」形态掩盖业务首因），孤儿对象交 Bucket 生命周期规则回收。
> 5. 🚨 **新增事件类型 `SLA_DEFERRED`**：静默时段（22:00–08:00）命中催办 / 升级 / 目标日期预警条件时只写该事件（`dedupe_key` 传 **null**，不参与去重），**绝不写** `SLA_REMINDED` / `SLA_ESCALATED` —— 否则静默期写下的去重键会让 08:00 那轮被去重跳过，催办永久发不出去（矛盾详解见 [`job-schedule.md`](job-schedule.md) §3.2）。
> 6. 🚨 **SLA 去重键补 `approval_round` 段**：由 `{event_type}_{requirement_id}_{approval_level}_{remind_window}` 改为 `{event_type}_{requirement_id}_{approval_round}_{approval_level}_{remind_window}` —— 驳回重提后 `approval_round` +1、停留时长归零使 `remind_window = floor(0/24) = 0` 也归零，新一轮前几个窗口的键会与上一轮已落库的键逐字相同，导致新一轮催办被永久去重跳过。
> 7. **`requirement_sla_config` 无 `deleted_flag` 列**（照 §8 原文落地）：故停用走 `status=0`，删除为**物理删除**，变更留痕靠 `SLA_CONFIG_CHANGED` 事件。
> 8. **SLA 默认配置矩阵已初始化 24 行**（2 产品线 × 4 优先级 × 3 级次），`created_by=-1` 标识系统初始化。

> **审批链驱动模式变更（2026-09-09，需求口径调整）**：
> 1. 审批链由「提交对象（产品经理）」驱动：`requirement_approval_config` 新增 `pm_user_id` / `pm_user_name` 两列（NULL = 默认链行，非空 = 该 PM 专属链行），匹配规则改为「先专属链、后默认链兜底」，详见 [`business-rule.md`](business-rule.md) §3。
> 2. `requirement.pm_user_id` 写入时机提前：**内部单提交时即写入**（=提交对象）；外部单保持 NULL，L3 通过时写入实际通过人。「L2 通过必须指派产品经理」规则移除，`requirement_approval_log.assigned_pm_user_id` 成为历史字段（不再写入）。
> 3. `requirement.max_approval_level` 不再固定 3：由命中链的实际级次集合写入（专属链可仅配部分级次）。

> **AI 方案确认增补（2026-09-10）**：
> 1. 新增 `requirement_ai_plan`（AI 方案确认执行记录表，§9）：承载产品确认节点（L3）AI 辅助的方案草稿、三段式确认摘要、信息缺口清单与补材请求，按 `(requirement_id, approval_round)` 轮次隔离、`plan_version` 版本递增。规则真源见 [`business-rule.md`](business-rule.md) §11。
> 2. `requirement_approval_config` 新增 `ai_assist_enabled` 列（§4）：per-PM 的「AI 辅助方案确认」开关，挂在专属链行上，PM 粒度生效。
> 3. 🚨 两表均**不建 `UNIQUE KEY`**（对齐本文件顶部软删红线）：`(requirement_id, approval_round, trigger_type)` 任务唯一性由 Service 层「先查后写 + `FOR UPDATE` 行锁」保证。

---

## 1. requirement（需求主表）

```sql
CREATE TABLE requirement (
    id BIGINT NOT NULL AUTO_INCREMENT,
    requirement_no VARCHAR(32) NOT NULL COMMENT '编号：REQ-{YYYYMMDD}-{NNN}',
    title VARCHAR(128) NOT NULL COMMENT '需求标题',
    description TEXT COMMENT '需求描述',
    type VARCHAR(32) NOT NULL COMMENT '需求类型枚举',
    priority VARCHAR(4) NOT NULL DEFAULT 'P2' COMMENT '优先级：P0/P1/P2/P3',
    product_line VARCHAR(16) NOT NULL DEFAULT 'SNACK' COMMENT '产品线：SNACK=零食王国 YDTJ=有点推荐',
    biz_line VARCHAR(16) NOT NULL COMMENT '业务线：OPS/FIN/SCM/DIGITAL；product_line=YDTJ 时固定为 *（不区分业务线）',
    status VARCHAR(24) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/SUBMITTED/BU_REVIEWING/BU_APPROVED/IMPL_REVIEWING/IMPL_CONFIRMED/PM_REVIEWING/PM_SUBMITTED/LINKED/REJECTED',
    current_approval_level INT NOT NULL DEFAULT 0 COMMENT '当前审批级次 0=未提交 1/2/3',
    max_approval_level INT NOT NULL DEFAULT 3 COMMENT '最大审批级次，=命中审批链的最大级次（默认链固定 3，PM 专属链按其配置的级次集合）',
    submit_source VARCHAR(16) NOT NULL DEFAULT 'INTERNAL' COMMENT '提交来源：INTERNAL=内部登录用户 EXTERNAL=外链免登录',
    submit_by BIGINT COMMENT '提交人 sys_user.id；submit_source=EXTERNAL 时为 NULL',
    submit_dept_id BIGINT COMMENT '提交部门 sys_dept.id；submit_source=EXTERNAL 时为 NULL',
    external_submitter_name VARCHAR(64) COMMENT '外部提交人姓名（手填）；submit_source=EXTERNAL 必填',
    external_submitter_dept VARCHAR(128) COMMENT '外部提交人部门（手填自由文本，不关联 sys_dept）；submit_source=EXTERNAL 必填',
    external_submitter_contact VARCHAR(32) COMMENT '外部提交人手机号；submit_source=EXTERNAL 必填，仅供内部联系不作回传通知',
    public_link_id BIGINT COMMENT '来源外链 requirement_public_link.id；submit_source=EXTERNAL 必填',
    submit_at DATETIME COMMENT '提交时间',
    impl_responsible_user_id BIGINT COMMENT '实施负责人 sys_user.id',
    pm_user_id BIGINT COMMENT '提交对象（产品经理）sys_user.id；内部单提交时写入，外部单为 NULL、L3 通过时写入实际通过人',
    linked_card_no VARCHAR(32) COMMENT '关联排期卡片 feat_schedule_card.card_no',
    flow_instance_id BIGINT NOT NULL DEFAULT 0 COMMENT '流程中心实例 ID（M4 并行接入，2026-09-15 登记、2026-09-16 已随研发对接执行）：0=未接入；命中灰度的内部单提交时回写 submit-external 返回值，见 business-rule §12.4④',
    flow_instance_no VARCHAR(32) NOT NULL DEFAULT '' COMMENT '流程中心实例编号（如 FI2026…），空串=未接入；约束同 flow_instance_id，展示与检索用',
    target_date DATE COMMENT '目标完成日期',
    rejection_reason TEXT COMMENT '最近一次驳回原因',
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_requirement_no (requirement_no),
    KEY idx_biz_line_status (biz_line, status),
    KEY idx_product_line_status (product_line, status),
    KEY idx_submit_by (submit_by),
    KEY idx_submit_source (submit_source, status),
    KEY idx_public_link (public_link_id),
    KEY idx_dept_level (submit_dept_id, current_approval_level, status),
    KEY idx_linked_card (linked_card_no)
) COMMENT='需求管理主表';
```

> - `type` 枚举：`NEW_FEATURE`（新功能）/ `OPTIMIZE`（功能优化）/ `BUGFIX`（缺陷修复）/ `REPORT`（数据报表）/ `INTEGRATION`（系统集成）
> - `linked_card_no` 为**弱关联**：不建外键，卡片删除后仅在详情页提示失效，不级联清空
> - `pm_user_id`（提交对象）：**内部单在提交时写入**（提交表单必选，business-rule §1.3）；**外部单提交时为 NULL**，L3（产品确认）审批通过时写入实际通过人。~~原「L2 审批通过时写入」规则 2026-09-09 起作废~~
> - `rejection_reason` 仅保留最近一次驳回原因，历史驳回原因在 `requirement_approval_log` 中按轮次追溯
> - `deleted_flag` 软删仅对 `DRAFT` 状态生效，已提交需求不允许删除
> - **`product_line` 与 `biz_line` 的组合约束**：`SNACK` 下 `biz_line` 必须为 `OPS/FIN/SCM/DIGITAL` 之一；`YDTJ` 下 `biz_line` 必须为 `*`。由 Service 层校验，不建 CHECK 约束
> - **`submit_source` 与人员字段互斥**：`INTERNAL` 单必须有 `submit_by` + `submit_dept_id` 且三个 `external_*` 字段为 NULL；`EXTERNAL` 单反之，且 `public_link_id` 必填。写入前由 Service 层强校验，二者不得混填
> - `EXTERNAL` 单的 `created_by` / `updated_by` 写 `0`（系统），提交人身份仅由 `external_*` 字段承载

---

## 2. requirement_approval_snapshot（审批链快照表）

```sql
CREATE TABLE requirement_approval_snapshot (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    requirement_id BIGINT NOT NULL COMMENT '关联 requirement.id',
    requirement_no VARCHAR(32) NOT NULL COMMENT '关联 requirement.requirement_no（冗余便于排查）',
    approval_round INT NOT NULL DEFAULT 1 COMMENT '审批轮次；驳回重提递增，与流水轮次对齐',
    approval_level INT NOT NULL COMMENT '审批级次：1=业务线负责人 2=实施负责人 3=产品经理',
    level_name VARCHAR(32) NOT NULL COMMENT '级次名称：业务线审批/实施确认/产品确认',
    approver_user_id BIGINT NOT NULL COMMENT '审批人 sys_user.id；同级多行=或签',
    approver_name VARCHAR(64) NOT NULL COMMENT '审批人姓名（冗余，防止人员改名后追溯失真）',
    approver_role VARCHAR(32) NOT NULL COMMENT '审批人角色：BU_OWNER/IMPL_OWNER/PM',
    config_id BIGINT COMMENT '快照来源 requirement_approval_config.id',
    valid_flag TINYINT NOT NULL DEFAULT 1 COMMENT '1=生效 0=作废（撤回或审批链重建时置 0）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '快照生成时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_req_round_level_user (requirement_id, approval_round, approval_level, approver_user_id),
    KEY idx_approver_valid (approver_user_id, valid_flag),
    KEY idx_req_no (requirement_no)
) COMMENT='需求审批链快照，提交时按配置生成，流转期间只读不回查配置';
```

> - 提交（含驳回重提）时按「提交对象（pm_user_id）→ 产品线 × 业务线 × 需求类型 × 优先级」匹配配置生成（business-rule §3.4），**一次写入链上全部已配置级次的行**：PM 专属链仅写其配置的级次（可缺级）；默认链兜底时 L3 审批人替换为提交对象本人（该行 `config_id` 记 NULL，非配置行来源）
> - 同一 `(requirement_id, approval_round, approval_level)` 下多行 = 或签，任一 `approver_user_id` 通过即该级通过
> - 撤回时将该轮全部行 `valid_flag=0`；驳回重提生成新 `approval_round` 的全新快照，历史轮次保留
> - 「审批链重建」（审批人离职调岗）将旧行置 0 后写入新行，`approval_round` 与级次集合保持不变——只替换审批人，不增减级次
> - App 端「待我审批」列表以 `idx_approver_valid` + 主表 `current_approval_level` 联合过滤取数

---

## 3. requirement_approval_log（审批流水表）

```sql
CREATE TABLE requirement_approval_log (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    requirement_id BIGINT NOT NULL COMMENT '关联 requirement.id',
    requirement_no VARCHAR(32) NOT NULL COMMENT '关联 requirement.requirement_no（冗余）',
    approval_round INT NOT NULL DEFAULT 1 COMMENT '审批轮次，与快照表对齐',
    approval_level INT NOT NULL COMMENT '发生审批的级次 1/2/3',
    action VARCHAR(24) NOT NULL COMMENT 'SUBMIT/APPROVE/REJECT/WITHDRAW/RESUBMIT/LINK_CARD/UNLINK_CARD/AUTO_SKIP；ASSIGN_PM 为历史枚举（2026-09-09 起不再产生，仅历史数据存在）',
    from_status VARCHAR(24) COMMENT '变更前状态',
    to_status VARCHAR(24) NOT NULL COMMENT '变更后状态',
    opinion VARCHAR(512) COMMENT '审批意见；action=REJECT 时必填且不少于 10 字',
    assigned_pm_user_id BIGINT COMMENT 'L2 通过时指派的产品经理 sys_user.id；🚨 历史字段：2026-09-09 起 PM 改为提交时选定的提交对象，本字段不再写入',
    operator_id BIGINT NOT NULL COMMENT '操作人 sys_user.id；0=系统（自动跳过/自动流转）',
    operator_name VARCHAR(64) NOT NULL COMMENT '操作人姓名（冗余）',
    operated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    duration_minutes INT COMMENT '本级等待时长（分钟）：本次操作时间 - 进入本级时间，用于平均审批时长统计',
    op_channel VARCHAR(16) NOT NULL DEFAULT 'PAGE' COMMENT '操作来源通道（M4 并行接入，2026-09-15 登记、2026-09-16 已随研发对接执行）：PAGE=需求管理页内 / FLOW_CENTER=流程中心通道；存量流水由默认值覆盖（历史全部产自页内），见 business-rule §12.4②',
    PRIMARY KEY (id),
    KEY idx_req_time (requirement_id, operated_at),
    KEY idx_operator (operator_id, operated_at),
    KEY idx_action_level (action, approval_level)
) COMMENT='需求审批流水，仅追加不可修改，详情页倒序时间线呈现';
```

> - 仅追加、不更新、不删除；需求详情页按 `operated_at` 倒序渲染时间线
> - `action=AUTO_SKIP`：提交人恰为该级审批人时系统自动跳过，`operator_id=0`，`opinion` 写入「提交人即审批人，自动跳过」
> - `duration_minutes` 在写入时一次性算好落库，统计报表直接聚合，避免运行时反复回溯
> - 驳回率统计口径：`action=REJECT` 条数 / 该轮次提交条数，按 `approval_level` 分级下钻

---

## 4. requirement_approval_config（审批链配置表）

```sql
CREATE TABLE requirement_approval_config (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    pm_user_id BIGINT COMMENT '提交对象（产品经理）sys_user.id；NULL=默认链行（四维兜底），非空=该 PM 专属链行（2026-09-09 新增维度）',
    pm_user_name VARCHAR(64) COMMENT '提交对象姓名（冗余，展示用）；默认链行为 NULL',
    product_line VARCHAR(16) NOT NULL DEFAULT 'SNACK' COMMENT '产品线：SNACK=零食王国 YDTJ=有点推荐；不支持 * 通配',
    biz_line VARCHAR(16) NOT NULL COMMENT '业务线条件：OPS=运营 FIN=财务 SCM=供应链 DIGITAL=数字化；* = 不区分业务线（YDTJ 固定取 *）',
    requirement_type VARCHAR(32) NOT NULL DEFAULT '*' COMMENT '需求类型条件；* = 该业务线全部类型通配',
    priority VARCHAR(4) NOT NULL DEFAULT '*' COMMENT '优先级条件 P0/P1/P2/P3；* = 全部优先级通配',
    approval_level INT NOT NULL COMMENT '审批级次 1=业务线负责人 2=实施负责人 3=产品经理',
    level_name VARCHAR(32) NOT NULL COMMENT '级次名称：业务线审批/实施确认/产品确认',
    approver_user_id BIGINT NOT NULL COMMENT '审批人 sys_user.id；同条件同级多行 = 或签',
    approver_name VARCHAR(64) NOT NULL COMMENT '审批人姓名（冗余，展示用）',
    approver_role VARCHAR(32) NOT NULL COMMENT '审批人角色：BU_OWNER/IMPL_OWNER/PM',
    wecom_chat_id VARCHAR(64) COMMENT '业务线企微群 chatId；仅 approval_level=1 行维护，群消息路由用',
    ai_assist_enabled TINYINT NOT NULL DEFAULT 0 COMMENT 'AI 辅助方案确认开关（2026-09-10 新增）：1=该 PM 专属链开启 AI 方案确认；仅专属链行（pm_user_id 非空）有意义，默认链行恒为 0',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用；停用行不参与快照匹配',
    remark VARCHAR(256) COMMENT '配置说明',
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_cond_level_user (pm_user_id, product_line, biz_line, requirement_type, priority, approval_level, approver_user_id),
    KEY idx_line_status (product_line, biz_line, status),
    KEY idx_approver (approver_user_id),
    KEY idx_pm (pm_user_id, status)
) COMMENT='需求审批链配置，提交对象（产品经理）优先 + 产品线×业务线×需求类型×优先级四维默认链兜底，精确优先于通配';
```

> - 匹配顺序（`pm_user_id` 与 `product_line` 不参与降级，必须等值命中）：**先按提交对象匹配专属链**（`pm_user_id=提交对象`），内部再按 `(pl, biz, type, priority)` 精确 → `(pl, biz, type, *)` → `(pl, biz, *, priority)` → `(pl, biz, *, *)` 降级，命中即止；**未命中则回退默认链**（`pm_user_id IS NULL`，同一套四维降级），完整规则见 [`business-rule.md`](business-rule.md) §3.4
> - **级次由配置决定**（2026-09-09 起）：PM 专属链可配置 `{1,2,3}` 的任意非空子集（如仅 L3、L2+L3），未配置的级次流转时跳过；默认链 SNACK 各业务线须配齐 L1/L2、`YDTJ` 须配齐 L1/L2/L3（L3 承接外部提交），缺级则对应提交场景被拒（外部提交场景的报错文案见 [`public-ui.md`](public-ui.md)，不得向外部人员暴露内部配置提示）
> - `product_line=YDTJ` 的配置行 `biz_line` 固定为 `*`，即有点推荐默认链只需配一套（可按需求类型 / 优先级再细分）
> - `wecom_chat_id` 为业务线 → 企微群映射的落库位置，与系统配置保持一致；SNACK 下 4 条业务线各自对应运营群 / 财务群 / 供应链群 / 数字化群，YDTJ 对应有点推荐需求群
> - 配置变更不影响在途需求（快照机制），仅对变更后新提交的需求生效
> - 管理员在「审批链配置」页维护，每次变更写入 `requirement_event_log`
> - **`ai_assist_enabled`（2026-09-10 新增）为 PM 粒度开关**：配置页「先选提交对象（PM）再勾选 AI 辅助方案确认」，保存时对该 PM 全部专属链行批量置位；生效口径 = 该 PM 存在任一 `status=1` 专属链行且 `ai_assist_enabled=1`（规则见 [`business-rule.md`](business-rule.md) §11.8）。**例外于上一行**：本列变更立即生效（同 SLA 配置不做快照），仅影响变更后进入 `PM_REVIEWING` 的需求

---

## 5. requirement_event_log（事件审计表）

```sql
CREATE TABLE requirement_event_log (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    requirement_id BIGINT COMMENT '关联 requirement.id；配置类事件为 NULL',
    requirement_no VARCHAR(32) COMMENT '关联 requirement.requirement_no（冗余）',
    event_type VARCHAR(32) NOT NULL COMMENT 'CREATED/SUBMITTED/APPROVED/REJECTED/WITHDRAWN/RESUBMITTED/PM_ASSIGNED/CARD_LINKED/CARD_UNLINKED/CHAIN_REBUILT/CONFIG_CHANGED/NOTIFY_SENT/NOTIFY_FAILED/LINK_GENERATED/LINK_REVOKED/LINK_VISITED/EXTERNAL_SUBMITTED/CAPTCHA_FAILED/RATE_LIMITED/ATTACHMENT_UPLOADED/ATTACHMENT_DELETED/ATTACHMENT_CHECK_REJECTED/SLA_REMINDED/SLA_ESCALATED/SLA_DEFERRED/TARGET_DATE_WARNED/SLA_CONFIG_CHANGED/AI_PLAN_GENERATING/AI_PLAN_READY/AI_PLAN_FAILED/AI_PLAN_CONFIRMED/AI_PLAN_OBSOLETED/MATERIAL_REQUESTED',
    biz_key VARCHAR(48) COMMENT '消息 bizKey：REQUIREMENT_SUBMITTED/APPROVED/REJECTED/LINKED/GROUP_NOTIFY',
    dedupe_key VARCHAR(128) COMMENT '去重键：{bizKey}_{requirement_id}_{timestamp_minute}',
    notify_channel VARCHAR(16) COMMENT '推送通道：PERSONAL=个人消息 GROUP=业务群消息',
    notify_target VARCHAR(128) COMMENT '推送目标：个人消息=接收人 userId，群消息=chatId',
    notify_result VARCHAR(16) COMMENT '推送结果：SUCCESS/FAILED/SKIPPED（chatId 缺失时为 SKIPPED）',
    event_detail VARCHAR(1024) COMMENT '事件详情文本，如「L1 通过，流转至实施负责人」「关联卡片 FS-20260801-003」',
    public_link_id BIGINT COMMENT '关联 requirement_public_link.id；外链类事件必填',
    source_ip VARCHAR(64) COMMENT '来源 IP；外链公开接口事件必填',
    user_agent VARCHAR(256) COMMENT '来源 UA；外链公开接口事件必填',
    operator_id BIGINT NOT NULL COMMENT '操作人 sys_user.id；0=系统，外部免登录操作也记 0',
    operator_name VARCHAR(64) COMMENT '操作人姓名（冗余）；外部事件写外部提交人手填姓名',
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '事件发生时间',
    PRIMARY KEY (id),
    KEY idx_req_time (requirement_id, occurred_at),
    KEY idx_event_type (event_type, occurred_at),
    KEY idx_dedupe (dedupe_key),
    KEY idx_public_link (public_link_id, occurred_at),
    KEY idx_source_ip (source_ip, occurred_at)
) COMMENT='需求管理事件审计，覆盖状态变更、配置变更、企微推送结果与外链访问行为，仅追加';
```

> - 与 `requirement_approval_log` 分工：流水表只记审批动作（面向业务展示），审计表覆盖全部事件含通知推送与配置变更（面向排查）
> - 推送类事件在 `afterCommit` 异步执行后写入，`notify_result=FAILED` 不回滚业务事务，供人工重推
> - `notify_result=SKIPPED` 场景：业务线未配置 `wecom_chat_id`，群消息静默跳过并记录告警
> - `dedupe_key` 命中已有记录时直接跳过推送，防止审批人连点导致重复消息
> - `event_type=CONFIG_CHANGED` / `CHAIN_REBUILT` 记录管理员的配置与审批链重建操作，`requirement_id` 可为 NULL
> - **外链类事件**：`LINK_GENERATED` / `LINK_REVOKED` 由内部人触发（`requirement_id` 为 NULL）；`LINK_VISITED` / `EXTERNAL_SUBMITTED` / `CAPTCHA_FAILED` / `RATE_LIMITED` 由公开接口触发，`operator_id=0`，必须落 `source_ip` + `user_agent` + `public_link_id`
> - `RATE_LIMITED` / `CAPTCHA_FAILED` 累计可按 `idx_source_ip` 聚合，供安全回溯与异常 IP 封禁依据
> - **附件类事件**（新增）：`ATTACHMENT_UPLOADED` / `ATTACHMENT_DELETED` 记录上传与删除，`event_detail` 写「{文件名}（{类型}，{大小}，来源 {web/app/h5}）」；`ATTACHMENT_CHECK_REJECTED` 由内容安全异步回调写入，`operator_id=0`
>   - **落地差异（2026-08-19）**：内容安全审核本期不实现，故 `ATTACHMENT_CHECK_REJECTED` **枚举保留但无写入方**，实际不会产生该事件
> - **SLA 类事件**（新增）：`SLA_REMINDED` / `SLA_ESCALATED` / `TARGET_DATE_WARNED` 由 SLA Job 写入，`operator_id=0`；`dedupe_key` 取 `{event_type}_{requirement_id}_{approval_level}_{remind_window}`（窗口口径见 [`business-rule.md`](business-rule.md) §10.7），命中已有记录直接跳过发送
>   - 🚨 **落地差异（2026-08-19）**：去重键实际为 `{event_type}_{requirement_id}_{approval_round}_{approval_level}_{remind_window}`（补 `approval_round` 段，理由见本文件顶部差异块第 6 条）
> - 🚨 **`SLA_DEFERRED`（2026-08-19 新增）**：静默时段（22:00–08:00）命中催办 / 升级 / 目标日期预警条件时**只写本事件**，`dedupe_key` 传 **null 不参与去重**，`event_detail` 写「静默时段延后：{原本要发的事件类型}，L{级次}，停留 {N}h」；静默结束后那轮按正常流程重新判定并发送。**绝不在静默期写 `SLA_REMINDED` / `SLA_ESCALATED`**，否则去重键会让 08:00 那轮被跳过
> - `SLA_CONFIG_CHANGED` 记录管理员对 `requirement_sla_config` 的变更，`requirement_id` 为 NULL，`event_detail` 写变更前后阈值
> - **AI 方案确认类事件（2026-09-10 新增，规则见 [`business-rule.md`](business-rule.md) §11.9）**：`AI_PLAN_GENERATING` / `AI_PLAN_READY` / `AI_PLAN_FAILED` 由 AI 执行器写入（`operator_id=0`）；`AI_PLAN_CONFIRMED`（确认并通过）/ `MATERIAL_REQUESTED`（请求补充材料发出）由 PM 触发，`operator_id=PM 本人`，`event_detail` 引用 `requirement_ai_plan.id`；`AI_PLAN_OBSOLETED` 由系统在或签先批 / 人工直批 / 撤回 / 链重建时写入（`operator_id=0`）。`MATERIAL_REQUESTED` 的 `notify_target` 为提交人（外部单为邀约人），是 AI 相关事件中**唯一允许触达提交人**的事件，且必须发生在 PM 确认之后

---

## 6. requirement_public_link（外链邀约表）

```sql
CREATE TABLE requirement_public_link (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    link_token VARCHAR(64) NOT NULL COMMENT '外链 token，UUID 去横线或 32 位随机串；URL 中唯一参数',
    product_line VARCHAR(16) NOT NULL DEFAULT 'YDTJ' COMMENT '目标产品线；一期固定 YDTJ=有点推荐',
    biz_line VARCHAR(16) NOT NULL DEFAULT '*' COMMENT '目标业务线；YDTJ 固定 *，不由外部人选择',
    default_requirement_type VARCHAR(32) NOT NULL DEFAULT 'NEW_FEATURE' COMMENT '需求类型默认值；外部人可选但不可为空',
    default_priority VARCHAR(4) NOT NULL DEFAULT 'P2' COMMENT '优先级默认值；外部人不可选，由内部审批时修正',
    invitee_remark VARCHAR(128) NOT NULL COMMENT '邀约对象备注（公司/联系人）；仅供内部溯源与列表识别，可用作 H5 预填值',
    submit_limit INT NOT NULL DEFAULT 1 COMMENT '提交次数上限，默认 1；生成时可配',
    submit_count INT NOT NULL DEFAULT 0 COMMENT '已提交次数；达 submit_limit 后不再受理提交',
    visit_count INT NOT NULL DEFAULT 0 COMMENT '访问次数；仅统计不限制',
    first_visit_at DATETIME COMMENT '首次访问时间',
    last_submit_at DATETIME COMMENT '最后一次提交时间',
    expire_at DATETIME NOT NULL COMMENT '过期时间；生成时按有效期天数算好落库',
    valid_days INT NOT NULL DEFAULT 30 COMMENT '有效期天数：7/15/30/60/90，默认 30',
    status VARCHAR(16) NOT NULL DEFAULT 'GENERATED' COMMENT 'GENERATED=待使用 USED=已提交 EXPIRED=已过期 REVOKED=已撤销',
    revoked_by BIGINT COMMENT '撤销人 sys_user.id',
    revoked_at DATETIME COMMENT '撤销时间',
    revoke_reason VARCHAR(256) COMMENT '撤销原因',
    created_by BIGINT NOT NULL COMMENT '生成人 sys_user.id（邀约人）',
    created_by_name VARCHAR(64) NOT NULL COMMENT '生成人姓名（冗余）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_link_token (link_token),
    KEY idx_status_expire (status, expire_at),
    KEY idx_created_by (created_by, created_at)
) COMMENT='需求外链邀约表，一次性定向 token，URL 仅带 token 其余上下文全部反查';
```

> - **token 反查范式**：URL 中唯一参数为 `token`，产品线 / 业务线 / 邀约对象 / 有效期全部落库由 token 反查，不进 URL 明文（防篡改、防泄露）
> - `link_token` 不建 `UNIQUE KEY`（遵循本模块软删红线），唯一性由生成时「先查后写」保证；32 位随机串碰撞概率可忽略
> - **`status` 流转**：`GENERATED` → `USED`（`submit_count` 达 `submit_limit`）/ `EXPIRED` / `REVOKED`（内部人手动撤销）；`USED` / `EXPIRED` / `REVOKED` 均为终态
> - 🚨 **`EXPIRED` 以「查询 / 校验时按 `expire_at` 实时判定」为准**（公开页 token 校验、提交前置校验、Web 台账列表三处同一实现）；定时任务仅做落库兜底对齐（把已过期但状态仍为 `GENERATED` 的行刷成 `EXPIRED`，便于按状态检索与统计），**任务不执行也不影响业务正确性**
> - **`USED` 后仍可访问**：链接可重复打开，但展现为「已提交」提示页而非表单页（对齐采购邀约口径）
> - `submit_count` 递增与需求写入必须在**同一事务**内，并对本行加 `FOR UPDATE` 行锁，防并发超频
> - 失效文案按原因差异化（已提交 / 已过期 / 已撤销 / token 非法），具体文案见 [`public-ui.md`](public-ui.md)
> - 生成、撤销、访问、提交四类动作均写入 `requirement_event_log`

---

## 7. requirement_attachment（需求附件表）

> **实现落地差异（2026-08-19，已随代码实现确认）**：下方 DDL 已按交付脚本 `01_ddl.sql` 逐字段对齐（共 15 列），与需求原文相比：
> 1. **删去 `content_check_status` / `content_check_at` 两列与 `idx_check_status` 索引** —— 内容安全审核本期不实现（用户裁决），`RequirementAttachmentVO` 同样不回这两个字段。
> 2. **`oss_key` 路径改为 `requirement/{yyyyMM}/{uuid}.{ext}`**（不含 `requirement_id`）。
> 3. **`requirement_id` 改为 `NOT NULL DEFAULT 0`**，`requirement_no` 可空（草稿期未生成编号）。
> 4. `deleted_flag` 注释收敛为「仅逻辑删除，不清 OSS」（不再区分草稿 / 已提交两种清理策略）。

```sql
CREATE TABLE requirement_attachment (
    id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    requirement_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '关联 requirement.id；草稿先落库再传附件，不存在为 0 的有效行',
    requirement_no VARCHAR(32) DEFAULT NULL COMMENT '关联 requirement.requirement_no（冗余便于排查）；草稿期未生成编号时为 NULL',
    file_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '原始文件名（展示用，含扩展名）；下载时回写 Content-Disposition',
    file_type VARCHAR(20) NOT NULL DEFAULT '' COMMENT '文件类型：image 图片 / document 文档 / video 视频；与扩展名 + MIME 三方交叉校验',
    file_ext VARCHAR(10) NOT NULL DEFAULT '' COMMENT '文件扩展名（小写，不含点），如 jpg / pdf / mp4',
    file_size BIGINT(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小（字节）；上限按端差异化，见 business-rule §9.1',
    oss_key VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'OSS 存储路径：requirement/{yyyyMM}/{uuid}.{ext}；🚨 按月分目录不含需求ID（前端直传时无ID）',
    oss_bucket VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'OSS Bucket 名；随附件落库而非取运行时配置，保证 Bucket 迁移后历史附件仍可访问',
    upload_user_id BIGINT(20) UNSIGNED DEFAULT NULL COMMENT '上传人 sys_user.id；upload_source=h5 时为 NULL（外部人不入 sys_user）',
    upload_user_name VARCHAR(64) DEFAULT NULL COMMENT '上传人姓名（冗余免联表）；h5 上传写外部提交人手填姓名',
    upload_source VARCHAR(10) NOT NULL DEFAULT 'web' COMMENT '上传来源：web 管理端 / app 移动端 / h5 公开外链；后端按此分支校验类型与大小',
    upload_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    is_appended TINYINT(4) NOT NULL DEFAULT 0 COMMENT '是否审批中追加：1=是（详情页打「审批中追加」角标并通知当前审批人）0=提交前上传',
    deleted_flag TINYINT(4) NOT NULL DEFAULT 0 COMMENT '逻辑删除：0=正常 1=删除；已提交需求的附件仅逻辑删除，不清 OSS',
    PRIMARY KEY (id),
    KEY idx_requirement_id (requirement_id, deleted_flag),
    KEY idx_upload_user (upload_user_id, upload_at)
) COMMENT='需求附件表，文件实体落 OSS，库内仅存元信息';
```

> - `file_type` 与 `file_ext` 的允许组合、单文件大小与张数上限按端差异化，规则真源见 [`business-rule.md`](business-rule.md) §9.1；**后端按 `upload_source` 二次校验，不信前端**
>   - **落地补充（2026-08-19）**：前端直传后后端拿不到文件流，因此 `file_type` 由上报的 `file_ext` **反推**而非采信前端传值；扩展名白名单 / 单文件大小 / 分类型张数上限三项仍在后端强校验（MIME 校验本期无法做，无文件流）
> - `oss_key` 路径规则固定 `requirement/{yyyyMM}/{uuid}.{ext}`（**原文为 `requirement/{requirement_id}/{uuid}.{ext}`，直传拿不到需求 ID 故改按月分目录**）：文件名 UUID 化防重名覆盖，`file_name` 仅作展示
>   - ⚠️ App 端实测：复用既有 `buildOssKey(dir, fileName)` 会多产生一层日期目录，实际 key 形如 `requirement/202608/2026-08-19/{ts}.{ext}`；前缀 `requirement/{yyyyMM}` 仍命中 Bucket 生命周期规则，不作修正
> - `oss_bucket` 落库而非取运行时配置：避免 Bucket 迁移后历史附件失效
> - `upload_source=h5` 时 `upload_user_id` 为 NULL，与 `requirement.submit_by` 为 NULL 的口径一致（外部人不入 `sys_user`）
> - ~~`content_check_status=rejected` 的附件**详情页不展示、不可下载**，但记录保留供审计~~ —— **本期不实现**（内容安全审核整节不做，无此两列）
> - `is_appended=1` 标识已提交后追加的附件，详情页附件区块以「审批中追加」角标区分，并触发通知当前审批人
> - `deleted_flag` 软删：~~草稿态删除即置 1（并异步清理 OSS）~~ → **落地口径统一为只逻辑删除，不做 OSS 物理移除**（异步清理失败会以「OSS 报错」形态掩盖业务首因），孤儿对象交 Bucket 生命周期规则回收
> - 遵循本模块软删红线：不建 `UNIQUE KEY`，同一需求下允许同名文件多次上传（以 `oss_key` 区分）

---

## 8. requirement_sla_config（审批 SLA 配置表）

> **实现落地差异（2026-08-19，已随代码实现确认）**：下方 DDL 已按 `01_ddl.sql` 逐字段对齐（字段集与需求原文完全一致，仅补齐类型宽度 / `DEFAULT` / `COMMENT`），并追加两项推论：
> 1. **本表无 `deleted_flag` 列**（照原文落地），因此：停用走 `status=0`（行保留、不参与匹配），**删除为物理删除**（`DELETE`，行不可恢复），变更与删除的留痕完全依赖 `requirement_event_log` 的 `SLA_CONFIG_CHANGED` 事件。
> 2. **默认矩阵已随 `01_ddl.sql` 初始化 24 行**（2 产品线 × 4 优先级 × 3 级次），`created_by=-1` 标识系统初始化（区分于人工新增行）。

```sql
CREATE TABLE requirement_sla_config (
    id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    product_line VARCHAR(16) NOT NULL DEFAULT 'SNACK' COMMENT '产品线：SNACK 零食王国 / YDTJ 有点推荐；🚨 不支持 * 通配，必须等值命中',
    priority VARCHAR(4) NOT NULL DEFAULT '*' COMMENT '优先级条件：P0 / P1 / P2 / P3；* = 全优先级通配（精确优先于通配）',
    approval_level INT(11) NOT NULL DEFAULT 1 COMMENT '审批级次：1=业务线负责人 2=实施负责人 3=产品经理',
    remind_hours INT(11) NOT NULL DEFAULT 48 COMMENT '催办触发时长（小时）：节点停留超过该值发企微催办给当前级次全部审批人',
    escalate_hours INT(11) NOT NULL DEFAULT 72 COMMENT '升级触发时长（小时）：节点停留超过该值通知审批人直接上级 + 提交人；必须 > remind_hours',
    remind_window_hours INT(11) NOT NULL DEFAULT 24 COMMENT '催办去重窗口（小时），默认 24；同窗口内同需求同级次仅催一次，手动催办共用本窗口',
    status TINYINT(4) NOT NULL DEFAULT 1 COMMENT '状态：1=启用 0=停用；停用行不参与 SLA 匹配',
    remark VARCHAR(256) DEFAULT NULL COMMENT '配置说明；≤256 字',
    created_by BIGINT(20) NOT NULL DEFAULT 0 COMMENT '创建人 sys_user.id；-1=系统初始化',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by BIGINT(20) DEFAULT NULL COMMENT '更新人 sys_user.id；未被人工修改过为 NULL',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_cond (product_line, priority, approval_level),
    KEY idx_status (status)
) COMMENT='需求审批 SLA 配置，按产品线×优先级×审批级次三维匹配，精确优先于通配';
```

> - 匹配顺序（`product_line` 不参与降级，必须等值命中）：`(pl, priority, level)` 精确 → `(pl, *, level)`，命中即止；两级均未命中时取系统兜底默认值 `remind=48h / escalate=72h`
> - 定位键为三元组 `(product_line, priority, approval_level)`；唯一性由 Service 层「先查后写 + `FOR UPDATE` 行锁」保证，不建 `UNIQUE KEY`（对齐本文件顶部软删红线）
> - **不含业务线维度**：SLA 是全公司统一的时效纪律，按业务线分治会导致同优先级需求时效口径不一致；如后续确有分治需求需同时补 `biz_line` 列与匹配降级链
> - 默认配置矩阵（初始化脚本写入，每个产品线各 4 行 × 3 级次）见 [`business-rule.md`](business-rule.md) §10.3；**已随 `01_ddl.sql` 落地 24 行**
> - 配置变更**立即对在途需求生效**（与审批链快照机制相反）：SLA 为运行期时效纪律，不做快照，改完下一次 Job 掃描即按新阈值判定
>   - **落地补充（2026-08-19）**：因为立即生效，调紧阈值可能让一批在途需求瞬时进入催办范围，故额外提供 `POST /sla/config/impact` 预检接口（只读，不发消息不写库）供保存前二次确认弹窗
> - 催办与升级的发送记录落 `requirement_event_log`（`event_type=SLA_REMINDED` / `SLA_ESCALATED`），去重键见 §5 与 [`job-schedule.md`](job-schedule.md) §3.4；静默时段命中只写 `SLA_DEFERRED`（不占去重窗口）

---

## 9. requirement_ai_plan（AI 方案确认执行记录表）

> 2026-09-10 新增，规则真源见 [`business-rule.md`](business-rule.md) §11。承载产品确认节点（L3）AI 辅助的执行全程：方案草稿、三段式确认摘要、信息缺口清单、补材请求与确认动作，按审批轮次隔离、版本递增，仅追加不物理删除。

```sql
CREATE TABLE requirement_ai_plan (
    id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    requirement_id BIGINT(20) UNSIGNED NOT NULL COMMENT '关联 requirement.id',
    requirement_no VARCHAR(32) NOT NULL DEFAULT '' COMMENT '关联 requirement.requirement_no（冗余便于排查）',
    approval_round INT(11) NOT NULL DEFAULT 1 COMMENT '审批轮次，与 requirement.approval_round 对齐；驳回重提后新一轮记录隔离',
    plan_version INT(11) NOT NULL DEFAULT 1 COMMENT '方案版本：同轮内「重新生成」递增，首轮为 1',
    trigger_type VARCHAR(16) NOT NULL DEFAULT 'AUTO' COMMENT '触发类型：AUTO=进入产品确认节点自动触发；MANUAL=PM 面板手动重新生成',
    status VARCHAR(16) NOT NULL DEFAULT 'GENERATING' COMMENT 'GENERATING=生成中 / READY=待PM确认 / CONFIRMED=已确认并通过 / OBSOLETED=已作废（或签先批/人工直批/撤回/链重建） / FAILED=生成失败',
    pm_user_id BIGINT(20) NOT NULL DEFAULT 0 COMMENT '触发时命中的产品经理 sys_user.id（开启 AI 辅助开关者，business-rule §11.2）',
    pm_user_name VARCHAR(64) NOT NULL DEFAULT '' COMMENT '产品经理姓名快照（冗余免联表）',
    summary TEXT COMMENT '三段式确认摘要（Markdown）：① 业务诉求是什么 ② 本次方案完成了什么 ③ 信息缺口与建议业务补充的内容；详情页 AI 方案面板主展示',
    plan_detail MEDIUMTEXT COMMENT '方案草稿全文（Markdown）：按七步分析框架产出（诉求还原/存量排重/可行性/端型权限/状态机通知/模块归属与工作量/信息缺口），框架见 business-rule §11.3',
    gap_items TEXT COMMENT '信息缺口清单（JSON 数组）；「请求补充材料」的预填文案来源',
    material_request TEXT COMMENT '最近一次「请求补充材料」实际发出的文案终稿（PM 编辑确认后）；未发出为 NULL',
    material_requested_at DATETIME DEFAULT NULL COMMENT '补材请求发出时间（PM 确认发出时写入）',
    ai_model VARCHAR(64) NOT NULL DEFAULT '' COMMENT '执行模型标识，溯源用',
    tool_trace MEDIUMTEXT COMMENT '执行过程 Tool 调用轨迹（JSON 数组：工具名/入参摘要/结果摘要），审计回放用；模型只接收脱敏结果，本字段同样不落敏感明文',
    fail_reason VARCHAR(512) DEFAULT NULL COMMENT '生成失败原因（模型超时/Tool 异常/配额耗尽）；status=FAILED 时必填',
    confirmed_by BIGINT(20) DEFAULT NULL COMMENT '确认操作人 sys_user.id（=执行「确认并通过」或「请求补充材料」的 PM 本人）',
    confirmed_at DATETIME DEFAULT NULL COMMENT '确认时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（任务触发时间）',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_req_round (requirement_id, approval_round),
    KEY idx_pm_status (pm_user_id, status),
    KEY idx_status_created (status, created_at)
) COMMENT='需求 AI 方案确认执行记录：产品确认节点 AI 辅助的方案草稿、确认摘要、信息缺口与补材请求全留痕，仅追加不物理删除';
```

> - **任务唯一约束**：`(requirement_id, approval_round)` 内 `trigger_type=AUTO` 仅一条；`MANUAL` 按 `plan_version` 递增（同轮重生成取 `MAX(plan_version)+1`）。不建 `UNIQUE KEY`（对齐本文件顶部软删红线），唯一性由 Service 层「先查后写 + `FOR UPDATE` 行锁」保证
> - **状态机**：`GENERATING` → `READY` / `FAILED`；`READY` → `CONFIRMED`（确认并通过，同步触发 L3 通过动作）/ `OBSOLETED`；`GENERATING` / `READY` 在或签先批、人工直批、撤回、审批链重建时统一置 `OBSOLETED`；`CONFIRMED` / `OBSOLETED` / `FAILED` 为终态
> - **本表无 `deleted_flag` 列**：执行记录属审计性质，仅追加不删除（对齐 `requirement_approval_log` 口径）
> - 🚨 **触达隔离的落库口径**：`summary` / `plan_detail` / `gap_items` 在 PM 确认前**仅当前级次审批人与管理员可见**（接口层按可见范围收口，business-rule §11.1 红线一）；`material_request` 写入即代表已确认发出，可对提交人展示
> - `confirmed_by` / `confirmed_at` 同时覆盖「确认并通过」与「请求补充材料」两类确认动作，区分看 `status`（`CONFIRMED`）与 `material_requested_at` 是否非空
> - 与 `requirement_approval_log` 的关联：「确认并通过」产生的审批流水 `opinion` 带「【AI方案确认】」前缀，`event_detail` / 流水扩展信息引用本表 `id`

---

## 10. 编号规则

格式：`REQ-{YYYYMMDD}-{NNN}`

- `REQ`：全局统一前缀，与产品线 / 业务线 / 提交来源解耦（这些信息落在 `product_line` / `biz_line` / `submit_source` 字段，不进编号）
- `YYYYMMDD`：取提交动作发生的业务日期（服务器时区 +08:00），草稿保存不生成编号
- `NNN`：同日内递增序号，3 位零填充，从 `001` 开始；次日从 `001` 重新计数

示例：

```
REQ-20260801-001    (2026-08-01 当日第 1 条提交的需求)
REQ-20260801-002
REQ-20260802-001    (次日从 001 重新开始)
```

**约束：**

- 生成时对同前缀取行锁保证序号单调递增，避免并发重号（内部与外部提交共用同一取号器，不分池）
- 编号一经生成不可变：驳回重提沿用原编号，草稿删除后序号不回收；外部提交单无草稿态，提交即生成编号
- 与 feature-schedule 的 `FS-{YYYYMMDD}-{NNN}` 编号体系相互独立，通过 `linked_card_no` 建立引用关系
