---
name: qoder-usage
description: Use when 需要查询研发团队 Qoder Credits 用量总额与周环比、按成员或模型等级分析消耗结构、查看日消耗趋势对比上周同期、或查看日期×成员 / 成员×模型等级透视表做成本复盘。通过 Qoder Teams OpenAPI 按组织→成员维度聚合 Credits 用量，Web+App 双端只读仪表盘。
metadata:
  domain: 研发
  clients: web,app
---

# Qoder 用量查询（qoder-usage）

> App 功能图标：[qoder-usage.html](../../../../设计/app/icons/resources/qoder-usage.html)（App 工作台「Qoder 用量查询」入口图标真源，120×120 统一版式动效 HTML，自包含）


## 模块概述

消费 Qoder Teams OpenAPI，按组织 → 成员维度展示团队 Credits 用量：KPI 汇总、日消耗堆叠柱形图（按模型分类：Ultimate / Kimi K3 / GLM 5.3 / DeepSeek V4 Pro / Qwen3.8 Max / 其他）、日期×成员透视表、成员×模型等级透视表。纯只读分析页，无单据与写操作。

## 端

| 端 | 场景 | 目标用户 |
|---|---|---|
| Web | 管理后台用量分析仪表盘 | 团队管理者、研发主管 |
| App | 移动端用量快速概览 | 团队管理者（外出/移动办公） |

## When to Use

- 需要查看团队 / 成员 Credits 消耗总额、请求数与周环比
- 需要对比各成员在不同模型等级（Auto / Ultimate / Performance 等）上的消耗结构
- 需要按日期或成员维度的用量透视表做成本复盘
- 需要在移动端快速概览近期用量趋势

## Prerequisites

| 依赖 | 路径 | 用途 |
|------|------|------|
| Qoder Teams OpenAPI | [../../../依赖文档/API/qoder-api.md](../../../依赖文档/API/qoder-api.md) | 第三方接口清单、分页游标与错误码真源 |
| 前端页面规范 | [../../../依赖文档/研发规范/前端/前端页面规范/SKILL.md](../../../依赖文档/研发规范/前端/前端页面规范/SKILL.md) | 双端页面与原型硬约束 |

## 页面功能概览

双端各一个仪表盘页（Web：`assets/web/qoder-usage-analysis.html`；App：`assets/app/qoder-usage-analysis.html`），由公共筛选区驱动全部视图：

- 公共筛选：Web 为日期范围 + 成员多选 + 查询/重置；App 为日期预设 + 成员多选 + 查询/重置（筛选元素与 Web 对齐）
- KPI 卡片：总用量 / 总请求数 / 次均消耗 / 人均用量 / 活跃成员（含周环比）
- 日 Credits 消耗堆叠柱形图：按模型分类（Ultimate / Kimi K3 / GLM 5.3 / DeepSeek V4 Pro / Qwen3.8 Max / 其他）分段堆叠
- Credits 用量透视表：日期 × 成员
- 模型用量透视表：成员 × 模型等级

App 端页面元素与 Web 保持一致，仅做移动端布局适配（KPI 2 列网格、透视表横向滚动 + 首列冻结）。

聚合口径、排序、精度与空值规则详见 [references/business-rule.md §2-§5](references/business-rule.md#2-kpi-计算口径)；页面区块与交互清单详见 [references/web-ui.md §Qoder 用量分析](references/web-ui.md#qoder-用量分析) 与 [references/mobile-ui.md §Qoder 用量分析](references/mobile-ui.md#qoder-用量分析)。

## Tips

- 口径与规则唯一真源为 references/business-rule.md，页面与其余文档不复述
- 原型生成与验收走 requirement-add 流程，页面硬约束以 page-blueprint 为准
- 上游接口清单与分页/错误约定见 Prerequisites 中 qoder-api.md，模块内不复制

## 变更记录

| 日期 | 变更 | 说明 |
|------|------|------|
| 2026-09-07 | 日消耗图改按模型堆叠 + App 元素对齐 | 日 Credits 消耗趋势由「本期 vs 上周同期」分组柱形改为按模型分类（Ultimate / Kimi K3 / GLM 5.3 / DeepSeek V4 Pro / Qwen3.8 Max / 其他）堆叠柱形图；App 筛选补齐成员多选与查询/重置、KPI 补齐活跃成员（5 卡）、新增日期×成员透视表、移除成员用量排行，页面元素与 Web 一致 |
| 2026-09-15 | 堆叠柱配色浅色化 | 6 桶配色由 -6 深色阶下调为 -4 浅色阶（柱体大面积填充更柔和），双端实现与原型同步；映射表见 business-rule.md §6 |
