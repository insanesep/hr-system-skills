---
name: 产研人员管理
description: 产研人员及其参与关系的唯一维护入口。Use when 新增或调整产研人员角色与启禁、维护人员参与域项目及跨系统身份、核对产品代码仓授权关闭结果、查看项目责任上下级或取得报告人员范围。端型：Web + server。
metadata:
  domain: 产研
  subdomain: 研发管理
  clients: web,server
---

# 产研人员管理

## 模块概述

维护产研人员业务档案、参与关系与身份归属，为排期、报告、需求与运维提供统一人员入口；不另建门户账号、组织或域项目负责人台账。

## 端

Web：人员列表、人员表单与独立详情页。server：业务状态判定、授权联动与报告人员范围。无 App 配置入口。

## When to Use

- 维护人员及业务角色、启禁、逻辑删除和交接。
- 维护域项目参与关系或核对跨系统身份冲突。
- 查看上下级、仓权限目标与实际关闭证据。
- 为报告与其他产研功能提供同一有效人员范围。

## Prerequisites

| 资源 | 入口 | 用途与所属仓库 |
| --- | --- | --- |
| 业务规则 | 详见 [business-rule.md](references/business-rule.md#identity) | 人员身份、参与关系、交接与报告范围；本模块 |
| 数据定义 | 详见 [data.md](references/data.md#entities) | 人员、参与关系与联动记录；本模块 |
| 状态规则 | 详见 [state-machine.md](references/state-machine.md#states) | 人员及授权联动状态；本模块 |
| 权限边界 | 详见 [permission-rules.md](references/permission-rules.md#boundaries) | 维护职责、业务准入与权限隔离；本模块 |
| 仓授权规则 | 详见 [other-rule-authorization.md](references/other-rule-authorization.md#policy) | 授权目标、全部关闭与公共依赖门禁；本模块 |
| Web 页面 | 详见 [web-ui.md](references/web-ui.md#pages) | 页面对象、导航、反馈与校验；本模块 |
| 域及项目 | [SKILL.md](../域及项目管理/SKILL.md) | 同步域项目与负责人关系；busyming-skills-devops |
| 公共身份 | [用户与组织](../../../busyming-skills-common/api/mmhm/system/用户权限/references/user-org-api.md) | 选人、门户状态及身份映射；busyming-skills-common |
| 云效渠道 | [代码托管契约](../../../busyming-skills-common/api/mmhm/devops/阿里云渠道/references/code-flow-api.md) | 已登记的组织及仓查询；成员写入能力缺口以仓授权规则为准；busyming-skills-common |
| 报告配置 | [SKILL.md](../../研发报告/报告配置/SKILL.md) | 报告生成、归档与查看权限；busyming-skills-devops |
| 设计系统 | [主入口](../../../busyming-skills-design/SKILL.md) | 组件、公共样式及页面模板；busyming-skills-design |

## 页面功能概览

| 页面 | 原型入口 | 职责 |
| --- | --- | --- |
| 人员列表 | [member-list.html](assets/web/member-list.html) | 检索人员、查看归属与联动结果；新增搜索集团人员并唯一选择后进入资料编辑 |
| 人员表单 | [member-form.html](assets/web/member-form.html) | 所选集团身份只读；维护角色、外部身份与参与关系，已有档案按人员标识编辑 |
| 人员详情 | [member-detail.html](assets/web/member-detail.html) | 参与项目及对应上级、仓权限、报告纳入与三维身份映射；不设重复上下级或变更记录页签 |

## Tips

- 负责人只在域及项目管理维护，本功能展示其派生关系。
- 列表级联条件与人员命中口径见[业务规则](references/business-rule.md#list-filter)，交互见[Web页面](references/web-ui.md#2-人员列表)。
- 状态与权限成功证据分开；公共依赖门禁见 [仓授权规则](references/other-rule-authorization.md#dependency-gate)。
- 页面地址与职责是产品约定，不证明菜单、服务或自动授权已上线。
