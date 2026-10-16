---
name: requirement-management-api-spec
description: 需求管理 - 接口契约：内部需求 CRUD / 审批 / 审批链配置 / 外链邀约台账 / 附件元信息上报（前端 OSS 直传）/ SLA 时效管理，以及公开 H5 免登录接口的路径、请求响应字段、权限码与错误文案
type: reference
---

# 需求管理 · 接口契约

> 归属服务：`busyming-snackingdom-devops`（Context Path `/snackingdom-devops`）
> 根包：`io.busyming.innovation.snackingdom.devops`
> 规则真源见 [business-rule.md](business-rule.md)，字段真源见 [data-model.md](data-model.md)；本文只描述接口形态。

---

## 0. 全局约定

| 项 | 约定 |
|----|------|
| 请求方式 | 全部 `POST` + `application/json`（含查询类，便于复杂筛选体） |
| 业务路径前缀 | `/api/v1/inner/snackingdom/requirement`（🚨 存量前缀不得改动，改动前端 404） |
| 公开路径前缀 | `/api/v1/public/requirement`（免登录，`auth.whitelist.paths` 白名单内） |
| 响应包装 | 框架统一包装 `{ success, code, message, data, traceId }`，下文 `Response` 均指 `data` |
| 鉴权 | `LoginContext.get()` 取 `LoginUserInfo.permissions`；未登录 401 / 无权 403 |
| 分页 | 请求 `pageNum` / `pageSize`，响应 `records` / `total` / `pageNum` / `pageSize` |
| 时间格式 | `LocalDateTime` → `yyyy-MM-dd HH:mm:ss`；`LocalDate` → `yyyy-MM-dd` |
| 异常 | 业务异常抛 `ResponseStatusException`，文案对外可读，禁止透出 `Duplicate entry` 等 DB 原文 |

### 权限码

| 权限码 | 含义 |
|--------|------|
| `M:RD:REQUIREMENT` | App / Web 需求提交与查看 |
| `MENU:RND:REQUIREMENT` | 需求管理菜单 |
| `MENU:RND:REQUIREMENT_CONFIG` | 审批链配置菜单 |
| `MENU:RND:REQUIREMENT_LINK` | 外链邀约菜单（新增） |
| `BTN:REQUIREMENT_LINK:CREATE` | 生成外链（新增） |
| `BTN:REQUIREMENT_LINK:REVOKE` | 撤销外链（新增） |
| `BTN:REQUIREMENT:ATTACH_UPLOAD` | 上传附件（新增） |
| `BTN:REQUIREMENT:ATTACH_DELETE` | 删除附件（新增，仅草稿态） |
| `MENU:RND:REQUIREMENT_SLA` | SLA 仪表盘菜单（新增） |
| `MENU:RND:REQUIREMENT_SLA_CONFIG` | SLA 配置菜单（新增，**落地时拆出的第 2 个码**） |

> **实现落地差异（2026-08-19，已随代码实现确认）**：
> 1. **SLA 菜单权限码由 1 个拆为 2 个**：原文只发 `MENU:RND:REQUIREMENT_SLA` 一个码兼管「SLA 仪表盘 + SLA 配置」，但 [`web-ui.md`](web-ui.md) 明确要求「SLA 配置与审批链配置同级，两者不合并为同一页的 Tab」—— 侧边栏需两个菜单项，而一个 `perm_code` 挂不出两行菜单。实际注册：
>
>    | 权限码 | 菜单 | 路由 |
>    |--------|------|------|
>    | `MENU:RND:REQUIREMENT_SLA` | SLA 仪表盘 | `/requirement/sla-dashboard` |
>    | `MENU:RND:REQUIREMENT_SLA_CONFIG` | SLA 配置 | `/requirement/sla-config` |
>
> 2. **接口鉴权分工**：`/sla/dashboard`、`/sla/dashboard/export` 用 `_SLA`；`/sla/config/*` 用 `_SLA_CONFIG` **且写操作（save / delete / status / impact）额外要求管理员**（`RequirementPermissionHelper.isAdmin()`，看 `MENU:RND:REQUIREMENT_CONFIG`）；`/sla/stale-list`、`/sla/manual-remind` 用 `MENU:RND:REQUIREMENT`。
> 3. **附件列表权限放宽为「任一命中」**：`/attachment/list` 实际校 `MENU:RND:REQUIREMENT` **或** `M:RD:REQUIREMENT` 任一（`requireAnyPerm`）—— PC 用户持的是前者，只校后者会让 Web 详情页附件区块整体 403。
> 4. **SLA 仪表盘导出不新发权限码**：复用审批统计的 `BTN:REQUIREMENT_STAT:EXPORT`。

> 🚨 权限码前缀实测为 `RND` 而非文档早期写法 `RD`，与库中既有需求菜单一致（web-ui.md 已回写对齐）。
>
> 🚨 **无「查看全部外链」独立权限码**：外链台账的可见范围（`admin` 字段）与「可否撤销他人链接」均由 `RequirementPermissionHelper.isAdmin()` 判定，
> 它看的是 `MENU:RND:REQUIREMENT_CONFIG`，与需求管理其余页面同一口径。若后续需要单独控制该粒度，需同时补权限码与代码引用。

---

## 1. 需求主流程 `/api/v1/inner/snackingdom/requirement`

| 路径 | 说明 | 增量字段 |
|------|------|---------|
| `/save` | 暂存草稿（仅 Web） | Request 增 `productLine` / `pmUserId`（草稿可空） |
| `/submit` | 提交 / 重新提交 | Request 增 `productLine` / **`pmUserId`（内部提交必填，提交对象）**；Response 增 `approvalEntryName` |
| `/list` | 列表分页（含视角 Tab） | Request 增 `productLine` / `submitSource`，`viewTab` 增 `EXTERNAL`；Row 增 5 字段 |
| `/kpi` | 顶部 KPI | — |
| `/detail` | 详情 | Detail 增 `externalSubmitInfo` / `pmUserId` / `pmUserName` 等 |
| `/approve` | 审批通过（任意级次） | 🚨 不再接收指派 PM 字段；外部单 L3 通过时自动写入 `pm_user_id` |
| `/reject` | 审批驳回 | — |
| `/withdraw` | 撤回 | 🚨 外部单调用返回 403 文案 |
| `/delete` | 删除草稿 | 🚨 外部单调用返回 403 文案 |
| `/link-card` `/unlink-card` `/card-candidates` | 排期卡片关联 | `/card-candidates` 契约见 §1.6（2026-09-16 候选集重定义 + 双筛选） |
| `/export` | 异步导出 | Request 同 `/list` |
| `/pending-count` | 待我审批数（App 角标） | — |
| `/pm-options` | 提交对象（产品经理）候选 | 候选集为配置驱动，契约见 §1.5 |
| `/chain-preview` | 审批链预检（新增） | 按提交对象 + 四维条件返回将命中的链（§1.4） |

### 1.1 `SaveReq`（`/save` `/submit`）增量

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `productLine` | String | 否 | `SNACK` / `YDTJ`；缺省按 `SNACK`（存量兼容） |
| `bizLine` | String | 条件 | `productLine=YDTJ` 时不传，后端固定归一为 `*`；`SNACK` 必填 |
| `pmUserId` | Long | 条件 | **提交对象（产品经理）**：`/submit` 内部提交必填；`/save` 草稿可空（仅校验标题）；重新提交时回填原值、允许更换 |

- 提交后 `productLine` 与 `bizLine` 均不可修改（重新提交场景只读）；`pmUserId` 在草稿与驳回重提时可更换，更换后按新对象重新匹配审批链（business-rule §2.4）
- `/submit` 后端按 `pmUserId` 匹配专属链生成审批链快照（2026-10-09 起内部单不再回退默认链，business-rule §3.4）；未命中配置返回「当前归属未配置审批链，请联系管理员」
- `/submit` Response 增 `approvalEntryName`：命中审批链第一级的展示名（如「供应链负责人」「实施负责人」「产品经理 陈默」），用于前端 Toast 文案，前端有本地兜底

### 1.2 `RequirementPageReq` 增量

