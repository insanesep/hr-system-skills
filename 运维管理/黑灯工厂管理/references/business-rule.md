# 黑灯工厂工单 — 业务规则字典

## 1. 定位与边界

黑灯工厂工单是** agent 巡检产出的流程闭环层**,不是通用工单系统:

- 建单方只有两个:错误日志黑灯工厂(blacklight)、大SQL结果集修复(bigsql-fix)
- Web 端不提供手工新建;手工报障走「营运/任务协同/问题反馈」
- P3/噪声不建单(agent 侧仅计数);只有 P1/P2 进工单
- 日志异常报表(log_error_daily_report)继续承担每日全量指纹趋势分析,工单不替代它

## 2. 工单三分类(category)

| category | 来源动作 | 建单状态 | 说明 |
|---|---|---|---|
| `FIXED_REVIEW` 自动修复待复核 | agent 已 commit+push | `REVIEW` | 带 commit 哈希;复核通过→RESOLVED,打回→REOPENED |
| `PENDING_JUDGE` 待判断 | unknown / keep-risk(不敢自动修) | `OPEN` | 必须带「建议:」人话结论与已掌握证据 |
| `BIZ_CONFIRM` 业务确认 | business / keep-business | `OPEN`(低打扰) | 知会留痕;处理人确认口径后关闭或转办 |

## 3. 状态机

```
                 ┌─────────────────────────────────────────┐
                 │                                         │
OPEN(待认领/已指派) ──认领──▶ CLAIMED(处理中) ──解决──▶ RESOLVED(已解决)
 │    │                                              ▲
 │    └──无需处理(备注必填)──▶ IGNORED(已关闭)      │复核通过
 │                                                  │
REVIEW(待复核) ──复核通过──▶ RESOLVED ──────────────┘
REVIEW ──复核打回(备注必填)──▶ REOPENED(≡OPEN,重新进入待认领)
RESOLVED/IGNORED 之后同源复发(新轮仍命中) ──新建单并关联 parent_id──▶ OPEN
```

规则:

- `CLAIMED` 只能由认领人本人或研发负责人执行「解决/转办」
- `IGNORED` 必须填原因(噪声/口径如此/三方问题);IGNORED 的单参与「免打扰」——agent 侧同键问题后续轮次仅计数
- `REVIEW` 超过 72h 未复核,按 P2 升级规则提醒(见 §6)

## 4. 建单幂等(防刷屏核心)

业务唯一键 `uk_source_biz` = `source + biz_key`:

| source | biz_key 构成 |
|---|---|
| `blacklight` | 异常指纹(16 hex,与 blacklight-fetch.py 输出一致) |
| `bigsqlfix` | `svc + "|" + mapper 全限定名` |

 upsert 规则(agent 每轮调用上报接口时执行):

1. 同 biz_key 存在**未关闭**工单(OPEN/CLAIMED/REVIEW/REOPENED)→ **不新建**:`occur_count` 累加本轮 count、`occur_rounds+1`、`last_seen_at=now`、evidence 追加本轮 traceId/SQL 样例(各≤3 条,滚动覆盖最旧)、summary/suggestion 若本轮有更新则覆盖
2. ~~同 biz_key 均已关闭(RESOLVED/IGNORED)→ **新建**,`parent_id` 指向最近一张已关闭单,`occur_rounds=1`~~
   **2026-09-21 实现注(裁定变更)**:本条与 `uk_source_biz` 唯一键物理冲突(唯一键下同键只能有一行)。实现改为**单行复发重开**:已关闭单同源复发 → 原单 REOPEN(status 回分类初始态、claimed/resolved/review 字段清空重启)、`recur_count+1`、`occur_rounds` 续增、上轮关闭信息进动作流水;`parent_id` 恒 0 预留。顽疾统计口径由「parent_id 链≥2」改为「recur_count≥1」
3. agent 侧「仅计数」条目(P3)不上报;上报即建单的最小载荷见 §8

## 5. 负责人指派与改派

- agent 建单时落 `owner_user_id / owner_name / owner_wecom_user_id`(其判定口径:代码 git blame/log → sys_user 在职研发 → sys_user_wecom 拿企微 ID;判不出来 → owner 为空,状态=OPEN 待认领)
- `level` 由 agent 落单时给定(P1/P2),Web 端展示不可改;分级口径变更只走 agent 手册
- Web 端支持**改派**(研发负责人角色):写 `owner_*` 三字段 + 操作日志;改派后即时触发一次 §6 提醒
- 负责人离职同步:每日与 sys_user 对账(leave_flag=1)→ 单未关闭且 owner 离职 → 清 owner 置 OPEN 待认领,提醒研发负责人

## 6. 通知规则(替代群机器人)

通道 = 企微**应用消息**(复用公共功能「企微应用消息发送」,按 `owner_wecom_user_id` 点对点),**不再发群机器人 webhook**。

| 时机 | 内容 | 频控 |
|---|---|---|
| 新单创建(含 upsert 后 count 环比翻倍以上的复发单) | 「黑灯工厂新工单 [级别] 标题 | 来源服务 | 点链接处理」 | 同一接收人每轮(3h)最多 1 条,多单合并为「新工单 N 条:P1×a P2×b」 |
| 改派 | 「你有工单被改派过来」 | 即时,不频控 |
| REVIEW 超 72h 未复核 | 提醒复核人 | 每日 09:30 合并 1 条 |
| OPEN/CLAIMED 超 SLA(§7) | 提醒负责人,抄送其 direct_leader | 每日 09:30 合并 1 条 |
| 采集失败(agent 侧) | 保留群发 webhook 简报 @ chenguojian | 每轮最多 1 条 |

