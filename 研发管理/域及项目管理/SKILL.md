---
name: 域及项目管理
description: 仓库域与一级目录项目的同步及责任归属真源。Use when 同步代码仓结构取得域项目列表、维护域及项目负责人和启停、查看人员项目上级、维护项目实现范围或供排期报告取统一仓目录边界。端型：Web + server。
metadata:
  domain: 产研
  subdomain: 研发管理
  clients: web,server
---

# 域及项目管理

## 模块概述

从已接入代码仓结构同步域与项目清单，维护责任归属及执行映射，为产研功能提供统一范围；不在消费方复制台账，不通过本功能创建或删除远端仓库目录。

## 端

Web：域项目列表、域详情、项目详情及页内配置。server：远端结构同步与范围判定。无 App 配置入口。

## When to Use

- 同步域项目清单并查看来源变化、缺失与异常。
- 维护域、项目负责人及业务启停。
- 核对项目上级与特殊域负责人资格。
- 为排期、报告与运维取得项目范围和实现映射。

## Prerequisites

| 资源 | 入口 | 用途与所属仓库 |
| --- | --- | --- |
| 业务规则 | 详见 [business-rule.md](references/business-rule.md#source) | 域项目来源、责任、执行映射与消费；本模块 |
| 数据定义 | 详见 [data.md](references/data.md#entities) | 域、项目、责任与实现关系；本模块 |
| 状态规则 | 详见 [state-machine.md](references/state-machine.md#states) | 来源、业务启停与同步状态；本模块 |
| 权限边界 | 详见 [permission-rules.md](references/permission-rules.md#boundaries) | 同步与配置职责、外部写入隔离；本模块 |
| 同步规则 | 详见 [other-rule-sync.md](references/other-rule-sync.md#sync) | 完整结构读取、逐仓结果与引用保护；本模块 |
| Web 页面 | 详见 [web-ui.md](references/web-ui.md#pages) | 列表与详情、导航、反馈和校验；本模块 |
| 产研人员 | [SKILL.md](../产研人员管理/SKILL.md) | 人员、业务角色、身份与参与关系；busyming-skills-devops |
| 云效渠道 | [代码托管契约](../../../busyming-skills-common/api/mmhm/devops/阿里云渠道/references/code-flow-api.md) | 已登记的代码仓及组织读取能力；busyming-skills-common |
| 公共权限 | [用户权限](../../../busyming-skills-common/api/mmhm/system/用户权限/SKILL.md) | 登录身份与功能权限；busyming-skills-common |
| 功能排期 | [SKILL.md](../功能排期管理/SKILL.md) | 卡片、commit、流转及归属消费；busyming-skills-devops |
| 报告配置 | [SKILL.md](../../研发报告/报告配置/SKILL.md) | 报告范围扩展与生成；busyming-skills-devops |
| 设计系统 | [主入口](../../../busyming-skills-design/SKILL.md) | 组件、公共样式及页面模板；busyming-skills-design |

## 页面功能概览

| 页面 | 原型入口 | 职责 |
| --- | --- | --- |
| 域项目列表 | [domains-projects.html](assets/web/domains-projects.html) | 同步清单、按域定位项目、查看来源和责任状态 |
| 域详情 | [domain-detail.html](assets/web/domain-detail.html) | 域责任配置、子项目与同步结果 |
| 项目详情 | [project-detail.html](assets/web/project-detail.html) | 项目责任配置、上级与实现范围 |

## Tips

- 域项目对象由同步取得；页面不提供手工新增、删除对象或仓目录操作。
- 域项目来源、启停及授权联动互相独立，不能把同步受理当成功。
- 公共读取能力边界见 [同步规则](references/other-rule-sync.md#dependency-gate)，未验证的远端目录读取不冒充已接入。
