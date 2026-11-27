---
name: 员工资料
description: 员工资料（人事档案只读查询）。Use when 需要按姓名/工号、部门、岗位、在职状态与入职日期查询员工列表，查看单个员工的基本信息、任职记录、绩效、合同信息与附件资料（简历），或复核档案明细的字段口径与脱敏规则。端型：仅 Web 端。
metadata:
  domain: 人资
  clients: web
---

# 员工资料

## 模块概述

人资管理 → 员工档案下的员工人事档案查询入口：列表定位员工，明细集中呈现同一员工的基本信息、任职记录、绩效、合同信息与附件资料（简历）。本功能为**只读档案视图**，不承载员工新增、编辑、删除等档案维护，也不承载合同签订与绩效考核流程。

## 端

- **web**：人资管理 → 员工档案 → 员工资料（员工列表 + 员工明细），仅桌面端管理后台，不提供 App 入口

## When to Use

- 查询员工列表并按部门、岗位、在职状态、入职日期缩小范围
- 查看某员工的档案明细，在五类信息页签间切换核对
- 在线预览员工简历等附件资料
- 复核员工档案字段口径、敏感信息脱敏与页面权限编码

## Prerequisites

| 引用资源 | 路径 | 用途 | 所属仓库 |
|---------|------|------|---------|
| 业务规则 | [文档/业务规则.md](文档/业务规则.md) | 功能边界、查询与展示规则、页签与附件规则、脱敏与权限编码 | 本模块 |
| 数据模型 | [文档/数据模型.md](文档/数据模型.md) | 员工、任职记录、绩效记录、合同、附件的字段口径与实体关系 | 本模块 |
| 页面元素 | [文档/页面元素.md](文档/页面元素.md) | 员工列表与员工明细的区块元素、导航关系、操作反馈 | 本模块 |
| 合同管理 | [合同管理 SKILL.md](../../HR管理/合同管理/SKILL.md) | 合同页签的合同记录与状态来源 | 本仓库 |
| 功能权限 | [permission-api.md](../../../../busyming-skills-common/api/mmhm/system/用户权限/references/permission-api.md) | 菜单与按钮按权限编码校验，未授权不展示入口 | busyming-skills-common |
| 页面编排标准 | [web-operation-list.md](../../../../busyming-skills-design/shared/page-standards/web-operation-list.md) | 员工列表的区域编排 | busyming-skills-design |
| 页面编排标准 | [web-detail.md](../../../../busyming-skills-design/shared/page-standards/web-detail.md) | 员工明细（档案型）的区域编排 | busyming-skills-design |
| 原型公共资产 | [templates.css](../../../../busyming-skills-design/shared/prototype/web/templates.css) · [native.js](../../../../busyming-skills-design/shared/prototype/web/native.js) | 原型页面骨架样式与组件原生交互适配 | busyming-skills-design |

## 页面功能概览

| 页面 | 原型 | 功能 |
|------|------|------|
| 员工列表 | [原型图/web/employee-list.html](原型图/web/employee-list.html) | 筛选（关键字 / 部门 / 岗位 / 在职状态 / 入职日期区间）+ 员工表格 + 分页 + 查看明细入口；详见 [文档/页面元素.md §员工列表](文档/页面元素.md#员工列表) |
| 员工明细 | [原型图/web/employee-list.html#detail](原型图/web/employee-list.html#detail) | 员工概览 + 基本信息 / 任职记录 / 绩效 / 合同信息 / 附件资料五个页签 + 附件在线预览；详见 [文档/页面元素.md §员工明细](文档/页面元素.md#员工明细) |

## Tips

- 规则查找：功能边界、查询展示与脱敏规则看 文档/业务规则.md，字段口径看 文档/数据模型.md，不在本文件补写
- 页面类型：列表为操作列表页，明细为档案型详情页；无写操作，故无编辑态与沉底操作栏
- 原型为静态 Mock，列表与明细在同一 HTML 内以 `#list` / `#detail/{工号}` 双视图互联；明细可切换页签与附件预览
