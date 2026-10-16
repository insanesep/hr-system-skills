---
name: requirement-management-job-schedule
description: 需求管理 - Job 配置：外链过期状态兜底 Job、审批 SLA 催办 Job 的触发策略、执行流程、幂等设计与双跑红线
type: reference
---

# 需求管理 · Job 配置

> 归属服务：`busyming-snackingdom-devops`，模块 `busyming-snackingdom-devops-job`
> SchedulerX：`namespace=9d5c0605-...`、`groupId=busyming-snackingdom`（与存量单体共用）
> 规则真源见 [business-rule.md](business-rule.md)，字段见 [data-model.md](data-model.md)。

---

## 1. Job 清单

| Job 类 | 名称 | Cron | 模式 | 超时 | 幂等 | 资损级 |
|--------|------|------|------|------|------|--------|
| `RequirementPublicLinkExpireJob` | 需求外链过期兜底 | `0 10 1 * * ?`（每日 01:10） | `standalone`，并发 1，重试 1 | 600s | 是（幂等更新） | 否 |
| `RequirementSlaRemindJob` | 需求审批 SLA 催办 | `0 0 * * * ?`（每小时整点） | `standalone`，并发 1，**重试 0** | 600s | 是（事件流水去重键） | 否 |

配置方式：`@ScheduleXJob` 注解声明（`failAlertEnable=true`、`timeoutAlertEnable=false`），继承 `AbstractJavaProcessor`。

Job 名称（SchedulerX 控制台注册名）：`requirement-public-link-expire-job` / `requirement-sla-remind-job`。

---

## 2. `RequirementPublicLinkExpireJob`

### 2.1 职责边界（🚨 关键）

**本 Job 只做落库状态对齐，不承担任何业务判定。**

外链是否过期，一律以「**查询 / 校验时按 `expire_at` 实时判定**」为准 —— 公开 H5 的 token 校验、提交前置校验、Web 台账列表三处口径必须完全一致，均走 `RequirementPublicLinkServiceImpl.resolveRealStatus()`。

Job 的唯一作用：把 `expire_at` 已过、但 `status` 仍为 `GENERATED` 的行刷成 `EXPIRED`，便于按状态检索与统计。

> ✅ 推论：**Job 不执行也不影响业务正确性**。外链不会因 Job 挂掉而被误用；反之 Job 也不会「提前」让链接失效。

### 2.2 触发策略

- 每日 01:10 单机执行，错峰安排：不与需求推送类、报表类 Job 撞档。
- `maxConcurrency=1` + `maxAttempt=1`：纯幂等更新，无需重试放大。

### 2.3 执行流程

1. 记录开始日志（含 `jobId`）与起始时间戳
2. 调 `RequirementPublicLinkExpireService.expireOverdueLinks()`
   - 条件更新：`status='GENERATED' AND expire_at < NOW() AND deleted_flag=0` → `status='EXPIRED'`
   - 返回受影响行数
3. 输出 `expired=N, elapsed=Xms` 作为 `ProcessResult` summary
4. 异常时 `log.error` + 返回 `ProcessResult(false, message)`，由 SchedulerX 告警

### 2.4 幂等设计

- 更新条件自带状态过滤，重复执行第二次受影响 0 行，天然幂等
- 不写任何流水 / 不发任何通知（避免重复执行造成噪音）
- 不改 `submit_count` / `revoked_*` 等业务字段，只动 `status`

### 2.5 双跑红线

🚨 需求管理相关 Job **仅在 devops 服务注册**。若存量单体 `busyming-snackingdom` 侧存在同名或同职责 Job，必须**先在单体侧下线**，两侧严禁同时 `enabled`。

本 Job 为本次新增，单体侧无对应实现，无双跑风险；但 SchedulerX 与单体共用 `groupId=busyming-snackingdom`，**新增 Job 命名需避免与单体既有 Job 重名**。

### 2.6 排查线索

| 现象 | 排查方向 |
|------|---------|
| 台账里有过期链接仍显示「待使用」 | 正常：Job 未跑到；但**实际不可提交**（实时判定生效）。确认列表返回的 `status` 是否已被实时判定覆盖 |
| Job 报错 | 查日志前缀 `[需求外链过期Job]`；多为数据源连接问题 |
| 链接过早失效 | 与 Job 无关，查 `expire_at` 与 `valid_days` 生成逻辑，以及是否被人工撤销（`status=REVOKED` + `revoke_reason`） |

日志关键字：`[需求外链过期Job]`、`[需求外链]`（Controller）、`[需求公开H5]`（公开接口）。

---

## 3. `RequirementSlaRemindJob`

> Job 名：`requirement-sla-remind-job`；规则真源 [business-rule.md](business-rule.md) §10；配置表 [data-model.md](data-model.md) §8 `requirement_sla_config`。

### 3.1 职责边界（🚨 关键）

**本 Job 只发通知与写事件流水，不做任何业务写入。**

