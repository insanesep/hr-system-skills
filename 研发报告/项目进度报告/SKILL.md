---
name: 项目进度报告
description: 项目进度报告。Use when 需要每个周期仅生成一份进度总报告，在报告内按项目组查阅功能排期、代码提交、团队人员、Qoder 使用与核心进展，或补齐缺失报告并回溯历史版本。端型：Web 管理端。
metadata:
  domain: 产研
  sub_domain: 研发报告
  platforms:
    - web
---

# 项目进度报告

面向管理层、PM 与项目负责人的周期性进度总报告：每个自然周或自然月仅生成一份，在全量汇总后按项目组展示功能排期、代码提交、团队人员、Qoder 使用与项目核心进展，不按组拆分报告。

## 服务对象与端

- **服务对象**：管理层、PM、项目负责人
- **Web 管理端**：报告索引、在线阅读、手动补传、立即生成与版本回溯

## When to Use

- 在一份周 / 月总报告中按项目组查阅功能排期、代码提交、团队人员、Qoder 使用或项目核心进展
- 对缺失报告发起立即生成或手动补传
- 查看同报告项的历史归档版本或获取当前版本原始 Markdown

## When Not to Use

- 维护报告范围、触发规则或生成记录 → 使用报告配置
- 维护域 / 项目、排期卡片或发布事实 → 回到对应业务真源模块

## Prerequisites

| 资料 | 用途 | 所属仓库 |
| ---- | ---- | ---- |
| [业务规则](references/business-rule.md) | 单份周期报告、组内分组、汇总去重与归档约束 | busyming-skills-devops |
| [生成逻辑](references/progress-report.md) | 单次生成会话的采集、章节与输出规则 | busyming-skills-devops |
| [Web UI](references/web-ui.md) | 报告列表、详情、补传与版本切换 | busyming-skills-devops |
| [报告配置 · 业务规则](../报告配置/references/business-rule.md) | 范围扩展、触发、归档、版本、渲染与权限 | busyming-skills-devops |
| [报告配置 · 数据定义](../报告配置/references/data.md) | 报告、版本与生成任务的数据语义 | busyming-skills-devops |
| [功能排期管理](../../研发管理/功能排期管理/SKILL.md) | 排期卡片、非需求改动、完成与延期事实来源 | busyming-skills-devops |
| [Qoder 用量分析](../../研发管理/Qoder用量分析/references/business-rule.md) | Credits、请求次数、活跃成员与人均指标口径 | busyming-skills-devops |
| [人员产出报告 · 研发周报](../人员产出报告/references/weekly-report.md) | 项目核心进展内容来源 | busyming-skills-devops |

## 页面功能概览

| 端 | 页面 | 职责 |
| -- | ---- | ---- |
| Web | [报告列表](assets/web/report-list.html) / [报告详情](assets/web/report-detail.html) | 每周期一份的索引、缺失补齐、原件获取、PNG 导出、按组正文、大纲与版本回溯 |
| Web | [报告范围配置 / 报告触发配置](../报告配置/references/web-ui.md) | 范围扩展、触发规则、立即生成、生成记录与失败重试 |

## 关联模块

| 模块 | 关系 |
| ---- | ---- |
| [报告配置](../报告配置/SKILL.md) | 研发报告子域共享规则、报告范围与配置入口 |
| [人员产出报告](../人员产出报告/SKILL.md) / [文档一致性报告](../文档一致性报告/SKILL.md) | 同家族报告，复用报告配置共享机制 |

## Tips

- 每个周期只生成一份 `_all` 报告，项目组只作正文分组，不提供单组生成或单组归档。
- 页面只呈现归档产物，指标问题回到生成侧与事实来源核查，不在详情页重算。
- 全量汇总必须先按稳定标识去重，不把域与子项目数据直接相加。