| 字段 | 类型 | 说明 |
|------|------|------|
| `viewTab` | String | 新增取值 `EXTERNAL`（外部提交视角，仅 Web；需 `MENU:RND:REQUIREMENT_LINK` 或管理员） |
| `productLine` | String | 产品线筛选 |
| `submitSource` | String | `INTERNAL` / `EXTERNAL` |
| `submitterKeyword` | String | 🚨 同时模糊匹配内部提交人姓名与 `external_submitter_name` |

- 可见范围：BU 负责人 / PM 按其配置行的产品线集合收口；外链邀约人可见自己邀约产生的外部单。

### 1.3 `RequirementRowVO` / `RequirementDetailVO` 增量

| 字段 | 类型 | 说明 |
|------|------|------|
| `productLine` / `productLineName` | String | 产品线与展示名 |
| `submitSource` | String | `INTERNAL` / `EXTERNAL` |
| `externalSubmitterName` | String | 外部提交人手填姓名（列表提交人列取此值） |
| `externalSubmitterDept` | String | 外部提交人手填部门（自由文本，不关联组织架构） |
| `bizLineName` | String | 🚨 `YDTJ` 返回空串，前端据此不渲染业务线药丸 |
| `actions` | List | 🚨 外部单不含 `EDIT` / `RESUBMIT` / `WITHDRAW` / `DELETE`，前端二次兜底不渲染 |

`RequirementDetailVO.externalSubmitInfo`（仅 `submitSource=EXTERNAL` 非空）：

| 字段 | 说明 |
|------|------|
| `submitterName` / `submitterDept` / `submitterContact` | 手填三要素；手机号仅供内部人工回访 |
| `sourceIp` | 提交来源 IP（内部风控用） |
| `publicLinkId` / `linkToken` | 关联外链（Web 详情可跳台账并高亮，App 无跳转） |
| `inviterName` / `inviteeRemark` | 邀约人姓名 / 邀约对象备注 |

`RequirementDetailVO` 另增 `pmUserId` / `pmUserName`（提交对象；外部单 L3 通过前为 NULL，前端展示「待产品确认通过后归集」）；审批进度节点由审批链快照驱动返回 `approvalNodes[]`（元素含 `approvalLevel` / `levelName` / `approverNames[]` / `nodeStatus` / `opinion` / `operatedAt`），**前端按数组渲染 1~3 个节点，不固定渲染三级**。

### 1.4 `POST /chain-preview` 审批链预检（新增）

权限：`MENU:RND:REQUIREMENT` 或 `M:RD:REQUIREMENT` 任一

