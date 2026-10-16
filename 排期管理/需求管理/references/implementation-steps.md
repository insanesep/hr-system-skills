---
name: requirement-management-implementation-steps
description: 需求管理 - 实现步骤与文件清单：devops 服务七模块、Vue 管理后台、公开 H5、React Native App 的落地路径、改造顺序与验证方式
type: reference
---

# 需求管理 · 实现步骤与文件清单

> 接口契约见 [api-spec.md](api-spec.md)，Job 见 [job-schedule.md](job-schedule.md)，规则真源见 [business-rule.md](business-rule.md)。
> 🚨 本文只描述**设计意图与落点**，不写具体代码（代码是唯一事实来源）。

---

## 0. 归属与坐标

| 项 | 值 |
|----|----|
| 后端服务 | `busyming-snackingdom-devops`（Context Path `/snackingdom-devops`） |
| 根包 | `io.busyming.innovation.snackingdom.devops` |
| 数据源 | `snackingdomDataSource`（`mall_common`），事务管理器 `snackingdomTransactionManager` |
| Web 管理后台 | `busyming-snackingdom-web`（Vue 3 + Vite + TS） |
| App | `busyming-snackingdom-app`（React Native 0.73） |
| 编译口径 | JDK 8（父 POM source/target 1.8） |

> 出向依赖零新增：验证码本地 `java.awt` 绘制、限流走既有 Redis、二维码由前端生成，未引入任何新第三方依赖，不破 devops「仅依赖 foundation -api」红线。

---

## 1. 阶段 0：数据库与配置

| 脚本（`busyming-snackingdom/docs/`） | 内容 |
|------|------|
| `requirement_management_public_link.sql` | `requirement` 增 6 列 + 3 索引；`requirement_approval_config` 增 `product_line`；`requirement_event_log` 增 3 列；新建 `requirement_public_link` 表；存量数据回填 |
| `requirement_management_public_link_rbac.sql` | `MENU:RND:REQUIREMENT_LINK` 菜单 + 3 个按钮权限码 |
| `requirement_management_public_link_wecom_template.sql` | `REQUIREMENT.EXTERNAL_RESULT`（结果通知邀约人）/ `REQUIREMENT.LINK_FAILED`（提交失败告警）两套企微模板 |

DDL 红线执行情况：

- 主键 `BIGINT UNSIGNED`，全字段带 `DEFAULT` 与 `COMMENT`
- 🚨 **不建业务唯一索引**（含 `UNIQUE KEY (..., deleted_flag)` 组合），`link_token` 用普通 `KEY`；唯一性靠 32 位随机 token + 应用层「先查后写」
- 存量回填：`product_line='SNACK'`、`submit_source='INTERNAL'`

配置（`starter/src/main/resources/nacos-config.yml`，实际生效需在 Nacos 建同名配置）：

- `auth.whitelist.paths` 追加 `/api/v1/public/requirement/**`
- 新增 `app.requirement.public-link-base-url`（外链域名前缀，映射到 `AppConfig.requirementPublicLinkBaseUrl`）

---

## 2. 阶段 1：devops 后端

### 2.1 `-domain`

| 文件 | 改动 |
|------|------|
| `entity/RequirementDO` | 增 `productLine` / `submitSource` / `externalSubmitterName` / `externalSubmitterDept` / `externalSubmitterContact` / `publicLinkId` |
| `entity/RequirementApprovalConfigDO` | 增 `productLine` |
| `entity/RequirementEventLogDO` | 增 `publicLinkId` / `sourceIp` / `userAgent` |
| `entity/RequirementPublicLinkDO`（新） | 外链主体：token、产品线/业务线、默认类型与优先级、邀约备注、提交上限与计数、访问计数、首访/末提交时间、过期时间与有效天数、状态、撤销三要素、生成人姓名 |
| `mapper/RequirementPublicLinkMapper`（新）+ XML | `selectByTokenForUpdate`（🚨 `FOR UPDATE` 行锁）、`countSubmittedLink`、`countGeneratedLink` |
| `mapper/RequirementApprovalLogMapper` + XML | 统计方法签名增 `productLine` / `submitSource` |
| `query/RequirementQuery` | 增 `productLine` / `submitSource` / `visibleProductLines` / `inviterUserId` |
| `mapper/snackingdom/RequirementMapper.xml` | resultMap 与列清单增字段；`conditionWhere` 增 `EXTERNAL` Tab、产品线 / 来源筛选、提交人关键词兼容外部姓名、可见范围（产品线集合 + 邀约人） |