- 不推进状态、不自动审批、不改 `requirement.status`、不改审批链快照：超时仅催办与升级通知，**审批权始终在人**（business-rule §10.2：被升级通知的上级不获得代审权）。
- 节点停留时长**不落库**：以 `requirement_approval_log` 中当前轮次进入本级的最近一条流水 `operated_at` 为起算点实时计算（L1 取 `submit_at`，business-rule §10.1）。
- SLA 配置**不做快照**：每轮执行实时读 `requirement_sla_config`，配置改后下一轮即生效（business-rule §10.3）。

> ✅ 推论：**Job 不执行不影响审批正确性**，仅丢失催办提醒；滞留看板与 SLA 仪表盘均为**查询时实时计算**，不依赖 Job 写数。

### 3.2 触发策略

- `0 0 * * * ?` 每小时整点单机执行；阈值最小粒度为小时，整点扫描即可满足精度。
- `maxConcurrency=1`：避免两轮重叠导致同一节点重复推送。
- 🚨 `maxAttempt=0`（**不重试**）：本 Job 伴随对外推送，重试会放大骚扰风险；失败直接告警，下一个整点自然补上（去重窗口保证不重发）。
- 错峰：与 `RequirementPublicLinkExpireJob`（每日 01:10）不撞档。
- 🚨 **静默时段**：每日 22:00–08:00 只写事件流水不发企微消息，~~积压至 08:00 那轮合并发送~~，避免凌晨打扰审批人。

> **实现落地差异（2026-08-19，已随代码实现确认）** —— 🚨 **静默时段与去重键的需求内部矛盾修正**：
> 1. **矛盾点**：本节原文要求静默期「只写事件流水不发消息，积压至 08:00 那轮合并发送」，而 §3.4 / [`business-rule.md`](business-rule.md) §10.7 要求「推送前先插事件流水，去重键命中即跳过」「失败也占用去重窗口」—— **二者互斥**：静默期若写了 `SLA_REMINDED` / `SLA_ESCALATED` 去重键，08:00 那轮必被去重跳过 → 催办**永久发不出去**。
> 2. **实际实现**：静默时段命中催办 / 升级条件时，只写**新增事件类型 `SLA_DEFERRED`**（`dedupe_key` 传 null，**不参与去重**），**绝不写** `SLA_REMINDED` / `SLA_ESCALATED`；静默结束后那轮（08:00）按正常流程重新判定并发送。因此不存在真正的「合并发送」逻辑，而是「延后到 08:00 重算重发」。
> 3. **目标日期预警同样纳入静默延后**：它是日推且去重键含自然日，00:00–08:00 命中的延到 08:00 仍属同一自然日，当天照发不丢。
> 4. **手动催办不受静默时段限制**（人在页面上主动点击，抑制发送违背操作意图），只受 §3.4 去重窗口约束。

### 3.3 执行流程

1. 记录开始日志（含 `jobId`）与起始时间戳
2. 扫描待处理需求：`status IN ('BU_REVIEWING','IMPL_REVIEWING','PM_REVIEWING') AND deleted_flag=0`
   - 🚨 只有这三个审批中态参与 SLA；`SUBMITTED` 与 `BU_APPROVED` / `IMPL_CONFIRMED` 为同事务瞬时态，**不可能停留**，无需扫描
   - 分批游标按 `id` 升序每批 500 条，避免全表一次捞取
3. 逐条计算：
   - 取当前审批级次 `approval_level` 与当前轮次进入本级的时间点 → 得 `staleHours`
   - 按【产品线 × 优先级 × 审批级次】匹配 `requirement_sla_config`（`status=1`，**精确优先于 `*` 通配**）；未命中走默认 `remind=48h` / `escalate=72h` / `window=24h`
4. 触发判定（同一条需求两者可共存，先升级后催办）：
   - `staleHours >= escalateHours` → 升级：通知当前审批人的直接上级（`sys_dept` 部门负责人）+ 需求提交人；取不到上级时降级通知实施负责人；外部单无提交人，改推邀约人（business-rule §10.2）
   - `staleHours >= remindHours` → 催办：企微个人消息推当前级次**全部**审批人（或签多人均推）
   - 两类推送均先查去重窗口，命中则跳过（见 §3.4）
   - 🚨 **静默时段（落地，2026-08-19）**：命中上述任一条件但处于 22:00–08:00 时，**只写 `SLA_DEFERRED`（`dedupe_key=null`）并直接 continue**，不发消息、不写 `SLA_REMINDED` / `SLA_ESCALATED`、不占去重窗口（见 §3.2 落地差异）
5. 一并处理**目标日期预警**（business-rule §10.4）：`target_date` 距今 ≤7 天且状态未达 `LINKED` 的需求，推预警给 L2 实施负责人，**每天最多 1 条**（去重窗口按自然日）；静默时段同样只写 `SLA_DEFERRED` 延后
6. 输出 `scanned=N, reminded=A, escalated=B, targetWarned=C, skippedByWindow=D, elapsed=Xms` 作为 `ProcessResult` summary
7. 单条异常 `log.error` 后**继续处理下一条**（不因一条脏数据中断整轮）；整轮异常返回 `ProcessResult(false, message)` 由 SchedulerX 告警

