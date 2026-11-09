---
name: 人员产出报告
description: 人员产出报告。Use when 需要按人员维度周期性产出研发报告（提交量、卡片完成、时效、延期）：研发周报按周复盘，研发日报前一自然日快照（仅 Web 端）；人员维度只统计「项目管理」自动报告名单快照内人员；触发方式（定时/手动）在 Web 端统一配置，触发后服务端生成会话挂载对应生成 skill 产出并直接落库归档，支持按周/按日索引查阅与版本回溯；也适用于缺失周期手动补传、历史版本切换查阅、管理层追踪个人交付。端型：Web 管理端 + App 查阅端（App 仅周报）。
---

# 人员产出报告

面向管理层的人员维度周期性产出报告：以 git 提交事实与功能排期卡片流转事实为数据源，按统计周期呈现「谁交付了什么、时效如何」，替代凭印象的绩效复盘。报告分两类：**研发周报**（周复盘，双端可查）与**研发日报**（前一自然日全天快照，仅 Web 端）。

## 服务对象与端

- **服务对象**：管理层、研发负责人（仅授权可见，不做全员公示）
- **Web 管理端**：触发配置、周报 / 日报索引（类型 Tab 切换）、在线阅读、版本回溯
- **App 查阅端**：按周期分组浏览与阅读（仅研发周报）

## When to Use

- 管理层 / 研发负责人在 Web 端按周索引查阅研发周报、按日索引查阅研发日报（前一自然日快照），或回溯某次报告的历史版本
- 某周 / 某日报告缺失时，在 Web 端「立即生成」触发服务端生成，或「手动补传」外部会话产出的报告文件
- 管理层在 App 端按周分组浏览、在线阅读研发周报

## Prerequisites

| 引用资源 | 路径 | 用途 |
|---------|------|------|
| 模块业务规则 | [`references/business-rule.md`](references/business-rule.md) | 报告口径与核心规则真源 |
| 子域共享规则 | [`../报告配置/references/business-rule.md`](../报告配置/references/business-rule.md) | 归档 / 触发 / 版本 / 渲染 / 权限口径真源（busyming-skills-devops） |
| 报告数据源与推送契约 | [`../报告配置/references/data-source-api.md`](../报告配置/references/data-source-api.md) | 功能排期卡片采集口径与旁路推送契约（busyming-skills-devops） |
| 周报生成 skill 入口 | [`references/dev-report.md`](references/dev-report.md) | 服务端生成会话挂载的研发周报生成逻辑唯一真源（本模块内置） |
| 日报生成 skill 入口 | [`references/daily-report.md`](references/daily-report.md) | 服务端生成会话挂载的研发日报生成逻辑唯一真源（本模块内置） |
| 周报章节规范 | [`references/weekly-report.md`](references/weekly-report.md) | 周报章节、模板与计数纪律（dev-report skill 资源） |
| 周报用量数据源 | [`references/api-endpoints.md`](references/api-endpoints.md) | Qoder 用量等 4 类用量数据字段口径（dev-report skill 资源） |
| Web 端页面描述 | [`references/web-ui.md`](references/web-ui.md) | 报告列表 / 报告详情的页面对象定义 |
| App 端页面描述 | [`references/mobile-ui.md`](references/mobile-ui.md) | App 列表 / 详情的页面对象定义 |

## 生成方式：触发配置 + 服务端生成

报告的生成**不在本模块内重建逻辑**，而是由服务端生成会话挂载本模块内置的生成 skill 完成（研发周报挂载 [`references/dev-report.md`](references/dev-report.md)，研发日报挂载 [`references/daily-report.md`](references/daily-report.md)，各为该类报告生成逻辑唯一真源，随本仓库版本化）：