Request `ChainPreviewReq`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pmUserId` | Long | 是 | 提交对象（产品经理），来自 `/pm-options` |
| `productLine` | String | 是 | `SNACK` / `YDTJ` |
| `bizLine` | String | 条件 | `SNACK` 必填；`YDTJ` 传 `*` |
| `requirementType` | String | 是 | 5 类型枚举 |
| `priority` | String | 是 | `P0` / `P1` / `P2` / `P3` |

Response `ChainPreviewVO`

| 字段 | 说明 |
|------|------|
| `matched` | 是否命中可用审批链；`false` 时前端展示「当前归属未配置审批链，请联系管理员」并置灰提交按钮 |
| `chainSource` | `DEDICATED`（PM 专属链）/ `DEFAULT`（默认链）；2026-10-09 起内部单收窄为必中 `DEDICATED`，`DEFAULT` 仅外部单与防御兜底（business-rule §12.1 D2） |
| `levels[]` | 将生成的快照级次（升序），元素含 `approvalLevel` / `levelName` / `approverNames[]`（或签多人全列）；~~默认链兜底时 L3 恒为提交对象本人~~（2026-10-09 起内部单不走默认链，该替换语义废止） |
| `entryName` | 链首级次展示名（与 `/submit` 的 `approvalEntryName` 同口径） |

- 🚨 本接口**只读预检**：不写库、不生成快照，与实际提交共用同一套匹配逻辑（business-rule §3.4），保证预览与提交结果一致。
- 提交对象 / 产品线 / 业务线 / 类型 / 优先级任一变更时前端重新调用。

### 1.5 `POST /pm-options` 提交对象（产品经理）候选

权限：`MENU:RND:REQUIREMENT` 或 `M:RD:REQUIREMENT` 任一

Request

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `productLine` | String | 是 | 产品线；2026-10-09 起必填（候选集按归属过滤） |
| `bizLine` | String | 条件 | 业务线；`productLine=SNACK` 时必填，`YDTJ` 固定 `*` |
| `keyword` | String | 否 | 姓名模糊搜索 |

Response：`records[]`，元素含：

| 字段 | 说明 |
|------|------|
| `pmUserId` / `pmUserName` | 产品经理 ID 与姓名 |
| `deptName` | 所属部门（辅助识别同名） |
| `hasDedicatedChain` | 是否已配专属链（2026-10-09 收窄后恒为 `true`，字段保留兼容旧端，前端不再展示「默认链兜底」提示） |

- 🚨 **候选集为配置驱动（2026-10-09 收窄，business-rule §3.2 / §12.1 D2）**：仅返回在请求「产品线 × 业务线」归属下配有 `status=1` 专属链的 PM（`pm_user_id` 去重），**不再并默认链 L3 审批人**（~~专属链 ∪ 默认链 L3 并集~~旧口径废止）；且 `sys_user` 在职有效（离职 / 停用用户剔除）。收窄后内部提交必中专属链，默认链不再承接内部单
- 🚨 **审批链配置页的「指定产品经理」选择器不走本接口**，使用全员人员搜索——否则没配过链的新 PM 永远无法进入候选（循环依赖）
- 候选为空时提交页提示「暂无可选的产品经理，请联系管理员配置审批链」并阻断提交（不阻断表单其余字段填写）

### 1.6 `POST /card-candidates` 排期卡片候选（2026-09-16 候选集重定义 + 双筛选）

权限：`BTN:REQUIREMENT:LINK_CARD`（与关联排期操作同码，不新增权限码）

Request

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `month` | String | 是 | 排期月份 `yyyy-MM`，默认当月；按 `feat_schedule_card.scheduled_date` 所属月过滤（Backup 池卡 `scheduled_date` 为 NULL，不入候选） |
| `devUserName` | String | 否 | 开发人筛选：人员选择器选人后按**姓名等值**匹配 `feat_schedule_card.dev_user_name`；`PENDING` 卡该列为 NULL 天然不命中（business-rule §5.1 空值口径） |
| `submitUserId` | Long | 否 | 需求提交人筛选：反查 `requirement.submit_by = submitUserId AND linked_card_no IS NOT NULL` 的 `linked_card_no` 集合，候选卡片 `card_no` 须命中该集合；外部单 `submit_by` 为 NULL 不参与（business-rule §5.1） |

Response：`records[]`，元素含：

| 字段 | 说明 |
|------|------|
| `cardNo` / `title` | 卡片编号与标题 |
| `scheduledDate` | 排期日期 |
| `status` | `PENDING` / `IN_PROGRESS` / `DONE`（候选集已排除 `NON_FEATURE` 与已删除卡） |
| `devUserName` | 开发人姓名；`PENDING` 卡为 `null`，前端展示 `—` |
| `linkedReqCount` | 已被需求关联条数；`0` = 未关联卡 |
| `linkedSubmitters` | 已关联需求的提交人姓名列表（去重，外部单提交人展示其手填姓名）；`linkedReqCount = 0` 时为空数组 |

- 候选集与排序规则真源见 business-rule §5.1：`scheduled_date` 升序，同日期按 `card_no` 升序
- 弹窗内滚动加载的轻量列表，**不分页**（`month` 必填已限定单月数据量级）
- 选中 `linkedReqCount > 0` 的卡片提交关联时，前端须先弹同挂二次确认（business-rule §5.1），确认后仍调 `/link-card`，无额外接口

---

## 2. 审批链配置 `/api/v1/inner/snackingdom/requirement/config`

审批链匹配模型：**提交对象（`pmUserId`）专属链优先** —— 配置行 `pmUserId` 非空为该 PM 的专属链，`pmUserId` 为 NULL 为默认链（原「产品线 × 业务线 × 需求类型 × 优先级」四维配置）；2026-10-09 起内部单收窄为必中专属链，默认链仅承接外部提交与防御兜底（business-rule §3 / §12.1 D2）。

| 路径 | 说明 |
|------|------|
| `/list` | 配置矩阵查询 |
| `/save` | 新增 / 编辑配置行 |
| `/delete` | 删除配置行 |
| `/status` | 启停配置行 |
| `/webhook` | 维护群通知 webhook |
| `/rebuild-chain` | 重建在途需求审批链 |
| `/stat` | 审批时效统计 |
| `/stat/export` | 统计异步导出 |

- 上述接口的定位条件（`ConfigListReq` / `ConfigSaveReq` / `ConfigCondReq` / `ConfigStatusReq` / `ConfigWebhookReq` / `StatReq`）**全部增 `productLine` 与 `pmUserId`**：`pmUserId` 传具体 PM 查 / 写专属链，传 NULL（或不传）查 / 写默认链。
- `ConfigSaveReq` 另增 `approvalLevels`（`Integer[]`，`{1,2,3}` 的非空子集）：**专属链**可任选级次（至少一级）；**默认链** SNACK 固定 `[1,2]`、`YDTJ` 固定 `[1,2,3]`，服务端强校验（business-rule §3.2）。
- `ConfigListReq` 响应 Row 增 `pmUserId` / `pmUserName` / `approvalLevels[]`（该行覆盖的级次集合），供配置页按提交对象分组渲染。
- `ConfigListReq` 响应增 `dedicatedChainCount`（2026-10-10 研发落地补充）：当前归属（产品线 × 业务线）下启用中专属链的 PM 数（`status=1`，`pm_user_id` 去重），与当前查看对象（默认链 / 某 PM）无关——配置页「该归属未配置产品经理专属链，内部提交将无可选提交对象」红色告警与二级 Tab 红点的数据源（web-ui 配置页告警 ②）。
- 🚨 匹配规则：**提交对象、产品线与业务线必须等值命中，不降级**；仅需求类型与优先级支持 `*` 通配降级（内部单仅匹配专属链、外部单匹配默认链，顺序见 business-rule §3.4）。
- `YDTJ` 的配置行 `bizLine` 固定 `*`，前端归属区只读展示为「有点推荐」。
- `/rebuild-chain`：按在途需求的 `pm_user_id` 重新匹配专属链（~~专属链 → 默认链，内部单默认链兜底的 L3 恒替换为该单 `pm_user_id`~~——2026-10-09 起内部单不走默认链）；只替换审批人，不增减级次（business-rule §3.6）。

---

## 3. 外链邀约 `/api/v1/inner/snackingdom/requirement/public-link`

> 仅有点推荐（`YDTJ`）；生成即定向、一次性。Web 端独有，App 无入口。

### 3.1 `POST /create` 生成外链

权限：`BTN:REQUIREMENT_LINK:CREATE`

Request `PublicLinkCreateReq`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `inviteeRemark` | String | 是 | 邀约对象备注（≤64），公开页预填姓名 |
| `defaultRequirementType` | String | 是 | 默认需求类型（公开页 Picker 初值） |
| `validDays` | Integer | 否 | 有效天数，默认 30，取值 `7/15/30/60/90` |
| `submitLimit` | Integer | 否 | 提交次数上限，默认 1，范围 1–10 |

Response `RequirementPublicLinkCreateVO`：`id` / `inviteUrl` / `inviteeRemark` / `expireAt` / `submitLimit`

- 🚨 `inviteUrl` = `app.requirement.public-link-base-url` + `/public/requirement?token={token}`，**URL 仅带 token，不带任何业务参数**。
- 🚨 **二维码不由后端生成**：前端依 `inviteUrl` 用 `qrcode@1.5.4` 本地绘制（沿用采购邀约范式，后端零图片依赖）。
- `token` 为 32 位随机串（`[A-Za-z0-9]`），不可预测、不含业务语义。

### 3.2 `POST /page` 台账分页

权限：`MENU:RND:REQUIREMENT_LINK`

Request `PublicLinkPageReq`：`statusList` / `inviteeKeyword` / `creatorKeyword` / `createdAtStart` / `createdAtEnd` / `pageNum` / `pageSize`

Response `RequirementPublicLinkPageVO`：`records` / `total` / `pageNum` / `pageSize` / `admin`

- `admin=false` 时后端**强制**只返回本人生成的链接（不依赖前端传参）；`admin` 由 `MENU:RND:REQUIREMENT_CONFIG` 判定（见 §0 权限码备注）。
- Row 关键字段：`status` / `statusName`（`GENERATED` 待使用 / `USED` 已提交 / `EXPIRED` 已过期 / `REVOKED` 已撤销）、`submitCount`/`submitLimit`、`visitCount`、`firstVisitAt`、`lastSubmitAt`、`expireAt`、`expiringSoon`（剩余 ≤3 天）、`createdByName`、`revokeReason`、`requirements[]`（`id`/`requirementNo`/`status`/`statusName`）、`actions[]`。
- 🚨 `inviteUrl` **仅 `GENERATED` 行返回**，其余状态置空，避免失效链接被继续转发。
- 🚨 状态按 `expire_at` **实时判定**：库中仍为 `GENERATED` 但已过期的行，查询时按 `EXPIRED` 返回（与公开页口径一致，不依赖 Job）。

### 3.3 `POST /revoke` 撤销外链

权限：`BTN:REQUIREMENT_LINK:REVOKE`

Request `PublicLinkRevokeReq`：`id`（必填）/ `revokeReason`（必填，≤128）

- 仅 `GENERATED`（实时判定后仍待使用）可撤销；`USED` / `EXPIRED` / `REVOKED` 返回对应文案。
- 已提交产生的需求**不受撤销影响**，继续走审批流程。

---

## 4. 公开 H5 免登录 `/api/v1/public/requirement`

> 白名单：`auth.whitelist.paths` 追加 `/api/v1/public/requirement/**`（common SDK `LoginContextFilter` 放行）。
> 防刷四道：token 有效性防枚举 → 图形验证码 → 提交上限行锁 → IP 分钟级限流。

### 4.1 `POST /token` 校验 token

Request `TokenReq`：`token`（必填）

Response `RequirementPublicTokenVO`

| 字段 | 说明 |
|------|------|
| `available` | 是否可提交 |
| `failReason` | 不可用原因：`USED` / `EXPIRED` / `REVOKED` / `INVALID` |
| `requirementNo` | 仅 `USED` 时返回，供已提交页展示凭证 |
| `inviteeRemark` | 邀约对象备注（可用时返回，预填姓名） |
| `defaultRequirementType` | 默认需求类型 |
| `submitLimit` | 提交次数上限（页面文案用） |
| `typeOptions[]` | `code` / `name` 需求类型选项 |

- 🚨 **四态响应结构一致**：token 不存在与已失效返回同构体（仅 `failReason` 不同），防枚举探测。
- 🚨 **接口失败 ≠ 链接失效**：网络 / 5xx 时前端渲染整页错误态 + 「重新加载」，绝不误判为失效页。
- 首次访问回写 `first_visit_at` 与 `visit_count`，并写事件流水（含 IP / UA）。

### 4.2 `POST /captcha` 图形验证码

Request `TokenReq`：`token`（必填）

Response `RequirementPublicCaptchaVO`：`imageBase64`（`data:image/png;base64,...`）

- 服务端 `java.awt` 本地绘制 4 位字符，**无第三方依赖**；答案存 Redis，key 维度为 token，TTL 300s，一次性消费。
- 连续错误 3 次强制刷新验证码；已失效链接不下发验证码。

### 4.3 `POST /submit` 外部提交

Request `ExternalSubmitReq`

| 字段 | 校验 |
|------|------|
| `token` | `@NotBlank` |
| `captcha` | `@NotBlank` |
| `title` | `@NotBlank` `@Size(max=128)` |
| `description` | `@NotBlank` `@Size(min=20, max=2000)` 🚨 外部下限 20 字，高于内部 10 字 |
| `type` | `@NotBlank`，须在该链接允许的类型选项内 |
| `submitterName` | `@NotBlank` `@Size(max=64)` |
| `submitterDept` | `@NotBlank` `@Size(max=128)` |
| `submitterContact` | `@NotBlank` `@Pattern(^1[3-9]\d{9}$)` |

Response `RequirementPublicSubmitVO`：`requirementNo`（仅此一个字段）

- 🚨 **单向收口**：成功仅回需求编号作为凭证，不回传进度、不发任何短信 / 通知给提交人；审批结果只通知邀约人。
- 落库事务（`snackingdomTransactionManager`）：`SELECT ... FOR UPDATE` 锁链接行 → 校验实时状态与提交上限 → `submit_count+1`、`last_submit_at`、达上限置 `USED` → 建需求（`submit_source=EXTERNAL`、`submit_by=NULL`、`product_line=YDTJ`、`biz_line=*`、`pm_user_id=NULL`，状态直接进审批）→ **按默认链**建审批链快照（外部单无提交对象，business-rule §3.4；L3 通过时再将实际通过人写入 `pm_user_id`）→ 写审批流水与事件流水。**2026-10-09 起审批流转经流程中心**：落库后以邀约人（`public_link.created_by`）身份代调 `submit-external` 建实例（formData 不携 `pmUserId`，平台落 YDTJ 默认链；邀约人失效回退自研并告警，契约见 business-rule §12.4 ②）→ 回写 `flow_instance_id`。
- 事务体位于独立 Bean `RequirementExternalSubmitTx`，避免 `@Transactional` 自调用失效。
- 审批链缺配时抛业务异常，前端 Toast 原文展示并保留表单；同时异步告警邀约人（`REQUIREMENT.LINK_FAILED` 模板）。
- IP 限流：同 IP 每分钟 ≤10 次（Redis 分钟窗口）；Redis 异常时放行，不因基础设施故障挡住正常提交。

### 4.4 错误文案与前端分流

| 后端文案关键词 | 前端处理 |
|---------------|---------|
| 含「验证码」 | 验证码字段标红 + 自动刷新，表单值保留 |
| 含「图片」/「附件」 | 图片区块标红提示原文（如超张数、超大小、格式不支持），**表单其余字段保留**，不阻塞用户改图后重提 |
| 含「已完成提交」 | 整页切「已提交」终点页 |
| 含「已过期」 | 整页切「已过期」终点页 |
| 含「已失效」/「链接无效」 | 整页切「已撤销 / 无效」终点页 |
| 其他（限流 / 缺配 / 未知） | Toast 展示原文，表单值保留 |
| 请求超时（`code = -1`） | 🚨 **不解锁提交按钮**，提示「提交处理中，请勿重复点击…」，避免重复消耗唯一次数 |

---

## 5. 需求附件 `/api/v1/inner/snackingdom/requirement/attachment`

> 规则真源 [business-rule.md](business-rule.md) §9；字段真源 [data-model.md](data-model.md) §7 `requirement_attachment`。
> 文件实体落 OSS，库内只存元信息；三端能力差异（Web 全类型 / App 图片 / H5 受限图片）由后端按 `uploadSource` 强校验，**不依赖前端自律**。

> **实现落地差异（2026-08-19，已随代码实现确认）**：本节接口形态发生结构性变化，内部接口由原文 4 个收敛为 **3 个**：
> 1. **附件改为前端 OSS STS 直传，后端只收元信息**（用户裁决）：前端先调 `/snackingdom-foundation/web/oss/token/get` 拿 STS 临时凭证直传 OSS，再把 `{fileName, fileType, fileExt, fileSize, ossKey, ossBucket}` 元信息交后端。故 **§5.1 的 `MultipartFile` 版 `POST /attachment/upload` 不实现**，改为 `POST /attachment/save`（见下方 §5.1）。
> 2. **§5.3 `GET /attachment/download` 不实现**：预览 / 下载由前端用自有 `keyToUrl(ossKey)` 自签，鉴权卡在 `/attachment/list`（看不到该需求就拿不到 `ossKey`），不写下载事件流水。
> 3. **内容安全审核本期整体不做**（用户裁决）：`RequirementAttachmentVO` 不回 `contentCheckStatus` / `contentCheckAt`，§5.2 的 rejected / pending 可见性两条 🚨 均失效，三端 UI 一律不渲染审核角标。
> 4. **元信息可随表单提交**：`SaveReq`（内部单）与 `ExternalSubmitReq`（外部单）均新增 `attachments` 数组，后端在需求落库**同事务内做全量同步**：新增插入；不在数组里的仅 `DRAFT` 态允许软删，`REJECTED` 重提**只能新增不能删**。
> 5. **公开 H5 是唯一不走直传的端**：免登录拿不到 STS（把 OSS 写凭证暴露给公网 = business-rule §9.5 要防的存储滥用），故保留后端转存接口（见 §5.1 末尾）。

### 5.0 路径与方法口径对齐（🚨 必读）

本模块 §0 已约定「全部 `POST` + `application/json`」且业务前缀为存量 `/api/v1/inner/snackingdom/requirement`，故附件与 SLA 接口按本模块口径落地，与需求描述里的 REST 写法做如下映射：

| 需求描述路径 | 本模块落地路径 | 偏离原因 |
|-------------|--------------|---------|
| `POST /api/requirement/{id}/attachment/upload` | ~~`POST {前缀}/attachment/upload`~~ → **`POST {前缀}/attachment/save`** | 前缀对齐存量；**实际不收文件流**，前端 STS 直传 OSS 后只上报元信息数组 |
| `GET /api/requirement/{id}/attachments` | `POST {前缀}/attachment/list` | 查询类统一 POST + JSON |
| `GET /api/requirement/attachment/{attachmentId}/download` | ~~`GET {前缀}/attachment/download?attachmentId=`~~ | 🚨 **本期不实现**：前端 `keyToUrl(ossKey)` 自签，本模块因此**无 GET 例外**，全部接口统一 POST |
| `DELETE /api/requirement/{id}/attachment/{attachmentId}` | `POST {前缀}/attachment/delete` | 统一 POST |
| `GET /api/requirement/sla/stale-list` | `POST {前缀}/sla/stale-list` | 分页查询统一 POST |
| `GET /api/requirement/sla/dashboard` | `POST {前缀}/sla/dashboard` | 统一 POST |
| `PUT /api/requirement/sla/config` | `POST {前缀}/sla/config/save` | 统一 POST，与 §2 `/config/save` 命名同构 |

> 🚨 **落地后本模块已无任何 GET 接口，也无任何内部 `multipart` 接口**（唯一 `multipart` 入口是公开 H5 转存，见 §5.1 末尾）。

### 5.1 `POST /attachment/save` 上报附件元信息（原文为 `POST /attachment/upload`）

权限：`BTN:REQUIREMENT:ATTACH_UPLOAD`

> **实现落地差异（2026-08-19）**：原文的 `multipart/form-data` 版本**不实现**。实际为 POST + JSON，文件实体由前端持 STS 直传 OSS，本接口只落元信息；因此本模块**不存在 `multipart` 内部例外**。

Request `SaveReq`（JSON）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `requirementId` | Long | 是 | 目标需求 ID |
| `files[]` | 数组 | 是 | 每元素 `{fileName, fileType, fileExt, fileSize, ossKey, ossBucket}`；支持一次上报多条 |
| `uploadSource` | String | 否 | `web` / `app`，缺省 `web`；`h5` 只允许从公开接口传入 |

Response：`RequirementAttachmentVO[]`（本次落库的全部附件）

| 字段 | 说明 |
|------|------|
| `id` / `fileName` / `fileType` / `fileExt` / `fileSize` | 附件元信息；`fileSize` 同时回 `fileSizeText`（如 `2.3 MB`）供前端直接展示 |
| ~~`contentCheckStatus`~~ | 🚨 **不返回**（内容安全审核本期不实现，库表也无此列） |
| `isAppended` | 是否审批中追加 |
| `ossKey` / `ossBucket` | 供前端自行 `keyToUrl(ossKey)` 签名预览（取代原文的 `previewUrl`） |
| `uploadUserName` / `uploadAt` | 上传人与时间 |

🚨 **后端仍按 `uploadSource` 强校验上报内容，不因直传而放松**：

- `fileExt` 过白名单；`fileSize` 过单文件大小上限；张数上限**按类型分别计数**（business-rule §9.1）。
- `fileType` 由 `fileExt` **反推**，**不信前端传值**（MIME 三方校验本期无法做：后端拿不到文件流）。
- 校验失败一律返回可读文案并**指明具体限制值**：如「单张图片不得超过 10MB，当前 12.4MB」「图片最多上传 20 张，当前已有 20 张」。

其余规则继续生效：

- 状态门槛：`DRAFT` / `REJECTED` 由提交人上传；审批中（三个 `*_REVIEWING` 态 **+ `SUBMITTED` 态**）仅提交人可追加，落 `is_appended=1` 并 `afterCommit` 通知当前级次审批人（business-rule §9.4）。
  - **落地补充**：`SUBMITTED` 是提交后到 L1 审批人接手的瞬时过渡态，禁止追加会让提交人卡在纯技术状态上，故同样按「追加」放行。
- 🚨 **追加附件不重置 SLA 计时**（business-rule §9.4），防止靠反复追加规避催办。
- ~~图片 / 视频落库后投递内容安全异步任务~~ —— **本期不实现**。
- OSS 写入成功但落库失败时抛异常回滚，OSS 上产生的孤儿文件由存储生命周期规则回收，不做同步删除（避免二次失败掩盖首因）。

**元信息也可随表单一并提交**（新增通道，与本接口并存）：`SaveReq`（需求暂存与提交）与 `ExternalSubmitReq`（外部单提交）均新增 `attachments` 数组，后端在需求落库**同事务内全量同步**：

- 新出现的元信息插入；不在数组里的已有附件仅 `DRAFT` 态允许软删。
- 🚨 `REJECTED` 重提时**只能新增不能删**（已进入审批视野的证据不得逆向消失）。

**公开 H5 同能力接口**：`POST /api/v1/public/requirement/attachment/upload`（免登录白名单内，**仍为 `multipart`**：`token` + `file`）。

> **实现落地差异（2026-08-19）**：公开 H5 是**唯一不走直传的端**，也是全模块唯一的 `multipart` 入口 —— 免登录拿不到 STS，把 OSS 写凭证发给公网正是 business-rule §9.5 要防的存储滥用。后端转存 OSS 后**只返回元信息、不落库**，再随 `/public/requirement/submit` 的 `attachments` 在同事务写入。

- 仅接受 `fileType=image`，单张 ≤5MB、最多 3 张、单次提交总大小 ≤15MB（business-rule §9.5）。
- 与 §4.3 共用同一 token 校验链与 IP 限流计数；最终落库时 `upload_user_id` 写 NULL，`upload_source=h5`。
- 🚨 上传失败**不阻塞需求提交**：前端提示后允许用户去掉图片继续提交（图片非必填）。

<details>
<summary>原需求描述（`multipart` 版 `POST /attachment/upload`，<b>本期未实现</b>，保留供对照）</summary>

🚨 本接口是全模块唯一的 `multipart/form-data` 例外（文件流无法走 JSON 体），其余一律 POST + JSON。

Request（form-data）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | MultipartFile | 是 | 单次单文件；多文件由前端并发多次调用，便于逐个反馈进度与失败 |
| `requirementId` | Long | 是 | 目标需求 ID；🚨 **未保存的表单不可上传**，前端须先 `/save` 拿 ID（business-rule §9.2） |
| `fileType` | String | 是 | `image` / `document` / `video`，后端与真实扩展名 + MIME 三方交叉校验 |
| `uploadSource` | String | 否 | `web` / `app`，缺省 `web`；`h5` 只允许从公开接口传入，内部接口传 `h5` 直接拒绝 |

原 Response 含 `contentCheckStatus`（`pending` / `passed` / `rejected`）与 `previewUrl`（有效期 5 分钟），两者均**未落地**：前者因内容安全不做，后者因预览改前端自签。

不实现原因：后端代收文件流多一次网关→应用→OSS 的带宽与超时风险，且大文件（视频 200MB）容易撞网关体积限制；直传方案同时去掉了「先存草稿才能上传」的前置依赖。

</details>

### 5.2 `POST /attachment/list` 查询附件列表

权限：~~与需求详情同口径（`M:RD:REQUIREMENT`）~~ → **落地为 `MENU:RND:REQUIREMENT` 或 `M:RD:REQUIREMENT` 任一命中**（`requireAnyPerm`），可见范围仍由后端按角色裁剪

> **实现落地差异（2026-08-19）**：只校 `M:RD:REQUIREMENT`（App 菜单码）会让 PC 用户整个附件区块 403（PC 持的是 `MENU:RND:REQUIREMENT`），故两码任一命中即放行。

Request：`requirementId`（必填）

Response：`records[]`（元素同 §5.1 `RequirementAttachmentVO`）/ `imageCount` / `documentCount` / `videoCount` / `canUpload` / `canDelete`

- ~~🚨 `contentCheckStatus=rejected` 的附件**不返回给非上传人**；上传人可见并带原因文案~~ —— 🚨 **本期失效**（内容安全审核不做，无 `contentCheckStatus` 字段）
- ~~`pending` 的图片对上传人可见（带「审核中」角标），对其他人不返回~~ —— 🚨 **本期失效**：未删除的附件对有权看该需求的人**一律可见**
- `canUpload` / `canDelete` 由后端按状态 + 角色计算，前端按此渲染按钮，不自行推导。
- 不分页：受 §9.1 数量上限约束，单需求附件总数有界。
- 🚨 **本接口是附件链路的唯一鉴权卡点**（因不实现 §5.3）：`ossKey` 只从本接口下发，看不到该需求就拿不到 `ossKey`，也就无法自签 URL。

### 5.3 ~~`GET /attachment/download` 下载 / 预览附件~~（🚨 本期不实现）

> **实现落地差异（2026-08-19，用户裁决）**：
> 1. **后端 302 下载接口不实现**。预览 / 下载由前端用自有 `keyToUrl(ossKey)` 自签，`ossKey` 从 §5.2 下发。
> 2. **签名有效期取前端实现值（Web 侧当前为 1 小时），非 business-rule §9.2 的 5 分钟** —— 阿里云 STS `DurationSeconds` 下限本身是 **15 分钟**，5 分钟在平台层面就做不到；直传方案复用既有 OSS 封装，沿用其 1 小时口径。
> 3. **鉴权卡在 §5.2**：看不到该需求就拿不到 `ossKey`。
> 4. **不写下载事件流水**：前端自签后直访 OSS，后端无感知。如后续确需下载审计，需重新引入后端中转或前端上报埋点。

<details>
<summary>原需求描述（<b>本期未实现</b>，保留供对照）</summary>

权限：与 §5.2 同口径

Request（query）：`attachmentId`（必填）/ `disposition`（`inline` 预览 / `attachment` 下载，缺省 `inline`）

Response：**HTTP 302**，`Location` 指向 OSS 签名 URL

- 🚨 本接口是唯一的 GET 例外：需交给浏览器 / WebView 直接跟随跳转，无法走 POST + JSON。
- 🚨 **不返回 Bucket 直链**：签名 URL 有效期 5 分钟，过期需重新调用本接口（business-rule §9.2）。
- 鉴权在 302 之前完成：无权访问该需求、附件已逻辑删除、`contentCheckStatus=rejected` 且请求人非上传人，一律 403，**不跳转**。
- 写事件流水记录下载行为（`event_type` 见 data-model §5）。

</details>

### 5.4 `POST /attachment/delete` 删除附件

权限：`BTN:REQUIREMENT:ATTACH_DELETE`

Request：`requirementId`（必填）/ `attachmentId`（必填）

- 🚨 **仅 `DRAFT` 态允许删除**，且仅上传人本人；已提交需求返回「需求已提交，附件不可删除」（business-rule §9.6）。
- 一律**逻辑删除**（`deleted_flag=1`），不做 OSS 物理移除，保留审计与追溯能力。
  - **落地确认（2026-08-19）**：草稿态删除**也不做 OSS 异步清理**（与 business-rule §9.6 原文的「异步清理 OSS」不同），孤儿对象交 Bucket 生命周期规则回收。
- 外部单（`submit_source=EXTERNAL`）附件不提供任何删除入口。

---

## 6. 审批时效与 SLA `/api/v1/inner/snackingdom/requirement/sla`

> 规则真源 [business-rule.md](business-rule.md) §10；配置字段真源 [data-model.md](data-model.md) §8 `requirement_sla_config`；催办 Job 见 [job-schedule.md](job-schedule.md) §3。
> 🚨 优先级维度沿用本模块既有 `P0/P1/P2/P3`，**不引入 `URGENT/HIGH/NORMAL/LOW` 第二套口径**；`approvalLevel` 为 `Integer` 1/2/3，与审批快照表一致。

> **实现落地差异（2026-08-19，已随代码实现确认）**：本章原文只写了 3 个接口（+1 个配套 `config/list`），**实际交付 9 个**，前缀 `/api/v1/inner/snackingdom/requirement/sla`：
>
> | 路径 | 用途 | 鉴权 | 契约位置 |
> |------|------|------|---------|
> | `POST /stale-list` | 滞留需求分页 | `MENU:RND:REQUIREMENT` | §6.1 |
> | `POST /manual-remind` | 手动催办 | `MENU:RND:REQUIREMENT` | §6.1 |
> | `POST /dashboard` | SLA 仪表盘聚合 | `MENU:RND:REQUIREMENT_SLA` | §6.2 |
> | `POST /dashboard/export` | 仪表盘异步导出 | `_SLA` + `BTN:REQUIREMENT_STAT:EXPORT`（**复用，不新发**） | §6.2 |
> | `POST /config/list` | 阈值配置分页 | `MENU:RND:REQUIREMENT_SLA_CONFIG` | §6.3 |
> | `POST /config/save` | 新增 / 更新阈值 | `_SLA_CONFIG` + 管理员 | §6.3 |
> | `POST /config/delete` | 删除阈值行（**物理删除**） | `_SLA_CONFIG` + 管理员 | §6.3 |
> | `POST /config/status` | 启用 / 停用阈值行 | `_SLA_CONFIG` + 管理员 | §6.3 |
> | `POST /config/impact` | 阈值变更影响面预检 | `_SLA_CONFIG` + 管理员 | §6.3 |
>
> 其中新增的 4 个：
> 1. `POST /dashboard/export` —— 提交到导出中心异步生成 Excel，导出 `bizModule` 为 `REQUIREMENT_SLA`，`bizScene` 为「需求管理-SLA仪表盘」，快照参数含 `productLine` / `bizLine` / `submitSource` / `dateStart` / `dateEnd` / `granularity`。
> 2. `POST /config/delete` —— 因 `requirement_sla_config` 无 `deleted_flag` 列，**删除为物理删除**，行不可恢复，留痕靠 `SLA_CONFIG_CHANGED` 事件。
> 3. `POST /config/status` —— 停用走 `status=0`（行保留、不参与匹配），与物理删除语义区分。
> 4. `POST /config/impact` —— 调紧阈值前预检受影响的在途条数，供二次确认弹窗；🚨 **只读：不发任何消息、不写任何表**。

### 6.1 `POST /sla/stale-list` 滞留需求列表

权限：`MENU:RND:REQUIREMENT`（可见范围与需求列表完全一致，**不因滞留视角放宽**，business-rule §10.5）

Request `SlaStalePageReq`：`productLine` / `bizLine` / `priorityList` / `approvalLevel` / `minStaleHours` / `pageNum` / `pageSize`

Response：`records` / `total` / `pageNum` / `pageSize`

Row 关键字段：

| 字段 | 说明 |
|------|------|
| `requirementId` / `requirementNo` / `title` / `status` / `statusName` | 需求基本信息 |
| `productLine` / `bizLine` / `priority` | 归属与分级 |
| `approvalLevel` / `approvalLevelName` | 当前滞留级次（1 业务线 / 2 实施 / 3 产品） |
| `currentApproverNames[]` | 当前级次审批人（或签多人全列） |
| `staleHours` | 当前节点停留时长（小时，实时计算，起算点见 business-rule §10.1） |
| `remindHours` / `escalateHours` | 命中的 SLA 阈值，供前端展示「已超阈值 N 小时」 |
| `escalated` | 是否已触发升级 |
| `lastRemindAt` | 最近一次催办时间；无则为空 |
| `actions[]` | 含 `MANUAL_REMIND`（手动催办）时前端渲染按钮 |

- 默认排序：`staleHours` **倒序**（滞留最久在最前），前端不提供改为正序（business-rule §10.5）。
- 默认筛选条件为「停留 ≥ 命中的 `remindHours` 且未处理」，`minStaleHours` 传值时以传值为准。
- 🚨 手动催办与 Job 自动催办**共用同一去重窗口**（business-rule §10.7）：窗口内重复点击返回「该需求本轮已催办过，下次可催办时间 {时间}」。

### 6.2 `POST /sla/dashboard` SLA 仪表盘数据

权限：`MENU:RND:REQUIREMENT_SLA`

> **实现落地差异（2026-08-19，已随代码实现确认）**：
> 1. **`SlaDashboardReq` 字段清单漏写 `submitSource`**：business-rule §10.6 要求可按提交来源下钻，实际请求体含 `submitSource`。
> 2. **`SlaDashboardVO` 补第 4 张指标卡 `currentStaleCount`**（当前滞留条数）：[`web-ui.md`](web-ui.md) 要求四张卡，原字段表只给了三项。🚨 该值为**实时值，不受时间区间筛选影响**（滞留是当下事实，历史区间内的滞留无意义）。
> 3. **`overtimeRate` 是后端已格式化的百分数文本**（`String`，如 `12.5%`），**不是 0–1 小数** —— `trend[]` 内的 `overtimeRate` 同口径；前端直接展示，不再乘 100。
> 4. 🚨 **端到端周期的「首次 `submit_at`」取自审批流水**（`MIN(operated_at) WHERE action='SUBMIT'`），**而非 `requirement.submit_at`** —— 后者在驳回重提时被覆盖，直接用会让端到端周期**系统性偏短**；取不到时 fallback `r.submit_at`。
> 5. 🚨 **超时率按 `approval_log.duration_minutes >= 60 × 命中 remind_hours` 实算**，**不依赖 `SLA_REMINDED` 事件是否存在** —— 否则 Job 上线前的历史数据、静默延后的、推送失败的都会被误判为未超时。
> 6. `avgApprovalHours[]` 元素实际回 `bizLine` / `bizLineName` / `level` / `levelName` / `avgHours` / `sampleCount`（补两个名称字段，免前端再查字典）。
>
> 完整 Resp 字段：`avgApprovalHours[{bizLine,bizLineName,level,levelName,avgHours,sampleCount}]` / `avgEndToEndHours` / `endToEndSampleCount` / `overtimeRate(String)` / `overtimeCount` / `totalCount` / `currentStaleCount` / `trend[{period,avgApprovalHours,avgEndToEndHours,overtimeRate(String)}]`。

Request `SlaDashboardReq`：`productLine` / `bizLine` / **`submitSource`** / `dateStart` / `dateEnd`（按 `submit_at` 过滤，默认近 90 天）/ `granularity`（`WEEK` / `MONTH`，默认 `WEEK`）

Response `SlaDashboardVO`（对应 business-rule §10.6 四项指标）

| 字段 | 说明 |
|------|------|
| `avgApprovalHours[]` | 各业务线平均审批耗时，按 `approvalLevel` 1/2/3 拆分；元素含 `bizLine` / `bizLineName` / `level` / `levelName` / `avgHours` / `sampleCount` |
| `avgEndToEndHours` / `endToEndSampleCount` | 端到端平均周期（首次 `submit_at` → `LINKED`）；🚨 **未达 `LINKED` 的需求不入分母**；🚨 首次提交时间取审批流水 `MIN(operated_at) WHERE action='SUBMIT'` |
| `overtimeRate` | 超时率；🚨 **`String` 型的已格式化百分数文本**（如 `12.5%`），同时回 `overtimeCount` / `totalCount`；按 `duration_minutes >= 60 × remind_hours` 实算 |
| `currentStaleCount` | 当前滞留条数（第 4 张卡）；🚨 **实时值，不受时间区间筛选影响** |
| `trend[]` | 趋势序列，元素含 `period` / `avgApprovalHours` / `avgEndToEndHours` / `overtimeRate`（同为百分数文本） |

- 🚨 `trend[]` 由后端**按 `period` 日期正序返回**（最早在最前），前端直接顺序渲染：X 轴即时间轴，不得按数值 Top N 重排，也不设「其他」汇总项。
- 区间内无数据时返回空数组 + `sampleCount=0`，**不返回 0 值占位点**，避免图表出现假的「耗时 0 小时」。
- 驳回重提的需求按审批轮次分开计入审批耗时，但端到端周期取**首次** `submit_at` 起算（business-rule §10.6）。

**`POST /sla/dashboard/export` 仪表盘导出**（新增）：权限 `MENU:RND:REQUIREMENT_SLA` + `BTN:REQUIREMENT_STAT:EXPORT`（🚨 **复用审批统计导出权限码，不新发**）；Request 同 `SlaDashboardReq`；Response `{taskNo, idempotent}`。提交至导出中心异步生成 Excel，`bizType=REQUIREMENT_SLA`、`bizScene=需求管理-SLA仪表盘`，快照参数含 `productLine` / `bizLine` / `submitSource` / `dateStart` / `dateEnd` / `granularity`（日期转 ISO-8601 字符串，导出中心快照序列化器未注册 `JavaTimeModule`）。

### 6.3 `POST /sla/config/save` 维护 SLA 配置

权限：~~`MENU:RND:REQUIREMENT_SLA`~~ → **`MENU:RND:REQUIREMENT_SLA_CONFIG`** 且为管理员（`MENU:RND:REQUIREMENT_CONFIG`，口径同 §0 备注）

> **实现落地差异（2026-08-19）**：配置类接口改用拆出的 `MENU:RND:REQUIREMENT_SLA_CONFIG`（理由见 §0 差异块）；`save` / `delete` / `status` / `impact` 四个写操作额外要求管理员，`config/list` 只需菜单权限。

Request `SlaConfigSaveReq`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | Long | 否 | 传则更新，不传则新增 |
| `productLine` | String | 是 | `SNACK` / `YDTJ`，🚨 **不支持 `*` 通配** |
| `priority` | String | 是 | `P0` / `P1` / `P2` / `P3` / `*`（`*` = 全优先级兜底） |
| `approvalLevel` | Integer | 是 | 1 / 2 / 3 |
| `remindHours` | Integer | 是 | 1–720 |
| `escalateHours` | Integer | 是 | 1–720，🚨 **必须大于 `remindHours`** |
| `remindWindowHours` | Integer | 否 | 催办去重窗口，默认 24 |
| `status` | Integer | 否 | 1 启用 / 0 停用，默认 1 |
| `remark` | String | 否 | ≤256 |

- 唯一性由 Service 层 `SELECT ... FOR UPDATE` **先查后写**保证（`product_line + priority + approval_level`），🚨 **表上不建 UNIQUE KEY**（软删占槽位红线，见 data-model §8）；冲突返回「该产品线 / 优先级 / 级次已存在配置，请直接编辑」。
- 🚨 **SLA 配置不做快照，改后立即对在途需求生效**（与审批链快照机制相反，business-rule §10.3）：调紧阈值可能让存量在途需求下一轮 Job 立刻进入催办，保存前弹窗提示影响条数。
- 未命中任何启用配置行时走系统默认值 `remind=48h` / `escalate=72h` / `window=24h`，**不报错、不跳过催办**。
- 变更写事件流水 `SLA_CONFIG_CHANGED`（data-model §5），记录改前改后阈值与操作人。
- 配套 `POST /sla/config/list` 返回配置矩阵（字段与本节同构 + `updatedByName` / `updatedAt`），供配置页表格渲染；实际还回该产品线**未被启用配置覆盖的级次提示**（🚨 缺级仅提示不阻断催办，未覆盖级次走系统默认 48/72/24）。
- **配套写操作接口（2026-08-19 新增）**：
  - `POST /sla/config/delete`：Request `{id}`；🚨 **物理删除**（本表无 `deleted_flag` 列），删后该条件组合回落上一级通配或系统默认阈值。
  - `POST /sla/config/status`：Request `{id, status}`；停用后该行不参与阈值匹配，行保留。
  - `POST /sla/config/impact`：Request 同 `SlaConfigSaveReq`；Response `SlaImpactVO`（按新阈值将立即进入催办范围的在途需求条数）；🚨 **只读：不发消息、不写库**，仅供保存前二次确认弹窗。
- **默认矩阵已随 `01_ddl.sql` 初始化 24 行**（2 产品线 × 4 优先级 × 3 级次，`created_by=-1`），新环境无需手工录入。

---

## 7. AI 方案确认 `/api/v1/inner/snackingdom/requirement/ai-plan`

> 规则真源 [business-rule.md](business-rule.md) §11；表结构真源 [data-model.md](data-model.md) §9 `requirement_ai_plan`。
> 🚨 **触达隔离（红线一）的接口层落地**：本章全部接口仅对「当前级次审批人 / 管理员」开放，提交人调用一律 403——AI 生成内容在 PM 确认前不得触达提交人。PM 确认发出的补材文案经 `request-material` 写入 `material_request` 后，才随 `/detail` 对提交人可见。

| 路径 | 用途 | 鉴权 |
|------|------|------|
| `POST /ai-plan/latest` | 查询当前轮最新 AI 方案（详情页面板数据源） | `MENU:RND:REQUIREMENT` 或 `M:RD:REQUIREMENT` + 当前级次审批人 / 管理员 |
| `POST /ai-plan/confirm-approve` | 确认并通过（系统以 PM 身份执行 L3 通过） | 同 §1 `/approve`（当前级次审批人校验） |
| `POST /ai-plan/request-material` | 请求补充材料（PM 确认后通知提交人） | 同上 |
| `POST /ai-plan/regenerate` | 重新生成方案（MANUAL 触发，版本递增） | 同上 |

### 7.1 `POST /ai-plan/latest` 查询最新方案

Request：`requirementId`（必填）

Response `AiPlanVO`：

| 字段 | 说明 |
|------|------|
| `planId` / `status` / `statusName` | `GENERATING` / `READY` / `CONFIRMED` / `OBSOLETED` / `FAILED` |
| `approvalRound` / `planVersion` / `triggerType` | 轮次、版本、触发类型 |
| `pmUserId` / `pmUserName` | 触发时命中的产品经理 |
| `summary` | 三段式确认摘要（Markdown）：业务诉求 / 方案完成内容 / 信息缺口与补充建议 |
| `planDetail` | 方案全文（Markdown，七步框架，business-rule §11.3） |
| `gapItems[]` | 信息缺口清单（字符串数组） |
| `materialRequest` / `materialRequestedAt` | 已发出的补材文案终稿与时间（未发出为空） |
| `aiModel` / `failReason` / `createdAt` | 模型标识 / 失败原因 / 触发时间 |

- 无记录时返回 `data=null`，前端不渲染 AI 方案面板（未开启开关的 PM 进入详情页无感知）。
- 🚨 权限收口：当前登录人不在当前级次审批人快照集合且非管理员时返回 403「仅当前审批人可查看 AI 方案」，**不因需求可见而放宽**（提交人可见需求详情但看不到本面板）。
- `GENERATING` 状态由前端轮询本接口（间隔 5s，页面离开即停），不提供推送通道。

### 7.2 `POST /ai-plan/confirm-approve` 确认并通过

Request：`requirementId` / `planId`（必填）/ `opinion`（必填，10–200 字，AI 预填可改）

- 前置校验与 §1 `/approve` 完全一致：当前登录人必须在当前级次审批人快照集合内（business-rule §4.2）；额外校验 `planId` 属于该需求当前轮次且 `status=READY`，否则返回「方案已失效，请刷新」并附当前需求状态。
- 执行效果 = 一次 L3 通过：状态按 business-rule §2.3 流转，审批流水 `action=APPROVE`、`operator=当前 PM`、`opinion` 自动拼前缀「【AI方案确认】」（🚨 前缀由后端拼接，不信前端传值），写事件 `AI_PLAN_CONFIRMED` 并置 `requirement_ai_plan.status=CONFIRMED`（同一事务）。
- 幂等：重复提交 / 连点返回当前需求状态而非报错（对齐 §1 审批接口幂等）；或签他人已先处理时返回「该需求已由 {审批人} 处理」并强制前端刷新。
- 通过后通知与群消息沿用 §1 `/approve` 既有链路（`REQUIREMENT_APPROVED` 等），不新增 bizKey。

### 7.3 `POST /ai-plan/request-material` 请求补充材料

Request：`requirementId` / `planId`（必填）/ `materialRequest`（必填，10–500 字，以 `gapItems` 预填、PM 编辑后的终稿）

- 校验同 §7.2（当前级次审批人 + `planId` 属当前轮次）。
- 执行：写入 `requirement_ai_plan.material_request` / `material_requested_at`（`status` 保持 `READY`，🚨 **不改需求状态、不改级次、不重置 SLA 计时**），写事件 `MATERIAL_REQUESTED`，向提交人发企微个人消息（`bizKey=REQUIREMENT.MATERIAL_REQUESTED`；**外部单改推邀约人**，对齐 business-rule §6.1 单向收口）。
- 🚨 本接口是 AI 生成内容触达提交人的**唯一出口**，文案必须是 PM 确认后的终稿；后端不校验文案与 `gapItems` 的一致性（PM 可自由编辑）。
- 幂等：同 `planId` 重复提交以最后入参覆盖 `material_request` 文案，但**通知只发一次**（去重键 `MATERIAL_REQUESTED_{requirementId}_{planId}` 落 `requirement_event_log.dedupe_key`）。

### 7.4 `POST /ai-plan/regenerate` 重新生成

Request：`requirementId`（必填）

- 校验：当前级次审批人 + 需求处于 `PM_REVIEWING` + 该 PM 已开启 AI 辅助开关。
- 执行：新建 `trigger_type=MANUAL`、`plan_version=MAX(同轮)+1` 的记录（`GENERATING`）；同轮已有 `GENERATING` 记录时直接返回该记录（幂等，防连点重复触发）。
- 提交人补材后 PM 用本接口形成「补材 → 再分析 → 确认」闭环（business-rule §11.6）；不设次数上限。

---

## 8. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-08-11 | 新建。同步 busyming-skills `f31a9fb5`：产品线四维审批链、外链邀约 3 接口、公开 H5 免登录 3 接口、列表/详情/配置增量字段 |
| 2026-08-11 | 按实现现状回写：删除未实现的 `BTN:REQUIREMENT_LINK:VIEW_ALL`，改为明确「管理员 = 持有审批链配置菜单」口径 |
| 2026-08-18 | 新增 §5 需求附件 4 接口（上传 / 列表 / 下载 / 删除，含公开 H5 同能力接口）与 §6 SLA 3 接口（滞留列表 / 仪表盘 / 配置维护）；补 3 个权限码；原 §5 变更记录顺延为 §7 |
| 2026-08-19 | **按落地实现回写**：附件改前端 OSS STS 直传（`/attachment/upload` → `/attachment/save`，不实现 `/attachment/download`）；内容安全审核本期不做（删 `contentCheckStatus` 相关契约）；`/attachment/list` 权限放宽为两码任一；SLA 菜单权限码拆为 `_SLA` + `_SLA_CONFIG`；SLA 接口由 3 个补齐为 8 个（+`dashboard/export` / `config/delete` / `config/status` / `config/impact`）；`SlaDashboardVO` 补 `currentStaleCount` 与 3 项取数口径修正 |
| 2026-09-09 | **审批链改为提交对象（产品经理）驱动**：`/submit` 新增必填 `pmUserId`；新增 `POST /chain-preview` 预检接口（§1.4）；`/pm-options` 定位改为提交对象候选源（§1.5，**候选集为配置驱动**：专属链 `pm_user_id` ∪ 默认链 L3 审批人并集去重，配置页选人走全员搜索避免循环依赖）；配置接口定位键增 `pmUserId`、`ConfigSaveReq` 增 `approvalLevels`（专属链级次子集 / 默认链 SNACK `[1,2]`、YDTJ `[1,2,3]`）；`/approve` 移除指派 PM 字段（外部单 L3 通过自动写入 `pm_user_id`）；`approvalEntryName` 语义改为链首级次展示名；Detail 增 `pmUserId` / `pmUserName` / `approvalNodes[]` |
| 2026-09-10 | **按落地实现回写（v1.3 实现差异）**：① 详情审批节点不新增扁平 `approvalNodes[]`，沿用既有 `rounds[].nodes[]`（每轮节点按该轮快照 ∪ 流水的实际级次集合渲染 1~3 个，字段不变），双端渲染层零改动；② `/pm-options` 响应为 `{records: [{pmUserId, pmUserName, deptName, hasDedicatedChain}]}`（原数组改包裹结构），请求保留 `bizLine` 但后端不再按其过滤；③ `ApproveReq` 的 `pmUserId/pmUserName` 字段保留不消费（兼容旧端）；④ 内部单 `pm_user_id` 恒为提交对象（专属链 L3 或签由他人代审也不覆盖）；外部单与历史在途单末级通过时写入实际通过人；⑤ SLA 目标日期预警锚定 L2 实施负责人，链上无 L2 时跳过本轮且不占去重键（改推口径待需求方明确） |
| 2026-09-10 | **新增 §7 AI 方案确认 4 接口**（`/ai-plan/latest` / `confirm-approve` / `request-material` / `regenerate`）：产品确认节点 AI 辅助方案确认（business-rule §11），🚨 触达隔离——全部接口仅当前级次审批人 / 管理员可见，AI 内容经 PM 确认后才触达提交人；「确认并通过」复用 `/approve` 校验与通知链路，流水意见带「【AI方案确认】」前缀；补材通知 `bizKey=REQUIREMENT.MATERIAL_REQUESTED`（外部单改推邀约人）；不新增权限码（复用需求菜单码 + 审批人校验）；原 §7 变更记录顺延为 §8 |
| 2026-09-16 | **新增 §1.6 `/card-candidates` 详细契约**：候选集由「未关联卡片」重定义为「全部有效卡片（含已关联，排除 `NON_FEATURE` 与已删除卡）」，支撑同类需求同挂一场景；新增 `devUserName`（开发人，姓名等值匹配，PENDING 卡 NULL 不命中）与 `submitUserId`（需求提交人，`requirement` 同库反查，仅内部单参与）双筛选；响应增 `devUserName` / `linkedReqCount` / `linkedSubmitters`；同挂已关联卡需前端二次确认；不新增权限码 |
| 2026-10-09 | **审批全量切流程中心配套（business-rule §12.1）**：① `/pm-options` 收窄——`productLine` 改必填、`bizLine` 条件必填且恢复过滤，候选集仅「该归属下启用中专属链的 PM」（不再并默认链 L3），`hasDedicatedChain` 恒 true 保留兼容；② `/submit` 内部单不再回退默认链（候选集收窄保证必中专属链），`/rebuild-chain` 同步仅匹配专属链；③ 外部提交落库后以邀约人身份代调 `submit-external` 建流程实例（formData 不携 `pmUserId` 落 YDTJ 默认链，邀约人失效回退自研 + 告警）；④ `/chain-preview` 的 `chainSource=DEFAULT` 仅外部单与防御兜底 |
| 2026-10-10 | **研发落地补充（v1.8 起卡实施回写）**：`ConfigListReq` 响应增 `dedicatedChainCount`——配置页「归属无启用中专属链」红色告警与二级 Tab 红点的数据源（web-ui 配置页告警 ② 的契约补登，功能口径不变）
