# 黑灯工厂工单 — Web 端 UI 描述

> 骨架:page-blueprint v3.4.0 `skeletons/web/list-page.vue.tpl` 起手,参照「日志异常报表」同构;全部 Ac 组件 + `--ac-*` token,零原生标签零裸色值。

## 1. 路由与菜单

| 项 | 值 |
|---|---|
| 菜单位置 | 运维管理 → 黑灯工厂工单(二级,日志异常报表之后) |
| Path | `/ops/blacklight-ticket` |
| Component | `views/ops/blacklight-ticket/index.vue` |
| functionCode | `OPS_BLACKLIGHT_TICKET` |
| 端 | 仅 Web(菜单类型 WEB) |

## 2. 页面区块

```
Layout(面包屑:运维管理 / 黑灯工厂工单)
└─ tpl-page
   ├─ AcCard ① KPI 卡
   │    └─ tpl-kpi-row:
   │         AcStatistic 待认领(OPEN+REOPENED)      value-style=--ac-biz-pending
   │         AcStatistic 处理中(CLAIMED)
   │         AcStatistic 待复核(REVIEW)             value-style=--ac-biz-pending
   │         AcStatistic 今日已解决(RESOLVED)       value-style=--ac-biz-completed
   │         AcStatistic P1 未闭环                   value-style=--ac-biz-failed(>0 时)
   │
   ├─ AcCard ② 筛选 + 表格(同卡)
   │    ├─ AcFilterBar:级别(P1/P2) + 状态 + 来源(blacklight/bigsqlfix) + 服务(svc)
   │    │             + 负责人(AcSelect 研发花名册) + 关键字(title 模糊) + [只看我的 默认开] + [查询/重置]
   │    ├─ tpl-toolbar:__left 空容器(过程性:刷新时间);__right [导出]
   │    ├─ AcTable(row-key=id,列宽可拖)
   │    │    #empty: AcEmpty「本筛选无工单,黑灯工厂运转良好」
   │    ├─ AcPagination
   │
   ├─ AcDrawer ③ 详情抽屉(点行打开)
   │    └─ 上:级别/状态/来源/服务/命中次数×轮次/首末次时间/负责人/SLA 剩余
   │         中:summary、suggestion(高亮块)、commit(AcLink 跳 GitLab)
   │         证:evidence —— traceId(AcLink 跳 trace 查询页/SLS deeplink)、
   │             sqlSample(等宽字体块)、stack(AcCollapse 折叠)
   │         下:处理记录时间线(认领/备注/复核/改派) + parent 关联单链接
   │
   └─ AcModal ④ 处理弹窗(共用骨架,按动作切换)
        ├─ 认领:确认文案即可
        ├─ 解决:备注必填 ≤500
        ├─ 忽略:原因必填(AcRadio 噪声/口径如此/三方问题 + 备注 ≤500)
        ├─ 复核通过:备注选填
        ├─ 复核打回:备注必填(回到 REOPENED)
        └─ 改派:AcSelect 在职研发(搜姓名),确认后即时提醒对方
```

## 3. 列表列定义

| 列 | 字段 | 宽 | 说明 |
|---|---|---|---|
| 级别 | `level` | 70 | P1=红系 tag(--ac-biz-failed),P2=黄系(--ac-biz-pending);P1 行默认定前 |
| 工单号 | `ticketNo` | 130 | 等宽字体 |
| 标题 | `title` | 自适应 | Paragraph ellipsis + Tooltip;FIXED_REVIEW 前缀「已修复·待复核」icon |
| 来源 | `source` | 100 | AcTag 灰底:错误日志 / 大SQL |
| 服务 | `svc` | 110 | |
| 次数×轮次 | `occurCount / occurRounds` | 110 | 双行小字 |
| 负责人 | `ownerName` | 100 | 空显「待认领」黄字 |
| 状态 | `status` | 100 | AcTag:OPEN=黄/CLAIMED=蓝/REVIEW=黄/REOPENED=红/RESOLVED=绿/IGNORED=灰 |
| SLA | `slaDeadline` | 110 | 剩余>0 倒计时灰字;超时红字「已超 Xh」 |
| 创建时间 | `createdAt` | 160 | AcDateTime |
| 操作 | — | 180 | v-permission:认领/解决/忽略/复核/改派(按状态显隐) |

默认排序:level 升序(P1 前)→ createdAt 倒序。默认筛选:「只看我的」开 + 状态≠RESOLVED/IGNORED。

## 4. 交互闭环

| 动作 | 反馈 | 备注 |
|---|---|---|
| 认领 | Message.success + 行状态变 CLAIMED、认领人=当前用户 | OPEN/REOPENED 可认领;他人已认领不可抢 |
| 解决 | 状态→RESOLVED,resolved_by/at 落时间 | 备注必填 |
| 忽略 | 状态→IGNORED | 原因+备注必填;IGNORED 后同 biz_key agent 侧仅计数 |
| 复核通过 | 状态→RESOLVED | 仅 FIXED_REVIEW 单可见 |
| 复核打回 | 状态→REOPENED | 备注必填 |
| 改派 | owner_* 更新 + 对方收企微应用消息 | 研发负责人角色 |
| 导出 | 调统一导出中心,Notification 提示去消息中心下载 | 复用导出接入 |
| 超时 | 列表 SLA 列标红;每日 09:30 企微提醒负责人并抄送 direct_leader | 见 business-rule §6/§7 |

## 5. 按钮权限

| Code | 控件 |
|---|---|
| `OPS_BLACKLIGHT_TICKET_CLAIM` | 认领 / 解决 / 忽略 |
| `OPS_BLACKLIGHT_TICKET_REVIEW` | 复核通过 / 打回 |
| `OPS_BLACKLIGHT_TICKET_REASSIGN` | 改派 |
| `OPS_BLACKLIGHT_TICKET_EXPORT` | 导出 |

默认授予:超级管理员、研发负责人;普通研发授 CLAIM+REVIEW(只能操作自己名下工单,接口层校验)。

## 6. 状态色映射

| 状态 | token |
|---|---|
| OPEN / REVIEW | `--ac-biz-pending` |
| CLAIMED | `--ac-brand-blue` |
| REOPENED | `--ac-biz-failed` |
| RESOLVED | `--ac-biz-completed` |
| IGNORED | `--ac-text-3` |

禁品牌红 `--ac-brand-red` 做状态色(REOPENED 用 biz-failed 语义色)。