### 2.2 `-api`

| 文件 | 内容 |
|------|------|
| `enums/RequirementProductLineEnum`（新） | `SNACK` / `YDTJ`，含 `isBizLineWildcard()` / `supportPublicLink()` / `normalizeBizLine()` |
| `enums/RequirementSubmitSourceEnum`（新） | `INTERNAL` / `EXTERNAL` |
| `enums/RequirementPublicLinkStatusEnum`（新） | `GENERATED` / `USED` / `EXPIRED` / `REVOKED` |
| `enums/RequirementPublicLinkFailReasonEnum`（新） | `USED` / `EXPIRED` / `REVOKED` / `INVALID` |
| `constant/RequirementConstants` | 外部描述下限 20 字、手机号正则、`EXTERNAL` Tab、两个企微 bizKey、token 长度与正则、提交上限区间、有效天数选项、公开页路径、验证码 TTL 与失败上限、IP 限流阈值、6 个事件类型常量 |
| `request/requirement/RequirementRequest` | `SaveReq` / `PageReq` / `Config*Req` / `StatReq` 全部增 `productLine`；新增 `PublicLinkCreateReq` / `PublicLinkPageReq` / `PublicLinkRevokeReq` |
| `request/requirement/RequirementPublicRequest`（新） | `TokenReq` / `ExternalSubmitReq`（javax.validation 全量校验） |
| `response/requirement/*` | Row / Detail（内含 `ExternalSubmitInfo`）/ ConfigRow / ConfigList / Stat（内含 `PublicLinkStat`）/ Submit 扩字段；新增 `RequirementPublicLinkRowVO`（内含 `LinkedRequirement`）/ `PublicLinkPageVO` / `PublicLinkCreateVO` / `PublicTokenVO` / `PublicCaptchaVO` / `PublicSubmitVO` |

> 🚨 `-api` 契约**只增不改**，未修改任何既有字段语义与路径。

### 2.3 `-service`

| 文件 | 改动要点 |
|------|---------|
| `RequirementConfigService(Impl)` | 匹配签名升四维 `matchChain(productLine, bizLine, type, priority)`；群 webhook 按产品线+业务线定位；CRUD 定位键改四元组；新增产品线/业务线归一与 `approvalEntryName()` |
| `RequirementServiceImpl` | save/submit 写 `productLine` + `submitSource=INTERNAL`；🚨 `assertInternalSubmitSource()` 拦截外部单的编辑 / 重提 / 撤回 / 删除；查询组装产品线与来源；行 / 详情回填外部字段与 `externalSubmitInfo` |
| `RequirementApprovalServiceImpl` | 审批链重建与快照按四维；🚨 外部单短路自动跳过（无内部提交人主体）；外部单不下发 `mine` 类动作 |
| `RequirementNotifyServiceImpl` | 外部单通过 / 驳回 / 关联卡片改推**邀约人**（`REQUIREMENT.EXTERNAL_RESULT`）；新增外链提交失败告警（`REQUIREMENT.LINK_FAILED`） |
| `RequirementGroupNotifier` | 群通知文案区分外部单（带邀约人） |
| `RequirementPermissionHelper` | 产品线维度可见范围（BU 负责人 / PM 各自配置行的产品线集合）+ 邀约人可见自己邀约的外部单 |
| `RequirementLogWriter` | 新增 `writeLinkEvent(...)`：带 `publicLinkId` / `sourceIp` / `userAgent`，🚨 不依赖 `LoginContext`（公开链路无登录态） |
| `RequirementStatServiceImpl` | 统计四维 + 外链维度统计块 |
| `RequirementCaptchaService`（新） | `java.awt` 绘制 4 位验证码 + Redis 存答案（key 按 token，TTL 300s、一次性消费、连错 3 次强刷） |
| `RequirementPublicRateLimiter`（新） | Redis 分钟窗口 IP 限流；🚨 Redis 异常时**放行**，不让基础设施故障挡正常提交 |
| `RequirementPublicLinkService(Impl)`（新） | create / page / revoke / resolveToken / requireSubmittable；`resolveRealStatus()` 按 `expire_at` 实时判定 |
| `RequirementPublicSubmitService(Impl)`（新） | 编排：限流 → 验证码 → 事务体 → 通知；捕获不可用异常后告警邀约人 |
| `RequirementExternalSubmitTx`（新） | 🚨 **独立 Bean**：行锁 + 计数 + 建需求 + 建快照 + 流水 + 事件（避免 `@Transactional` 自调用不生效） |
| `RequirementPublicLinkExpireService(Impl)`（新） | Job 兜底刷 `EXPIRED` |
| `config/AppConfig` | 增 `requirementPublicLinkBaseUrl` |

