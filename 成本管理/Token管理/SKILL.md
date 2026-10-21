---
name: Token管理
description: Use when 需要查询研发团队 Qoder Credits 用量总额与周环比、按成员或模型等级分析消耗结构、查看日消耗趋势对比上周同期、或查看日期×成员 / 成员×模型等级透视表做成本复盘。数据来源为 Qoder Teams OpenAPI，按组织→成员维度聚合 Credits 用量；统计范围默认研发团队人员名单（报告配置维护），可切换组织全部成员；Web+App 双端只读仪表盘。
metadata:
  domain: 研发
  clients: web,app
---

# Token管理

## 模块概述

数据来源为 Qoder Teams OpenAPI，按组织 → 成员维度展示 Credits 用量：KPI 汇总、日消耗堆叠柱形图（按接口返回的模型分类分段堆叠，未识别的归入其他）、日期×成员透视表、成员×模型等级透视表。统计范围默认研发团队人员名单（与研发周报/日报共用，见报告配置），可切换组织全部成员。纯只读分析页，无单据与写操作。

## 端

| 端 | 场景 | 目标用户 |
|---|---|---|
| Web | 管理后台用量分析仪表盘 | 团队管理者、研发主管 |
| App | 移动端用量快速概览 | 团队管理者（外出/移动办公） |

## When to Use

- 需要查看团队 / 成员 Credits 消耗总额、请求数与周环比
- 需要对比各成员在不同模型等级上的消耗结构
- 需要按日期或成员维度的用量透视表做成本复盘
- 需要在移动端快速概览近期用量趋势

## Prerequisites

| 引用资源 | 路径 | 用途 | 所属仓库 |
|---------|------|------|---------|
| 业务规则 | [references/business-rule.md](references/business-rule.md) | 筛选与日期约束、KPI 口径、透视表规则、堆叠图规则、三态 | 本模块 |
| Web 页面 | [references/web-ui.md](references/web-ui.md) | Web 端页面元信息、导航、操作反馈、三态 | 本模块 |
| App 页面 | [references/app-ui.md](references/app-ui.md) | App 端页面元信息、导航、操作反馈、三态 | 本模块 |
| 页面模板 | [web/templates](../../../busyming-skills-design/web/templates/) · [mobile/templates](../../../busyming-skills-design/mobile/templates/) | 页面类型取值与整页范例 | busyming-skills-design |
| 原型样式入口 | [web](../../../busyming-skills-design/web/styles/design-system.css) · [mobile](../../../busyming-skills-design/mobile/styles/design-system.css) 的 design-system.css | 原型唯一样式入口与组件类 | busyming-skills-design |
| Qoder Teams OpenAPI | 公共仓未迁入真源（busyming-skills-common 的 api 目录仅有占位） | 用量数据来源与时间范围硬约束 | busyming-skills-common |
| 统计人员范围 | 报告配置 → 统计人员范围（研发报告子域） | 研发团队名单，Token 管理默认按此范围统计 | busyming-skills-devops |

## 页面功能概览

双端各一个仪表盘页（Web：`assets/web/qoder-usage-analysis.html`；App：`assets/app/qoder-usage-analysis.html`），由公共筛选区驱动全部视图：

- 公共筛选：Web 为日期范围 + 统计范围（研发团队 / 全部成员）+ 成员多选 + 查询/重置；App 为日期预设 + 统计范围 + 成员多选 + 查询/重置（筛选元素与 Web 对齐）
- 统计范围默认「研发团队」，成员清单与用量事件均按该名单过滤；切换「全部成员」查看组织全量
- KPI 卡片：总用量 / 总请求数 / 次均消耗 / 人均用量 / 活跃成员（含周环比）
- 日 Credits 消耗堆叠柱形图：按接口返回的模型分类分段堆叠，未识别的归入其他
- Credits 用量透视表：日期 × 成员
- 模型用量透视表：成员 × 模型等级

App 端页面元素与 Web 保持一致，仅做移动端布局适配（KPI 2 列网格、透视表横向滚动 + 首列冻结）。

聚合口径、排序、精度与空值规则详见 [references/business-rule.md §2-§5](references/business-rule.md#2-kpi-计算口径)；页面区块与交互清单详见 [references/web-ui.md §Qoder 用量分析](references/web-ui.md#qoder-用量分析) 与 [references/app-ui.md §Qoder 用量分析](references/app-ui.md#qoder-用量分析)。

## Tips

- 口径与规则唯一真源为 references/business-rule.md，页面与其余文档不复述
- 上游数据来源（Qoder Teams OpenAPI）真源未迁入公共仓，模块内仅保留一句话指针，不复制接口细节
