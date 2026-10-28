---
name: 需求外链管理
description: 有点推荐需求的定向外链生成、一次展示复制、台账溯源与撤销，以及外部免登录 H5 提交和结果形态。Use when 调整外链邀约、公开提交字段、链接校验、防刷、H5 附件、单向收口或 Web / 公开 H5 原型。端型：Web + 公开 H5 + server。
metadata:
  domain: 研发
  clients: web,app,server
---

# 需求外链管理

## 职责与边界

承载内部邀约人的外链发放与台账，以及外部人员凭专属链接免登录提交有点推荐需求。链接生成结果一次展示供复制，关闭后不提供台账重复获取；公开提交的字段、防刷、附件与单向收口均引用本功能外链规则与共享专题，不编造新的业务口径。

公开提交产生的需求进入 [需求工单管理](../需求工单管理/SKILL.md) 查阅与审批，审批链由 [需求审批配置](../需求审批配置/SKILL.md) 维护。外链统计、台账筛选与分页、H5 校验和图片能力的完整目标不因代码缺口删减。

## 菜单与关联页面

- 实际菜单路径：需求管理 / 需求外链管理；应用路由 `/requirement/public-link`，route.name 与菜单资源码均为 `devhubRequirementPublicLink`。`/subapp/devhub` 为部署 base，不是路由名称。
- 生成外链表单、生成结果态与复制、撤销原因弹窗均属于外链管理页，不新增菜单或详情目录；standalone「需求管理」分组为平级侧栏，产品目标面包屑与地址同步见 Web UI。
- 公开 H5 的需求提交、提交成功、链接失效三种页面形态共用同一 token 链接，预览确认弹层归 H5 提交页；它们不是三个独立应用路由，不套用内部提交的 `devhubRequirementSubmit`。
- App 员工端无外链台账入口；H5 无侧栏、面包屑与登录态，不与内部提交共用入口。内部单详情中的外链溯源跳转按共享跨页导航要求处理。

## 资料与资产

- 先读 [共享业务规则](../references/business-rule.md)、[权限规则](../references/permission-rules.md)、[外部单状态差异](../references/state-machine.md#6-外部提交单差异) 与 [外链数据](../references/data.md#6-外链邀约)。
- 本功能规则真源：[外链邀约与外部提交](references/other-rule-public-link.md)；附件见 [H5 附件规则](../references/other-rule-attachment.md#5-h5-附件规则)。
- 页面正文：[Web 外链管理页](references/web-ui.md#外链管理页)；[公开 H5 完整正文](references/app-ui.md#公开-h5)。共享约定见 [Web UI](../references/web-ui.md)、[App UI](../references/app-ui.md)。
- Web 资产目录 [assets/web/](assets/web/)，原型 [外链管理](assets/web/requirement-public-link.html)；公开 H5 资产目录 [assets/app/](assets/app/)，原型 [需求提交](assets/app/requirement-public-submit.html)、[成功与失效结果](assets/app/requirement-public-result.html)。
- 只读实现真源：[路由](../../../busyming-devhub-web/src/router/index.ts)、[外链管理页面](../../../busyming-devhub-web/src/views/requirement/PublicLinkView.vue)；公共能力与采购邀约范式见 [分组入口](../SKILL.md#prerequisites)。
