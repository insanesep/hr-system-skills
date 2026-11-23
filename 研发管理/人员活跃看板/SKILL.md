---
name: 人员活跃看板
description: 人员活跃看板。Use when 需要按组织架构（中心 → 部门 → 子部门 / 小组 → 成员）查看研发人员每日活跃情况：以提交活动（Git 与产品云效需求创建）及 Qoder 用量判定绿 / 黄 / 红三级活跃并叠加考勤背景的活跃甘特图；按开发 / 产品 / 测试角色查看外部效能平台的质量、稳定性、产出与交付指标；下钻个人的排期卡片任务、Qoder 用量与考勤明细，用于发现长期不活跃人员。端型：仅 Web 管理端，只读看板。
metadata:
  domain: 研发
  clients: web
---

# 人员活跃看板

## 模块概述

按职能域组织架构查看人员活跃度：每人每天按提交活动与 Qoder 用量两类信号判定绿 / 黄 / 红，提交活动包含 Git 提交与产品云效需求创建，考勤作为背景区分应出勤日，组织与个人按活跃率汇总等级；同屏查看开发、产品、测试三类角色指标，并下钻个人的排期卡片任务与用量明细。纯只读分析页，不维护组织、成员或指标口径。

## 端

| 端 | 场景 | 目标用户 |
|---|---|---|
| Web | 管理后台人员活跃看板 | 管理层、研发负责人 |

## When to Use

- 按中心、部门或小组查看成员每日活跃甘特，找出应出勤日连续不活跃的人员
- 对比组织之间的活跃率与绿 / 黄 / 红人员分布
- 按开发、产品、测试角色查看 Bug、故障、需求变更、缺陷逃逸等角色指标
- 下钻个人的排期卡片领取与完成、Qoder 用量、代码提交和考勤明细

## Prerequisites

| 引用资源 | 路径 | 用途 | 所属仓库 |
|---------|------|------|---------|
| 业务规则 | [references/business-rule.md](references/business-rule.md) | 组织范围、活跃信号、考勤、等级、甘特、角色指标、KPI、权限与三态 | 本模块 |
| 数据定义 | [references/data.md](references/data.md) | 人员活跃日记录、角色指标快照与枚举 | 本模块 |
| Web 页面 | [references/web-ui.md](references/web-ui.md) | 页面区块、导航、操作反馈与筛选校验 | 本模块 |
| 组织树与主职任职 | [user-org-api.md §3](../../../busyming-skills-common/api/mmhm/system/用户权限/references/user-org-api.md#3-orgtreereadfacade-权限组织查询) | 职能域组织层级与主职人员 | busyming-skills-common |
| 组织数据权限 | [row-permission-api.md](../../../busyming-skills-common/api/mmhm/system/用户权限/references/row-permission-api.md) | 按登录人裁剪可见组织 | busyming-skills-common |
| 成员身份 | [项目管理 · 成员与身份](../项目管理/references/business-rule.md#identity) | 组织人员对应 Git 作者与 Qoder 账号 | busyming-skills-devops |
| 有效提交口径 | [研发周报计数纪律](../../研发报告/人员产出报告/references/weekly-report.md#计数纪律必须遵守) | 代码提交信号与行数 | busyming-skills-devops |
| 云效项目与工作项读取 | [阿里云渠道 · Projex 只读查询](../../../busyming-skills-common/api/mmhm/devops/阿里云渠道/references/appstack-api.md#yunxiaoprojexreadfacade) | 云效项目与工作项检索依赖，创建事实采集口径见 [业务规则 §4.1](references/business-rule.md#requirement-creates) | busyming-skills-common |
| Qoder 用量口径 | [Qoder 用量分析 §1](../Qoder用量分析/references/business-rule.md#1-公共筛选与日期约束) | Credits 日快照同步、补 0 与未取得 | busyming-skills-devops |
| 排期卡片 | [状态机](../功能排期管理/references/state-machine.md#1-状态枚举) · [操作流水](../功能排期管理/references/data.md#5-卡片操作流水) | 领取、完成、进行中与延期 | busyming-skills-devops |
| 外部效能平台 | 外部效能平台只读数据源 | 开发 / 产品 / 测试角色指标、人员角色与考勤数据的只读来源 | 外部系统 |
| 页面编排标准 | [web-dashboard.md](../../../busyming-skills-design/shared/page-standards/web-dashboard.md) | 分析看板页区域顺序 | busyming-skills-design |
| 原型样式入口 | [web.css](../../../busyming-skills-design/components/web/tokens/web.css) → [runtime.css](../../../busyming-skills-design/docs-site/web/runtime.css) → [templates.css](../../../busyming-skills-design/shared/prototype/web/templates.css) | 原型样式链与骨架类 | busyming-skills-design |

## 页面功能概览

单页看板（原型：[assets/web/member-activity.html](assets/web/member-activity.html)），公共筛选驱动全部区块：

| 区块 | 职责 | 规则 |
|------|------|------|
| 筛选卡 | 组织（中心起选）、日期范围、成员 | 详见 [references/business-rule.md §2–§3](references/business-rule.md#org-scope) |
| KPI 网格 | 统计人数、组织活跃率、人员等级分布、不活跃人天 | 详见 [references/business-rule.md §10](references/business-rule.md#kpi) |
| 活跃甘特 | 组织分组 × 日期的绿 / 黄 / 红活跃条，考勤背景，当日活跃人数 | 详见 [references/business-rule.md §4–§7](references/business-rule.md#signals) |
| 提交散点 | 人员提交次数与单次平均提交量分布，按部门等组织维度筛选与个人下钻 | 详见 [references/business-rule.md §7.1](references/business-rule.md#commit-scatter) |
| 角色指标 | 开发 / 产品 / 测试页签表格与展开指标卡 | 详见 [references/business-rule.md §8](references/business-rule.md#role-metrics) |
| 人员详情抽屉 | 个人活跃日历、Git 与产品云效需求提交活动、Qoder 用量、排期卡片、考勤与角色指标 | 详见 [references/business-rule.md §9](references/business-rule.md#schedule-qoder) |

页面区块与交互清单详见 [references/web-ui.md §人员活跃看板](references/web-ui.md#人员活跃看板)。

## 关联模块

| 模块 | 关系 |
|------|------|
| [Qoder用量分析](../Qoder用量分析/SKILL.md) | 复用 Credits 日快照；本模块只取活跃阈值判定与个人汇总，不替代用量分析 |
| [功能排期管理](../功能排期管理/SKILL.md) | 卡片领取、完成与延期事实来源；卡片编号跳转其卡片详情 |
| [项目管理](../项目管理/SKILL.md) | 身份与别名真源，不使用其报告人员范围 |
| [人员产出报告](../../研发报告/人员产出报告/SKILL.md) | 共用有效提交口径；报告为周期归档，本模块为实时看板 |

## Tips

- 规则唯一真源为 references/business-rule.md，页面与其余文档不复述；调整活跃阈值或等级门槛只改 [references/business-rule.md §4–§6](references/business-rule.md#signals)
- 角色指标与考勤口径以外部效能平台为准，本模块只读展示，不重算