### 3.4 幂等设计

> **实现落地差异（2026-08-19，已随代码实现确认）**：
> 1. 🚨 **去重键增加 `approval_round` 段**：`{event_type}_{requirement_id}_{approval_round}_{approval_level}_{remind_window}`。原式（不含轮次）存在缺陷：驳回重提后 `approval_round` +1，但节点停留时长归零使 `remind_window = floor(0 / 24) = 0` 也归零，`approval_level` 又回到 L1，新一轮前几个窗口的键与上一轮已落库的键**逐字相同** → 新一轮催办被永久去重跳过。因此下方最后一条「驳回重提自然开新窗口」的推论**必须靠 `approval_round` 段才成立**。
> 2. 🚨 **静默时段不入去重体系**：静默期只写 `SLA_DEFERRED` 且 `dedupe_key` 传 null，**不占用任何去重窗口**；下方「推送失败也占用窗口」仅适用于**真实尝试推送后失败**的场景（详见 §3.2 落地差异）。
> 3. **手动催办**仍共用去重窗口，但**不受静默时段限制**。

去重键：**`requirement_id + approval_round + approval_level + remind_window`**，落在 `requirement_event_log` 事件流水上。

- `remind_window` = 按 `remind_window_hours`（默认 24）对当前时间向下取整得到的窗口标识，同一窗口内多次执行得到同一值
- 完整去重键形式：~~`{event_type}_{requirement_id}_{approval_level}_{remind_window}`~~ → **`{event_type}_{requirement_id}_{approval_round}_{approval_level}_{remind_window}`**（data-model §5），催办与升级各持一个 `event_type`，互不占用彼此窗口
- 推送前先插事件流水（去重键命中即跳过），**再发企微**：宁可丢一次提醒，不可重复骚扰
- 🚨 **推送失败也占用窗口**（business-rule §10.7）：企微接口报错不回滚事件流水，避免企微抖动时整轮重发
- 手动催办（api-spec §6.1）**共用同一去重窗口**：人工刚催过，Job 本窗口不再重发
- 节点一旦推进到下一级，`approval_level` 变化即开新窗口，旧级次记录不影响新级次催办；驳回重提靠 `approval_round` 段开新窗口

### 3.5 双跑红线

🚨 同 §2.5：需求管理相关 Job **仅在 devops 服务注册**，存量单体 `busyming-snackingdom` 侧严禁同时 `enabled`。

本 Job 伴随对外企微推送，**双跑后果比外链过期 Job 严重得多**：两侧各自插事件流水时去重键会在不同事务里各护一次，审批人会收到两条相同催办。上线前必须确认 SchedulerX 控制台（`groupId=busyming-snackingdom`）无同名 / 同职责 Job。

### 3.6 排查线索

| 现象 | 排查方向 |
|------|---------|
| 审批人说没收到催办 | 依次查：① 当前是否静默时段延后中（§3.2；看 `requirement_event_log` 是否有 `SLA_DEFERRED`）② `requirement_event_log` 是否已有同去重键记录（已发过/已占窗口）③ 命中的 SLA 配置 `remind_hours` 是否被调大 ④ 企微推送日志 |
| 驳回重提后新一轮永远不催办 | 查去重键是否已含 `approval_round` 段（§3.4 落地差异 1）；旧式键会与上一轮逐字相同而被跳过 |
| 同一需求反复催办 | 查是否双跑（§3.5）；或 `remind_window_hours` 被配成过小值 |
| 停留时长看着不对 | 起算点取的是**当前轮次**进入本级的流水；驳回重提会重新计时，追加附件**不**重新计时（business-rule §9.4） |
| 升级通知发给了实施负责人而非上级 | 正常降级：审批人所属 `sys_dept` 未配置部门负责人（business-rule §10.2） |
| Job 报错 | 查日志前缀 `[需求SLA催办Job]`；单条异常不中断整轮，看 summary 里的计数差额定位 |

日志关键字：`[需求SLA催办Job]`、`[需求SLA]`（Service / Controller）。

---

## 4. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-08-11 | 新建。同步 busyming-skills `f31a9fb5`：新增外链过期兜底 Job |
| 2026-08-18 | 新增 §3 `RequirementSlaRemindJob`（审批 SLA 催办 / 升级 / 目标日期预警，每小时整点）；原 §3 变更记录顺延为 §4 |
| 2026-08-19 | 按落地实现回写：静默时段与去重键矛盾修正（只写 `SLA_DEFERRED`、`dedupe_key=null` 不占窗口）；去重键补 `approval_round` 段；手动催办不受静默限制；目标日期预警纳入静默延后 |