### 2.4 `-web` / `-job`

| 文件 | 内容 |
|------|------|
| `controller/RequirementPublicLinkController`（新） | `/api/v1/inner/snackingdom/requirement/public-link` create / page / revoke，三个权限码校验 |
| `controller/PublicRequirementController`（新） | `/api/v1/public/requirement` token / captcha / submit；含真实 IP 解析（`X-Forwarded-For` 等多级代理） |
| `job/RequirementPublicLinkExpireJob`（新） | 见 [job-schedule.md](job-schedule.md) |

### 2.5 后端验证

无 `mvn` CLI 环境时用 `javac` + JDK 8（Corretto 1.8.0_502）全模块显式源文件列表编译验证（本次 334 个源文件通过）。要点：

- 🚨 必须**全量源文件显式入列**，不能只靠 `-sourcepath` 隐式编译，否则 Lombok 注解处理器不执行，getter/setter 全报「找不到符号」
- 🚨 classpath 需排除 JDK 11+ 字节码 jar（如 `mybatis-plus-jsqlparser 3.5.12`、`HikariCP 6.x`），保留 major 52 的等价件

---

## 3. 阶段 2：Vue 管理后台

| 文件 | 改动 |
|------|------|
| `src/api/requirement.ts` | 产品线 / 提交来源 / 外链状态类型与色映射 META、外链与公开三接口函数、新增权限码常量 |
| `src/views/requirement/RequirementList.vue` | 「外部提交」视角 Tab（按权限显隐）、产品线与提交来源筛选、产品线列、提交人列兼容外部姓名、外部单不渲染行操作 |
| `src/views/requirement/RequirementEdit.vue` | 产品线 Select + 业务线条件显隐；提交后两者只读 |
| `src/views/requirement/RequirementDetail.vue` | 产品线标签、外部提交信息区块、动作过滤、跳外链台账并高亮 |
| `src/views/requirement/RequirementConfig.vue` | 两级 Tab（产品线 → 业务线）+ URL query 同步 + 缺级映射兜底 |
| `src/views/requirement/components/ConfigEditModal.vue` | 归属只读区（产品线 / 业务线） |
| `src/views/requirement/RequirementPublicLink.vue`（新） | 外链台账：筛选 + 列表 + 生成弹窗两态（表单态 / 结果态）+ `qrcode` 本地二维码 + 复制链接 + 撤销 |
| `src/views/public/requirement/PublicRequirementSubmit.vue`（新） | 公开 H5 容器：token 校验分流（骨架 / 错误态 / 表单 / 结果）+ 验证码 + 预览确认 + 错误分流 |
| `src/views/public/requirement/PublicRequirementResult.vue`（新） | 终点页五形态（成功 / 已提交 / 已过期 / 已撤销 / 无效） |
| `src/router/index.ts` | `/public/requirement`（BlankLayout + `requiresAuth: false`）+ `/portal/requirement/public-link` 菜单路由 |

验证：`npm run type-check`（`vue-tsc --noEmit`）零报错。

---

## 4. 阶段 3：React Native App

App 端仅做**展示与审批**增量，不提供外链能力（[mobile-ui.md](mobile-ui.md) 边界）。

