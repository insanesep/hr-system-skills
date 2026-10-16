---
name: 黑灯工厂工单
description: 黑灯工厂巡检产出的工单化闭环管理。两个黑灯 agent(错误日志/大SQL结果集修复)每轮把 P1/P2 问题自动建单:已自动修复的进待复核、待判断的按负责人指派、业务确认的知会留痕;研发在 Web 端认领/解决/忽略/复核,替代原企微群机器人推送。Use when 黑灯工厂产出需要工单化跟踪闭环, 需要按负责人分派巡检问题并统计时效, 需要已修复项复核打回流程, 巡检告警需要从群消息升级为可沉淀的工作流。仅 Web 端
metadata: {"clawdbot":{"emoji":"🏭","requires":{"anyBins":[]},"os":["linux","darwin","win32"]}}
---

# 黑灯工厂工单(运维管理)

黑灯工厂两个 agent(错误日志自动修复 / 大SQL结果集修复)每 3 小时一轮巡检的**产出收口模块**:agent 完成分诊后,把 P1/P2 条目自动建成工单——已自动修复推送的进「待复核」、没办法安全判断的按代码负责人「待认领/已指派」、业务确认不用动的「知会留痕」;研发在 Web 端完成认领 → 处理 → 复核 → 关闭的闭环,通知由企微群机器人推送改为**工单 + 企微应用消息按人提醒**。

> 与「日志异常报表」分工:报表 = 每日全量异常指纹聚合趋势(只读分析 + 手工标记);工单 = agent 已分诊定级定人的问题**流程闭环**(自动建单 + 状态机 + SLA)。同一指纹可能两边都出现,互相引用不重复展开。

## 端

仅 **Web 端**(管理后台,运维管理菜单)。App 端不做。

| 端 | 范围 | 目标用户 |
|---|---|---|
| Web | 运维管理 → 黑灯工厂工单 列表页 + 详情抽屉 + 处理弹窗 | 后端研发(负责人/认领人)、研发负责人(复核/时效统计) |

## When to Use

- 黑灯工厂 agent 每轮巡检产出需要落库跟踪,而不是发完群消息就沉底
- 待判断问题需要明确到具体研发负责人,跟踪认领与处理时长(SLA)
- 已自动修复的 commit 需要负责人复核确认或打回
- 业务确认类问题需要留痕,避免同一问题每轮重复告警
- 统计黑灯工厂的修复率、响应时长、复发率等运营指标

## Prerequisites

| 引用资源 | 路径 | 用途 |
|---------|------|------|
| 业务规则真源 | [`references/business-rule.md`](references/business-rule.md) | 状态机/建单幂等/负责人指派/通知规则/SLA/agent 接入规范 |
| 数据模型 | [`references/data-model.md`](references/data-model.md) | blacklight_ticket 表结构与索引 |
| UI 描述 | [`references/web-ui.md`](references/web-ui.md) | 页面区块/交互/权限点 |
| 日志异常报表 | [`../日志异常报表/SKILL.md`](../日志异常报表/SKILL.md) | 指纹归一化口径复用;SLS deeplink 拼接复用 |
| 企微应用消息 | [`../../../依赖文档/公共功能/企微应用消息发送/SKILL.md`](../../../依赖文档/公共功能/企微应用消息发送/SKILL.md) | 按人提醒通道(替代群机器人) |
| 导出接入 | [`../../../依赖文档/公共功能/导出接入/SKILL.md`](../../../依赖文档/公共功能/导出接入/SKILL.md) | 工单列表导出复用统一导出中心 |
| 错误日志黑灯工厂 | [`../../../依赖文档/公共功能/错误日志黑灯工厂/SKILL.md`](../../../依赖文档/公共功能/错误日志黑灯工厂/SKILL.md) | 来源 agent 之一(分诊/分级/负责人判定口径) |
| 大SQL结果集修复 | [`../../../依赖文档/公共功能/大SQL结果集修复/SKILL.md`](../../../依赖文档/公共功能/大SQL结果集修复/SKILL.md) | 来源 agent 之二 |

## 页面功能概览

| 页面 | 路由 | 说明 |
|------|------|------|
| 黑灯工厂工单 | `/ops/blacklight-ticket` | KPI 卡 + 筛选 + 工单表格 + 详情抽屉 + 处理弹窗;默认「我的工单」视图(当前登录人=负责人或认领人) |

## Tips

- 工单**只由两个 agent 建单**(devops 内部上报接口,复用 /log/trace 的 token 体系),Web 端不提供手工新建——手工问题走「问题反馈」模块
- 只 P1/P2 建单;P3/噪声维持 agent 侧仅计数,不进工单,防刷屏
- 同一问题(同指纹/同 mapper)未关闭前**不重复建单**,只追加出现轮次与最新证据;已关闭后复发才开新单并关联父单
- 已自动修复项建单即「待复核」状态并带 commit 哈希,复核通过才关闭,打回则重新打开
- 群机器人 webhook 已于 2026-10-08 停用(仅保留采集/建单失败简报):两个 agent 手册 Step 5 与 cron prompt 同日切换为 MCP 工具 `snackingdom__blacklight_ticket_report` 建单,详见 business-rule.md §6/§8
- 工单的负责人、企微 ID 由 agent 侧判定后直接落单(sys_user + sys_user_wecom 口径),Web 端支持改派

## 变更记录

| 日期 | 变更 |
|---|---|
| 2026-09-20 | 初版立项:agent 自动建单(✅待复核/❓待判断/📌业务确认三态)、负责人指派、企微应用消息按人提醒、SLA 时效,替代群机器人推送 |
| 2026-09-21 | v1.0 实现交付(devops+ foundation MCP×3 + Web + docs/20260921/blacklight-ticket)。实现期裁定 5 项:① §4.2 与 uk_source_biz 物理冲突,改「单行复发重开」(recur_count+1,parent_id 恒 0 预留,顽疾口径改 recur_count≥1);② 新增 blacklight_ticket_log 流水表(时间线与 MCP 回复落库);③ 权限码按仓库惯例 MENU/BUTTON:RND:OPS:BLACKLIGHT_TICKET:*(原 OPS_BLACKLIGHT_TICKET_* 作废);④ MCP feign 写端点突破只读收口先例(用户明确要求,已类注释登记);⑤ 前端落 views/operation/BlacklightTicket.vue(随日志异常报表惯例)。详见 references 各处「2026-09-21 实现注」 |
| 2026-10-08 | 模块上线发版;两个 agent(错误日志黑灯工厂/大SQL结果集修复)手册 Step 5 与 qoder_cron prompt 同日切换为 `snackingdom__blacklight_ticket_report` MCP 建单(替代原群机器人主报告),群 webhook 仅保留采集失败/建单失败简报;agent 侧负责人判定产出收敛为 ownerEmail(企微 ID 由服务端解析) |
