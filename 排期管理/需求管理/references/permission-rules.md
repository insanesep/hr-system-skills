# 需求管理 · 权限规则

> 权限编码以 system 菜单管理的生效数据为准（2026-10-18 核对生产菜单），本文件说明各编码控制的操作、角色可执行操作、数据可见范围与审批权限校验；角色与人员授予以 system 角色配置为准，本模块不维护人员名单。

## 1. 权限编码

### 1.1 Web

菜单位于「研发 / 需求管理」分组（分组编码 `REQUIREMENT:MANAGE`），下挂 5 个菜单，侧边栏各占一行。

| 类型 | 编码 | 名称 | 控制的操作 |
|------|------|------|-----------|
| 菜单 | `MENU:RND:REQUIREMENT` | 需求工单管理 | 需求列表、详情、提交 / 编辑页；路由 `/snackingdom/portal/requirement/list` |
| 按钮 | `BTN:REQUIREMENT:CREATE` | 新增需求/提交审批 | 新增需求、提交审批 |
| 按钮 | `BTN:REQUIREMENT:SAVE_DRAFT` | 暂存草稿 | 暂存草稿 |
| 按钮 | `BTN:REQUIREMENT:ATTACH_UPLOAD` | 上传需求附件 | 提交 / 编辑页上传附件、详情页审批中追加附件 |
| 按钮 | `BTN:REQUIREMENT:ATTACH_DELETE` | 删除需求附件 | 草稿态删除附件 |
| 按钮 | `BTN:REQUIREMENT:WITHDRAW` | 撤回 | 撤回 |
| 按钮 | `BTN:REQUIREMENT:DELETE` | 删除草稿 | 删除草稿 |
| 按钮 | `BTN:REQUIREMENT:EXPORT` | 列表导出 | 需求列表导出 |
| 按钮 | `BTN:REQUIREMENT:APPROVE` | 审批通过 | 审批通过 |
| 按钮 | `BTN:REQUIREMENT:REJECT` | 审批驳回 | 驳回 |
| 按钮 | `BTN:REQUIREMENT:LINK_CARD` | 关联/解除排期 | 关联排期、解除关联、重新关联 |
| 按钮 | `BTN:REQUIREMENT:RESUBMIT` | 重新提交 | 驳回后重新提交 |
| 菜单 | `MENU:RND:REQUIREMENT_CONFIG` | 需求审批配置 | 审批链配置页；路由 `/snackingdom/portal/requirement/config` |
| 按钮 | `BTN:REQUIREMENT_CONFIG:CREATE` | 新增审批配置 | 新增配置 |
| 按钮 | `BTN:REQUIREMENT_CONFIG:EDIT` | 编辑/启停审批配置 | 编辑配置、启用 / 停用 |
| 按钮 | `BTN:REQUIREMENT_CONFIG:DELETE` | 删除审批配置 | 删除配置 |
| 按钮 | `BTN:REQUIREMENT_CONFIG:CHAT_SET` | 设置业务线群通知 | 群消息配置 |
| 按钮 | `BTN:REQUIREMENT_STAT:EXPORT` | 导出需求统计 | 审批统计导出、SLA 仪表盘导出 |
| 菜单 | `MENU:RND:REQUIREMENT_LINK` | 需求外链管理 | 外链管理页；路由 `/snackingdom/portal/requirement/public-link` |
| 按钮 | `BTN:REQUIREMENT_LINK:CREATE` | 生成需求外链 | 生成外链 |
| 按钮 | `BTN:REQUIREMENT_LINK:REVOKE` | 撤销需求外链 | 撤销外链 |
| 菜单 | `MENU:RND:REQUIREMENT_SLA` | 需求SLA看板 | SLA 仪表盘；路由 `/snackingdom/portal/requirement/sla-dashboard` |
| 菜单 | `MENU:RND:REQUIREMENT_SLA_CONFIG` | SLA规则配置 | SLA 配置页；路由 `/snackingdom/portal/requirement/sla-config`；写操作额外要求管理员 |