| 文件 | 改动 |
|------|------|
| `src/api/requirement.ts` | 产品线 / 提交来源类型、Row / Detail / Submit / Save / Page 扩字段、产品线与外部来源色值、产品线选项与名称映射、`RequirementExternalSubmitInfoVO` |
| `src/pages/requirement/components/RequirementTags.tsx` | 新增 `ProductPill`（产品线两色药丸）、`ExternalTag`（橙色外部提交标签） |
| `src/pages/requirement/RequirementListScreen.tsx` | 卡片增外部提交标签与产品线药丸；`YDTJ` 不渲染业务线药丸；待我审批 Tab 外部单提交人取手填姓名 + 部门灰字 |
| `src/pages/requirement/RequirementDetailScreen.tsx` | 状态行外部标签、产品线药丸、外部提交信息卡（手机号长按复制 / 点击拨号）、驳回条追加终态说明、外部单不渲染重提与撤回、驳回文案不提「通知提交人」 |
| `src/pages/requirement/RequirementCreateScreen.tsx` | 产品线 Picker（默认零食王国、重提只读）、业务线条件隐藏且不参与校验、确认与成功文案改审批入口名 |

验证：`npx tsc --noEmit` 中需求相关报错为 0；`npx eslint src/pages/requirement` 仅存量 inline-style 警告。

---

## 5. 上线顺序

1. 执行 DDL 脚本（`requirement_management_public_link.sql`）→ RBAC 脚本 → 企微模板脚本
2. Nacos 更新 `busyming-snackingdom-devops.yml`：白名单 + `app.requirement.public-link-base-url`
3. 发布 devops 服务（含新 Job；SchedulerX 侧确认单体无同名 Job 注册）
4. 发布 Vue 管理后台（公开 H5 路由随主站一起，需确认网关放行 `/public/**` 与 `/api/v1/public/**`）
5. 发布 App（可延后，产品线与外部单展示为纯增量，旧版本不崩）

---

## 6. 附件与 SLA（2026-08-19，skill commit `4d9556fe`）

> 本节为**增量交付**：附件上传（business-rule §9）+ 审批 SLA 时效管理（business-rule §10）。
> 上面 §1–§5 为 2026-08-11 外链交付的存量内容，**未变**。
> SQL 与部署说明真源：`busyming-snackingdom-devops/docs/20260819/liucao/requirement-attachment-sla/`

### 6.1 SQL（`devops/docs/20260819/liucao/requirement-attachment-sla/`，4 个文件）

| 文件 | 内容 |
|------|------|
| `01_ddl.sql` | 新建 `requirement_attachment` + `requirement_sla_config`；24 行默认 SLA 矩阵（2 产品线 × 4 优先级 × 3 级次）；`requirement_event_log.event_type` 列注释补 7 个新事件类型（声明式 `MODIFY COLUMN`，可重跑）|
| `02_rbac.sql` | 2 个附件按钮（`BTN:REQUIREMENT:ATTACH_UPLOAD` / `_DELETE`）+ 2 个 SLA 菜单（`MENU:RND:REQUIREMENT_SLA` / `_SLA_CONFIG`，sort 9 / 10）+ 继承授权 |
| `03_wecom_template.sql` | 4 套企微 `textcard` 个人消息模板：追加附件 / 催办 / 升级 / 目标日预警 |
| `README.md` | 部署说明：权限点、Nacos、SchedulerX、双跑红线、**与需求文档差异清单 11 条**、排查线索 |

🚨 两张新表均**不建任何业务唯一索引**（含 `UNIQUE KEY (..., deleted_flag)` 组合）；`requirement_sla_config` 定位三元组唯一性由 Service 层「`SELECT ... FOR UPDATE` 先查后写」保证。

### 6.2 后端 `busyming-snackingdom-devops`（新增 37 / 改动 12）

**附件（新增 11）**

| 模块 | 文件 |
|------|------|
| `-api` | `request/requirement/RequirementAttachmentRequest`（`SaveReq` / `ListReq` / `DeleteReq` / `AttachmentMeta`）、`response/requirement/RequirementAttachmentVO` / `RequirementAttachmentListVO` / `RequirementPublicAttachmentVO` |
| `-domain` | `entity/RequirementAttachmentDO`、`mapper/RequirementAttachmentMapper` + `resources/mapper/snackingdom/RequirementAttachmentMapper.xml` |
| `-service` | `RequirementAttachmentService` + `impl/RequirementAttachmentServiceImpl`、`RequirementAttachmentWriter`（🚨 写入与全量同步收口，`softDelete` **只逻辑删除不清 OSS**）|
| `-web` | `controller/RequirementAttachmentController`：`POST /attachment/save` / `/list` / `/delete`（🚨 **无 `upload` 端点** —— 前端 OSS 直传，后端只收元信息）|