**切换执行(2026-10-08 完成)**:模块上线发版后,两个 agent 手册 Step 5 与 qoder_cron prompt 已同日切换——产出改走 MCP 工具 `snackingdom__blacklight_ticket_report` 建单(§8 实现注的工具入口),企微应用消息按人提醒;群 webhook 仅保留采集失败/建单失败简报(每轮最多 1 条,@ chenguojian)。

## 7. SLA 与统计

| level | 响应 SLA(OPEN→CLAIMED/IGNORED) | 闭环 SLA(建单→RESOLVED/IGNORED) |
|---|---|---|
| P1 | 8 个工作小时 | 24h |
| P2 | 24h | 72h |
| FIXED_REVIEW | — | 72h(复核时限) |

- 超时列表行标红 + §6 提醒;工作小时 = 09:00~21:00
- 列表 KPI 与导出支撑:修复率(FIXED_REVIEW 复核通过率)、平均响应/闭环时长、复发率(parent_id 链长度≥2 的单占比)、负责人维度分布
- 工单保留 180 天,每日清理 Job 独立(参照日志异常报表保留期实现)

## 8. agent 接入规范(devops 内部接口)

两个 agent 落盘完成后(Step 5 替换点),调 devops 服务:

`POST {PROD_BASE}/snackingdom-devops/api/v1/ops/blacklight-ticket/report`(登录态复用 app_reviewer,与 /log/trace 同 token)

请求体(批量,单轮一次调用):

```json
{
  "source": "blacklight | bigsqlfix",
  "roundAt": "2026-09-20 16:32:00",
  "windowStart": "...", "windowEnd": "...",
  "items": [
    {
      "bizKey": "382fffd02ad3 或 warehouse|io.busyming...Mapper.selectX",
      "level": "P1|P2",
      "category": "FIXED_REVIEW|PENDING_JUDGE|BIZ_CONFIRM",
      "svc": "warehouse",
      "title": "一句话问题(≤60字)",
      "summary": "一句话根因/现状",
      "suggestion": "建议:一句人话结论(PENDING_JUDGE 必填)",
      "commitHash": "ffab12a(FIXED_REVIEW 必填)",
      "occurCount": 205,
      "evidence": {"traceIds": ["≤3"], "stack": "堆栈样例≤4000字符", "sqlSample": "≤2000字符", "trend": "205→205 持平"},
      "ownerEmail": "agent 判定结果,可为空(待认领)",
      "reportPath": "~/.qoder-watchdog/reports/blacklight-20260920-1500.md"
    }
  ]
}
```

服务端职责:ownerEmail → sys_user 查 owner_user_id/real_name/wecom_user_id(查不到落空待认领)→ 按 §4 upsert → 按 §6 触发提醒。接口幂等由 `uk_source_biz` + upsert 保证,agent 失败重发安全。

**2026-09-21 实现注(MCP 工具入口)**:除 HTTP 上报外,同能力已封装 3 个 MCP 工具(foundation `service/mcp/tool/`,均 requiresWrite,经 `/feign/mcp/blacklight-ticket/*` 调 devops,操作人透传登录态):

| 工具 | 用途 | 关键参数 |
|---|---|---|
| `snackingdom__blacklight_ticket_report` | 建单上报(与 §8 同 Service) | source + items 数组(元素含 bizKey/level/category/svc/title 等) |
| `snackingdom__blacklight_ticket_reply` | 回复(追加 REMARK 时间线) | id + remark |
| `snackingdom__blacklight_ticket_transition` | 状态流转 | id + action(claim/resolve/ignore/review-pass/review-reject/reassign)+ remark/reason/ownerUserId |

feign 写端点突破 `McpQueryFeignController` 只读收口先例,系用户明确要求,已在类注释与部署 README 登记。

## 9. RBAC 与操作日志

- 菜单:运维管理 → 黑灯工厂工单(二级),functionCode `MENU:RND:OPS:BLACKLIGHT_TICKET`,仅 WEB
- 按钮权限:`BUTTON:RND:OPS:BLACKLIGHT_TICKET:CLAIM`(认领/解决/忽略)、`BUTTON:RND:OPS:BLACKLIGHT_TICKET:REVIEW`(复核通过/打回)、`BUTTON:RND:OPS:BLACKLIGHT_TICKET:REASSIGN`(改派,研发负责人)、`BUTTON:RND:OPS:BLACKLIGHT_TICKET:EXPORT`(导出)
- 操作日志六要素覆盖:认领/解决/忽略/复核/打回/改派(与统一操作日志口径一致)

> 2026-09-21 实现注:权限码由原文 `OPS_BLACKLIGHT_TICKET*` 改为仓库惯例 `MENU/BUTTON:RND:OPS:BLACKLIGHT_TICKET:*`(对齐 LOG_ERROR_REPORT);改派判定「研发负责人」= 持有 REASSIGN 按钮权限。操作日志落 `blacklight_ticket_log` 表(新增,渲染详情时间线),同时保留 SLS 应用日志。

## 10. 反模式

- 手工页面建单(绕过 agent 分诊,破坏幂等键)
- agent 每轮全量新建而不走 upsert(刷屏根因)
- 把 P3/仅计数条目也建单(工单变报表)
- 复核打回不填备注(打回即 REOPENED,没有上下文认领人无法接手)
- 关闭单时不同步 agent 跨轮状态(IGNORED 后 agent 仍重复深析)
