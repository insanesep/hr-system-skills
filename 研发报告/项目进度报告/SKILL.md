---
name: 项目进度报告
description: 项目进度报告。Use when 需要每个周期仅生成一份进度总报告，在报告内按域查阅项目核心进展、团队人员、功能排期、代码提交与 Qoder 使用，按仓库查阅 harness 文档健康度，点击查看个人本周周报，或补齐缺失报告并回溯历史版本。端型：Web 管理端。
metadata:
  domain: 产研
  sub_domain: 研发报告
  platforms:
    - web
---

# 项目进度报告

面向管理层、PM 与项目负责人的周期性进度总报告：每个自然周或自然月仅生成一份，在全量汇总后按域展示项目核心进展、团队人员、功能排期、代码提交与 Qoder 使用，按仓库展示 harness 文档健康度，并支持点击人员姓名查看本周个人研发周报，不按组拆分报告。

## 服务对象与端

- **服务对象**：管理层、PM、项目负责人
- **Web 管理端**：报告索引、在线阅读、手动补传、立即生成与版本回溯

## When to Use

- 在一份周 / 月总报告中按域查阅项目核心进展、团队人员、功能排期、代码提交或 Qoder 使用，按仓库查阅 harness 文档健康度
- 点击团队人员明细中的姓名，查看该人员本周研发周报内容
- 对缺失报告发起立即生成或手动补传
- 查看同报告项的历史归档版本或获取当前版本原始 Markdown

## When Not to Use

- 维护报告范围、触发规则或生成记录 → 使用报告配置
- 维护域 / 项目、排期卡片或发布事实 → 回到对应业务真源模块

## Prerequisites

| 资料 | 用途 | 所属仓库 |
| ---- | ---- | ---- |
| [业务规则](references/business-rule.md) | 单份周期报告、组内分组、汇总去重、较上期对比快照与归档约束 | busyming-skills-devops |
| [生成逻辑](references/progress-report.md) | 单次生成会话的采集、章节、较上期对比与输出规则 | busyming-skills-devops |
| [Web UI](references/web-ui.md) | 报告列表、详情、较上期展示、补传与版本切换 | busyming-skills-devops |
| [报告配置 · 业务规则](../报告配置/references/business-rule.md) | 范围扩展、触发、归档、版本、渲染与权限 | busyming-skills-devops |
| [报告配置 · 数据定义](../报告配置/references/data.md) | 报告、版本与生成任务的数据语义 | busyming-skills-devops |
| [项目管理 · 项目配置与来源](../../研发管理/项目管理/references/business-rule.md#source) | 域名称、稳定项目标识与启用项目范围真源 | busyming-skills-devops |
| [功能排期管理](../../研发管理/功能排期管理/SKILL.md) | 排期卡片、非需求改动、完成与延期事实来源 | busyming-skills-devops |
| [Qoder 用量分析](../../研发管理/Qoder用量分析/references/business-rule.md) | Credits、请求次数、活跃成员、人均指标与次均消耗口径 | busyming-skills-devops |
| [人员产出报告 · 研发周报](../人员产出报告/references/weekly-report.md) | 项目核心进展与点击姓名后的个人周报内容来源 | busyming-skills-devops |
| [产品文档健康度报告](../产品文档健康度报告/references/health-report.md) | 仓库健康度两周评分、较上期与查看报告链接来源 | busyming-skills-devops |

## 页面功能概览

| 端 | 页面 | 职责 |
| -- | ---- | ---- |
| Web | [报告列表](assets/web/report-list.html) / [报告详情](assets/web/report-detail.html) | 每周期一份的索引、缺失补齐、原件获取、分页 PNG 打包 ZIP 与独立 HTML 导出、本期概览、按组正文与版本回溯 |
| Web | [报告范围配置 / 报告触发配置](../报告配置/references/web-ui.md) | 范围扩展、触发规则、立即生成、生成记录与失败重试 |

## 关联模块

| 模块 | 关系 |
| ---- | ---- |
| [报告配置](../报告配置/SKILL.md) | 研发报告子域共享规则、报告范围与配置入口 |
| [人员产出报告](../人员产出报告/SKILL.md) / [文档一致性报告](../文档一致性报告/SKILL.md) | 同家族报告，复用报告配置共享机制 |

## Tips

- 每个周期只生成一份 `_all` 报告，域只作正文分组，不提供单组生成或单组归档。
- 页面只呈现归档产物，指标问题回到生成侧与事实来源核查，不在详情页重算；「本期概览」固定四卡，与六章共享同版本 `_all` 结果，各角色独立去重，禁止跨角色求和；「较上期」只读各版本自身归档的上一自然周 / 月对比快照，不以历史版本 v-1 代替。
- 全量汇总必须先按稳定标识去重，不把域与子项目数据直接相加。
- 数值千分位、健康度涨跌、概览较上期计算与格式、核心进展列表、角色连续列序、原件五列概览表与归档双层表头以 [生成逻辑 · 呈现与归档规则](references/progress-report.md#呈现与归档规则) 为单源；六章固定，详情不设大纲。
- 公共元信息网格、四个公共 KPI 卡、页头操作、固定 1600×2000 分页 PNG / ZIP 与独立 HTML 导出及防混版交互以 [Web UI · 报告详情](references/web-ui.md#report-detail) 为准；公共渲染差异引用 [报告配置 · §6](../报告配置/references/business-rule.md#6-markdown-渲染规则)。