**SLA（新增 26）**

| 模块 | 文件 |
|------|------|
| `-api`（8）| `request/requirement/RequirementSlaRequest`（`SlaStaleReq` / `ManualRemindReq` / `SlaDashboardReq`（含 `submitSource`）/ `SlaConfig*Req`）、`response/requirement/SlaStaleRowVO` / `SlaStalePageVO` / `SlaManualRemindVO` / `SlaDashboardVO`（含第 4 张卡 `currentStaleCount`，`overtimeRate` 为百分数文本）/ `SlaConfigRowVO` / `SlaConfigListVO` / `SlaImpactVO` |
| `-domain`（5）| `entity/RequirementSlaConfigDO`、`mapper/RequirementSlaMapper` + `resources/mapper/snackingdom/RequirementSlaMapper.xml`、`query/RequirementSlaQuery`、`dto/RequirementSlaStaleDTO` |
| `-service`（11）| `RequirementSlaService` + `impl/`（滞留列表 / 仪表盘 / 手动催办）、`RequirementSlaConfigService` + `impl/`（🚨 行锁先查后写）、`RequirementSlaRemindService` + `impl/`（Job 主体）、`RequirementSlaNotifier`、`RequirementSlaSupport`（阈值匹配 / 去重键）、`RequirementSlaRemindSummary`、`RequirementLeaderResolver`（升级取上级，取不到降级）、`export/RequirementSlaExportProducer` |
| `-job`（1）| `RequirementSlaRemindJob`（每小时整点，一个 Job 承担催办 + 升级 + 目标日预警）|
| `-web`（1）| `controller/RequirementSlaController`：🚨 **实际 9 个接口** `/stale-list` `/manual-remind` `/dashboard` `/dashboard/export` `/config/list` `/config/save` `/config/delete` `/config/status` `/config/impact` |

**改动（12）**

| 文件 | 改动要点 |
|------|---------|
| `-api` `constant/RequirementConstants` | 7 个新事件类型常量、附件类型 / 大小 / 张数白名单（按端差异化）、SLA 默认阈值与静默时段、四个企微 bizKey |
| `-api` `request/requirement/RequirementRequest` | `SaveReq` 增 `attachments`（🚨 **全量快照**语义）|
| `-api` `request/requirement/RequirementPublicRequest` | `ExternalSubmitReq` 增 `attachments`（H5 受限图片）|
| `-api` `response/requirement/RequirementDetailVO` / `RequirementRowVO` | 详情回 `attachments`；行回附件计数与 SLA 滞留标识 |
| `-service` `RequirementNotifyService` + `impl/` | 新增附件追加通知（bizKey `REQUIREMENT.ATTACHMENT_APPENDED`）推当前级次审批人 |
| `-service` `impl/RequirementServiceImpl` | save / submit 走附件全量同步；详情与行组装附件 |
| `-service` `RequirementPublicSubmitService` + `impl/`、`impl/RequirementExternalSubmitTx` | 外部单附件同事务写入，🚨 **单张不合规只跳过该图不阻断提交** |
| `-web` `controller/PublicRequirementController` | H5 附件上传（🚨 **全模块唯一 `MultipartFile` 入口**，免登录拿不到 STS）|

### 6.3 Vue 管理后台 `busyming-snackingdom-web`（新增 7 / 改动 6）

