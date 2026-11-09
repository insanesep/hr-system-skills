---
name: 功能使用情况分析
description: 研发管理下的功能使用情况分析分组索引。Use when 需要定位事务流水明细、使用情况报表、功能目录管理的菜单入口，查询三个功能共用的事件采集、统计打标、功能注册、接入系统与权限规则，或为其他业务系统接入埋点。端型：仅 Web 端管理界面，采集覆盖 Web + App。
---

# 功能使用情况分析

## 分组定位

面向「鸣鸣很忙管理中心」的功能分析模块，量化衡量每个功能被使用的程度，支撑产品侧对功能价值的判断、运营侧对用户行为的洞察、以及管理侧对角色权限包的复核。

管理界面**仅 Web 端**，归属 Portal「研发管理 → 功能使用情况分析」。数据采集覆盖 DevHub 自身与其他接入系统的 Web + App 业务页面：各系统凭 AppKey 经统一埋点 SDK 上报，流水查询与统计报表按接入系统在此分组呈现。

## 功能菜单

| 菜单功能 | 入口 | 路由 | 菜单权限 | 职责 |
|------|------|------|------|------|
| 事务流水明细 | [SKILL.md](事务流水明细/SKILL.md) | `/portal/usage-events` | `MENU:RND:MANAGE:USAGE_EVENTS` | 原始事件流水查询、抽屉详情、CSV 导出 |
| 使用情况报表 | [SKILL.md](使用情况报表/SKILL.md) | `/portal/usage-report` | `MENU:RND:MANAGE:USAGE_REPORT` | KPI、趋势、TOP10、角色偏好、路由聚合下钻 |
| 功能目录管理 | [SKILL.md](功能目录管理/SKILL.md) | `/portal/usage-catalog` | `MENU:RND:MANAGE:USAGE_CATALOG` | 自动注册表查询、元数据编辑与启停；接入系统登记与 AppKey 管理 |

## 共享资料与跨业务规则

- [业务规则真源](references/business-rule.md)：产品背景、实体职责、埋点协议与采集信息、统计打标、功能目录自动注册、SDK 接入与运维、权限及接入系统隔离；三个菜单功能只引用，不重复维护。
- [埋点接入 skill](../../../busyming-devhub-web/sdk/usage-tracker/SKILL.md)：交给其他业务系统的接入指引（Web / 微应用 / App、上报协议、编码规范与排查），随 SDK 源码维护在代码仓。
- [共享布局与页面索引](references/page-structure.md)：通用页面约束与各叶子 Web UI、原型的导航。
- [登记一致性](references/business-rule.md#数据模型)与[功能编码命名](references/business-rule.md#14-功能编码命名规范)：跨业务菜单、路由与埋点登记的共用约束；[功能排期管理](../../研发管理/功能排期管理/SKILL.md)的埋点登记同样引用本真源。
- [身份信息信任边界](references/business-rule.md#13-信息来源与信任边界)与[权限及接入系统隔离](references/business-rule.md#7-权限与可见性)：用户、角色与权限体系协作的共用规则。
- [项目管理 · 身份](../项目管理/references/business-rule.md#identity)及[权限边界](../项目管理/references/permission-rules.md#boundaries)：仅产研身份对照，不能替代门户 RBAC 或裁剪全部业务用户行为。
- [项目管理 · 清单](../项目管理/references/business-rule.md#source)及[执行映射](../项目管理/references/business-rule.md#execution-mapping)：仅已确认基础归属引用，不将功能目录、菜单业务分类或路由前缀直接当作仓域 / 项目。
