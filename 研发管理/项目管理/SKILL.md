---
name: 项目管理
description: 研发项目、Git 仓库及项目成员的统一配置入口。Use when 维护项目启停和 harness/代码服务仓映射、配置通用 Git 仓库与连接测试、在项目内维护成员及跨项目参与关系，或为排期和研发报告取得同源项目与人员范围。端型：Web + server + MCP。
metadata:
  domain: 产研
  subdomain: 研发管理
  clients: web,server,mcp
---

# 项目管理

## 模块概述

「研发管理 → 项目管理」统一承载项目配置、通用 Git 仓库配置与项目内成员管理。项目是人工配置的业务归集对象，关联 harness 工程与代码服务仓；成员必须在具体项目内新增或关联，同一人员可参与多个项目。本功能不创建门户账号、远端代码仓或组织任职，不维护排期卡片与报告触发配置。

## 端

Web：项目列表、项目编辑与成员管理、Git 仓库配置及环境信息。server：配置校验、引用保护、有效成员范围与快照。MCP：项目配置能力遵守同一规则与独立权限边界；无 App 配置入口。

## When to Use

- 新建或编辑项目，启停项目与维护仓库映射。
- 维护通用 Git 仓库，测试连接并处理引用保护。
- 在项目内维护成员，关联同一人员到多个项目。
- 为报告、排期与 Qoder 统计获取稳定项目引用和去重人员范围。

## Prerequisites

| 资源 | 入口 | 用途与所属仓库 |
| --- | --- | --- |
| 业务规则 | [references/business-rule.md](references/business-rule.md) | 项目、仓库、人员身份、成员关系及消费口径；本模块 |
| 数据定义 | [references/data.md](references/data.md#entities) | 项目、仓库、成员及关系实体；本模块 |
| 权限规则 | [references/permission-rules.md](references/permission-rules.md#boundaries) | 独立配置职责、敏感数据与外部授权边界；本模块 |
| Web 页面 | [references/web-ui.md](references/web-ui.md#pages) | 导航、表单、操作反馈与空态；本模块 |
| 公共身份与权限 | [用户权限](../../../busyming-skills-common/api/mmhm/system/用户权限/SKILL.md) | 门户登录、选人和菜单按钮授权；busyming-skills-common |
| 云效代码仓 | [代码托管契约](../../../busyming-skills-common/api/mmhm/devops/阿里云渠道/references/code-flow-api.md) | 云效仓库候选与来源信息；busyming-skills-common |
| Git 访问 | [DevhubGitClient.java](../../../busyming-devhub/busyming-devhub-api/src/main/java/io/busyming/basic/devhub/api/facade/DevhubGitClient.java) | 通用 Git 分支与提交查询的实现真源；busyming-devhub |
| 功能排期管理 | [SKILL.md](../功能排期管理/SKILL.md) | 消费项目归属与仓库范围；busyming-skills-devops |
| 报告配置 | [SKILL.md](../../研发报告/报告配置/SKILL.md) | 报告范围扩展、触发和生成快照；busyming-skills-devops |
| Qoder 用量分析 | [SKILL.md](../Qoder用量分析/SKILL.md) | 消费有效人员范围，不另建名单；busyming-skills-devops |
| 设计系统 | [Web 组件](../../../busyming-skills-design/components/web/SKILL.md)、[配置列表编排](../../../busyming-skills-design/shared/page-standards/web-operation-list.md) | 页面组件、布局与交互；busyming-skills-design |

## 页面功能概览

| 页面或区域 | 入口 | 职责 |
| --- | --- | --- |
| 项目列表 | [原型](assets/web/project-management.html)、[Web 页面](references/web-ui.md#pages) | 项目查询、新建、编辑、启停；进入成员管理和环境信息 |
| 成员管理 | [项目成员](references/web-ui.md#members) | 在选定项目内新增或关联成员、维护关系状态、查看跨项目参与 |
| Git 仓库配置 | [仓库配置](references/web-ui.md#repositories) | 通用 Git 配置、连接测试、启停与引用保护 |
| 环境信息 | [环境信息](references/web-ui.md#environment) | 当前部署环境的项目公共上下文，不存个人账号和密码 |

## Tips

- 人员基础字段共用，项目成员关系独立；跨项目操作影响见 [成员规则](references/business-rule.md#membership)。
- 报告配置与功能排期仅消费本功能，不提供重复配置入口；归集与去重见 [消费规则](references/business-rule.md#consumption)。
- 成员参与和角色不授予门户、代码仓、MCP、数据库或发布权限，见 [权限边界](references/permission-rules.md#boundaries)。