1. 触发方式在 Web 端「报告触发配置」页维护（研发周报、研发日报各一条内置配置行：定时规则 + 手动「立即生成」）；触发后服务端创建生成任务并全程留痕
2. 服务端通过 **Qoder SDK** 创建生成会话，工作区挂载报告类型对应的生成 skill，统计窗口与生成配置由服务端注入会话入参
3. 会话按 skill 约定执行：读配置 → 同步代码仓 → 采集数据（git 提交权威计数 + 功能排期卡片等数据源）→ 按章节规范生成报告（「按人员」章节为核心）→ 写报告文件
4. 产出报告由服务端直接落库归档（渲染、版本递增、周 / 日索引），不经过推送；外部生成会话产出可经推送上报旁路入库（兜底见手动补传）
5. 统计窗口、计数纪律、数据源清单与推送契约均以 skill 内规范为准，本文件不复述

## 报告内容（口径）

详见 [`references/business-rule.md` §1 报告内容口径](references/business-rule.md#1-报告内容口径)。

## 统计人员范围

- 代码提交、功能排期卡片、Qoder 用量等人员维度只统计「项目管理」自动报告名单快照内人员；名单外人员不计入、不点名
- 名单为空时服务端拒绝生成人员产出报告；项目级数据（需求吞吐、仓库清单）保持全量
- 人员真源见 [`项目管理`](../../研发管理/项目管理/SKILL.md)，自动范围与快照见 [`#report-scope`](../../研发管理/项目管理/references/business-rule.md#report-scope)，身份与参与关系见 [`#identity`](../../研发管理/项目管理/references/business-rule.md#identity)、[`#membership`](../../研发管理/项目管理/references/business-rule.md#membership)；同人多角色去重，不混算职责，Qoder 无账号或源缺失标「未取得」
- 域/项目基础范围与执行映射见 [`项目管理`](../../研发管理/项目管理/SKILL.md)，汇总遵守 [`#consumption`](../../研发管理/项目管理/references/business-rule.md#consumption)，不叠加域和子项目重复提交或卡片；以上为已确认产品目标，不表示生产上线

## 核心规则

详见 [`references/business-rule.md` §2 核心规则](references/business-rule.md#2-核心规则)。

## 页面功能概览（仅列职责）

| 端 | 页面 | 职责 |
| -- | ---- | ---- |
| Web | 报告列表（本模块，见 [`references/web-ui.md`](references/web-ui.md)，原型见 `assets/`） | 类型 Tab（研发周报 / 研发日报）+ 按周（日）索引 + 明细筛选 + 入库进度；缺失周期立即生成 / 补传 |
| Web | 报告详情（本模块） | 元信息 + 渲染正文 + 大纲锚点导航 + 版本切换回溯 |
| Web | 报告触发配置（报告配置模块，见 [`../报告配置/references/web-ui.md`](../报告配置/references/web-ui.md)） | 研发周报 / 研发日报配置行的触发方式、定时规则与启停；立即生成；生成记录与失败重试 |
| App | 列表 / 详情（本模块，见 [`references/mobile-ui.md`](references/mobile-ui.md)） | 按周分组浏览、渲染阅读（仅研发周报） |

## 关联模块

| 模块 | 关系 |
| ---- | ---- |
| `研发管理/功能排期管理` | 卡片领取/完成/回退事实来源（经 skill 内数据源采集） |
| [`研发报告/报告配置`](../报告配置/SKILL.md) | 子域共享规则真源（归档 / 触发 / 版本 / 渲染 / 权限）；触发配置与配置页归属模块 |

## Tips

- 生成逻辑迭代只改 [`references/`](references/) 内的 dev-report / daily-report skill 文件，不改本 SKILL.md；页面与交互变更才动 `web-ui.md` / `mobile-ui.md`
- 报告指标口径以生成时写入报告内的口径说明为准，跨周期比较前先核对口径是否漂移；日报为前一自然日单日窗口，不与周报直接比较
- 缺失周期优先「立即生成」走服务端会话；仅外部会话产出无法回传时才用「手动补传」
