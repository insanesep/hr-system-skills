# 需求管理 · App 端 UI 描述

> 本文件仅承载 App 员工端与公开 H5 的共享约定和正文指针。员工端三页归需求工单管理，公开 H5 三种形态归需求外链管理；页面正文及 `assets/app/` 原型均在对应功能目录。视觉润色、Token 纪律、触控尺寸、三态、组件白名单等硬约束见 [设计入口](../../../busyming-skills-design/SKILL.md)、[平台硬约束](../../../busyming-skills-design/shared/platform-guidelines.md#2-平台硬约束) 与 [页面标准](../../../busyming-skills-design/shared/page-standards/)，交互三维度按 [interaction-spec.md](../../../busyming-skills-common/workflow/PM/references/interaction-spec.md) 填写。业务规则只引用、不复述，规则入口见 [SKILL.md](../SKILL.md) Prerequisites。

## 全局约定

- 状态标签、优先级 / 业务线 / 产品线 Tag、提交来源标签与排期开发状态的文案与语义同 [web-ui.md 全局约定](web-ui.md#全局约定)；有点推荐需求不渲染业务线 Tag
- 瞬时态不展示为独立状态与独立时间线节点
- 枚举取值以 [data.md §12](data.md#12-枚举) 为准；提交来源在 App 端只展示、不可筛选
- 按钮显隐以服务端返回的可执行操作为准，页面不自行推导角色；页面不触发推送，企微消息由服务端在操作成功后发出

## 功能 UI 索引

- [需求工单管理 · App 员工端](../需求工单管理/references/app-ui.md#app-员工端)
- [需求外链管理 · 公开 H5](../需求外链管理/references/app-ui.md#公开-h5)