- 本模块的「管理员」指持有 `MENU:RND:REQUIREMENT_CONFIG` 的用户，由服务端统一判定；外链台账看全部、撤销他人外链、SLA 配置写操作均按此口径判定，不另发权限码
- 手动催办、AI 方案确认 / 补材 / 重新生成不单独发按钮码：手动催办限管理员与实施负责人，见 [other-rule-sla.md §5](other-rule-sla.md#5-滞留需求看板)；AI 方案操作限当前级次审批人，见 [other-rule-ai-plan.md §5](other-rule-ai-plan.md#5-确认摘要与确认并通过)

### 1.2 App

| 类型 | 编码 | 名称 | 控制的操作 |
|------|------|------|-----------|
| 菜单 | `M:RD:REQUIREMENT` | 需求管理 | App 工作台「设置」分组下的需求管理入口：我的需求列表、需求详情、需求提交 |
| 菜单 | `M:RD:REQUIREMENT_M` | 需求管理(App 独占) | App 独占叶子菜单 |

- 公开 H5 不进登录鉴权体系，无权限编码；准入控制见 [other-rule-public-link.md §4](other-rule-public-link.md#4-安全与防刷)

## 2. 角色与操作

| 角色 | 可执行操作 |
|------|-----------|
| 业务线员工（提交人） | 提交需求、暂存与编辑草稿、删除草稿、撤回、驳回后重新提交、审批中追加附件 |
| 邀约人（内部任一拥有外链菜单权限的用户） | 生成外链、查看与撤销本人生成的外链 |
| 业务线负责人 | L1 审批通过（可调整优先级）/ 驳回 |
| 实施负责人 | L2 审批通过（可调整优先级）/ 驳回；滞留需求手动催办 |
| 产品经理 | L3 审批通过（可调整优先级）/ 驳回；关联 / 解除排期卡片；开启 AI 辅助后确认方案、请求补充材料、重新生成方案 |
| 管理员 | 配置审批链与 SLA、审批链重建、导出统计、查看与撤销全部外链、关联 / 解除排期、滞留需求手动催办 |
| 外部提交人 | 仅凭有效外链提交需求（免登录），无任何查询与管理权限 |

## 3. 数据可见范围

| 角色 | 列表可见范围 |
|------|-------------|
| 业务线员工 | 仅本人提交的需求 |
| 邀约人 | 本人提交的需求 + 由本人生成外链产生的外部单 |
| 业务线负责人 | 本业务线全部需求（含他人提交） |
| 有点推荐负责人 | 有点推荐产品线全部需求（含内部单与外部单） |
| 实施负责人 | 全部产品线与业务线需求 |
| 产品经理 | 提交对象为本人的需求 + 本人对口归属的需求 |
| 管理员 | 全部需求 + 审批链配置 + 外链台账 + 统计导出 |

- **视角取数口径**：「我提交的」按提交人为当前用户取数，外部单无内部提交人，天然不入该视角；外部单归入「外部提交」视角，按提交来源为外部取数，可见范围同本表，避免外部单落在所有视角之外
- 可见范围由服务端按角色裁剪，前端不做兜底过滤；滞留需求、SLA 仪表盘等视角沿用本表，不另行放宽

## 4. 权限约束

- 审批操作服务端二次校验：当前登录人必须在审批链快照的**当前级次**审批人清单中，否则拒绝
- **流程单豁免**：需求已关联流程中心实例时，上款快照校验**不执行**——页内「通过 / 驳回」直接以操作人身份代为调用流程中心审批，以流程中心节点快照匹配为唯一闸门（流程中心拒绝即无权限），避免流程中心侧转审、加签或管理员跳节点后两侧快照不一致，把合法审批人误拦在页内；自研通道单维持上款校验，见 [other-rule-flow-center.md §4](other-rule-flow-center.md#4-对接规则)
- 提交人不得审批自己提交的需求；若提交人同时为该级审批人，则该级自动跳过并写入流水说明（仅对内部单的自研通道生效，流程中心通道由本人在节点自行通过）
- App 端开放提交、撤回、驳回后重新提交、L1/L2/L3 审批通过与驳回（含 AI 方案操作）与进度查看；暂存草稿、审批中追加附件、排期关联、审批链与 SLA 配置、外链生成与管理、统计导出仅 Web 端可用
- **公开入口不进登录鉴权体系**：外部提交免登录，仅以外链有效性、图形验证码与频率限制作为准入控制，**不得复用内部提交入口**，见 [other-rule-public-link.md §4](other-rule-public-link.md#4-安全与防刷)