| 文件 | 内容 |
|------|------|
| `views/requirement/components/AttachmentPanel.vue`（新）| 附件区块：分类展示、审批中追加角标、删除按钮权限与状态双控 |
| `views/requirement/components/AttachmentUploader.vue`（新）| 上传器：STS 直传 + 进度 + 类型 / 大小 / 张数前置校 |
| `views/requirement/components/AttachmentLightbox.vue`（新）| 图片 / 视频预览灯箱 |
| `views/requirement/components/attachment-upload.ts`（新）| 上传编排与元信息组装（与 `utils/ossUpload.ts` 对接）|
| `views/requirement/RequirementSlaConfig.vue`（新）| SLA 配置页（🚨 与审批链配置**同级菜单，不合并为 Tab**；非管理员只读）|
| `views/requirement/components/SlaConfigEditModal.vue`（新）| 阈值编辑弹窗（`escalate > remind`、1–720 整数双校 + 影响面预检）|
| `views/requirement/RequirementSlaDashboard.vue`（新）| SLA 仪表盘：**4 张指标卡**（含实时 `currentStaleCount`）+ 趋势 + 异步导出 |
| `views/requirement/RequirementDetail.vue` / `RequirementEdit.vue` / `RequirementList.vue`（改）| 详情与编辑挂附件区块；列表新增「滞留需求」Tab（🚨 Tab 而非独立页，无独立菜单码）|
| `api/requirement.ts`（改）| 附件与 SLA 全部接口函数、类型与新权限码常量 |
| `router/index.ts`（改）| `/portal/requirement/sla-dashboard` + `/sla-config` 两条菜单路由 |
| `utils/ossUpload.ts`（改）| `keyToUrl` 签名预览（🚨 **前端自签，`expires: 3600` = 1 小时**，缓存提前 5 分钟失效）|

### 6.4 App `busyming-snackingdom-app`（新增 4 / 改动 7）

App 端附件能力**仅图片**（mobile-ui.md 边界），不提供 SLA 配置与仪表盘。

| 文件 | 内容 |
|------|------|
| `pages/requirement/components/requirementAttachmentKit.ts`（新）| 附件工具：选图 / 压缩 / 元信息组装 / 类型与张数校验 |
| `pages/requirement/components/RequirementImageViewer.tsx`（新）| 全屏图片查看器 |
| `pages/requirement/components/RequirementAttachmentBlock.tsx`（新）| 详情页附件展示区块 |
| `pages/requirement/components/RequirementImagePickerGrid.tsx`（新）| 创建 / 追加时的九宫选图格 |
| `api/requirement.ts`（改）| 附件类型与接口（`attachment/save` / `list` / `delete`）|
| `pages/requirement/RequirementDetailScreen.tsx` / `RequirementCreateScreen.tsx`（改）| 详情展示与审批中追加；创建页选图上传 |
| `routers/index.tsx`（改）| 图片查看器路由注册 |
| `utils/ossUpload.ts`（改）| App 侧 STS 直传与签名预览 |
| `android/app/src/main/AndroidManifest.xml`（改）| 🚨 **新增相机 / 读写媒体权限** —— 必须重新出包，JS 热更不生效 |
| `ios/Snackingdom/Info.plist`（改）| 🚨 新增相机 / 相册用途描述（缺失会被 App Store 打回且运行时直接崩）；**未引入新原生依赖，不需要 `pod install`** |

### 6.5 上线顺序（🚨 严格按序）

1. **SQL**：`01_ddl.sql` → `02_rbac.sql` → `03_wecom_template.sql`
   （前置：20260811 的 `01_ddl.sql` 必须已执行 —— SLA 匹配依赖 `requirement.product_line`）
2. **Nacos 配置**：`spring.servlet.multipart` 上限（`max-file-size: 10MB` / `max-request-size: 20MB`）
   —— 只为公开 H5 的 `MultipartFile` 转存而配；Web / App 走直传**不经后端**，故不按 200MB 配
3. **发布 devops 服务**
4. **SchedulerX 注册** `需求审批SLA催办-RequirementSlaRemindJob`（`0 0 * * * ?`、standalone、并发 1、`maxAttempt=0`）
   🚨 **注册前必须在控制台确认无同名 / 同职责 Job 双跑** —— 去重键在 DB 层无唯一约束兜底（软删红线），双跑时两个事务各过一次 `NOT EXISTS` 检查均判定「未催过」，**审批人会收到两条完全相同的催办**，数据库拦不住
5. **发布 Vue 前端**
6. **App 重新构建出包**：🚨 新增 Android 权限，**JS 热更不生效**；iOS `Info.plist` 变更；**不需要 `pod install`**（未引入新原生依赖）

---

## 7. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-08-11 | 新建。同步 busyming-skills `f31a9fb5` 全量实现落点 |
| 2026-08-19 | 增补 §6「附件与 SLA」（skill commit `4d9556fe`）：devops 新增 37 / 改动 12、Vue 新增 7 / 改动 6、App 新增 4 / 改动 7、SQL 4 个文件，含六步上线顺序 |
