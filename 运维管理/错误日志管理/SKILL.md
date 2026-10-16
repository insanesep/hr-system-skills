# Skill: 每日日志异常报表（SLS Error 汇总 + 可视化处理台）

> 归属：研发 / 运维管理
> 类型：需求 skill（产品需求 + 方案约束 + AC）

## 目标

基于已接入的阿里云 SLS（`busyming-sls-spring-boot-starter`）日志，每日凌晨自动扫描**前一天 0:00 ~ 23:59**所有 `level=ERROR` 的日志，按指纹聚合后落库为"每日日志异常报表"。研发可在 Web 端"运维管理 → 日志异常报表"页面：
- 查看每日异常分组、出现次数、首次/最后一次发生时间、TraceId 样例
- 查看完整日志详情、跳转 SLS 控制台
- 标记已处理 / 撤销标记，附备注与处理人
- 导出报表（接入统一导出中心）

## 端声明

仅 **Web 端**（管理后台）。App 端不做。

| 端 | 范围 | 目标用户 |
|---|---|---|
| Web | 运维管理 → 日志异常报表 列表页 + 详情抽屉 + 标记处理弹窗 | 研发、运维、技术负责人 |

### 规范依赖

- 后端：`依赖文档/研发规范/全流程实现编排/`、`依赖文档/研发规范/API规范/`、`依赖文档/研发规范/数据库规范/`
- 定时任务：`busyming-snackingdom-job/`（ScheduleX 自动注册），见记忆「ScheduleX定时任务自动化注册规范设计与落地」
- SLS 查询：`busyming-framework/busyming-spring-boot-starter/busyming-sls-spring-boot-starter/`
- 前端：**强制走 `page-blueprint` v3.4.0**（`busyming-skills/.agents/skills/page-blueprint/`），列表型骨架使用 `skeletons/web/list-page.vue.tpl`
- RBAC：多对多模型，菜单挂在 `运维管理`（一级目录待建） → `日志异常报表`（二级页面）
- 导出：`依赖文档/公共功能/导出接入/`（接入统一导出中心，禁止自起 OSS 上传）

### references 索引

本 skill 主文档仅承载需求/规则/AC，**所有 SQL、查询代码、消息模板等技术细节都在 `references/` 下**：

| 文件 | 作用 |
|---|---|
| [references/ddl.md](references/ddl.md) | 表结构 DDL + 索引 + 重跑字段白名单 |
| [references/fingerprint-normalize.md](references/fingerprint-normalize.md) | 异常指纹归一化正则字典 + 用例 |
| [references/sls-job.md](references/sls-job.md) | SLS 查询规则 + ScheduleX 任务参数 + 流程伪代码 |
| [references/api-spec.md](references/api-spec.md) | 8 个接口的 Request / VO 字段、错误码、操作日志、deeplink 拼接 |
| [references/wecom-alert.md](references/wecom-alert.md) | 企微告警触发条件 + 消息模板 |

### 原型参考

| 文件 | 作用 |
|---|---|
| [assets/web/log-error-report.html](assets/web/log-error-report.html) | Web 后台原型（page-blueprint v3.4.0 list-page 骨架）：KPI 卡 + 筛选 + 工具栏 + 表格 + 详情抽屉 + 标记弹窗，含状态色与按钮权限 code 标注 |

> 原型仅做视觉与交互锚定，**真正实施时**所有组件必须替换为 Arco 真组件（AcCard / AcStatistic / AcFilterBar / AcTable / AcDrawer / AcModal），所有色值/间距/字号必须走 `--ac-*` Token，不允许把原型 HTML 直接复制成 Vue。

## 名词约定

| 名词 | 定义 |
|---|---|
| 异常日志 | SLS 中 `level=ERROR`（含 `FATAL`，按 ERROR 处理）的单条日志记录 |
| 异常分组 | 按指纹聚合后的同源异常，主键为 `日期 + 指纹` |
| 指纹（fingerprint） | `MD5(应用名 + 异常类名 + 异常消息归一化 + 顶层 stackTrace 行)`，用于把"同一类报错"折叠为一条 |
| 报表项 | 落库后的一条聚合记录（`log_error_daily_report` 表），即异常分组的一天快照 |
| 标记已处理 | 研发或运维主动把某条报表项标记为 `RESOLVED`，附 `备注 + 处理人 + 处理时间` |

## 业务流程

**采集链路（系统）**：每日 02:00 ScheduleX 触发任务 → 计算 T-1 时间窗（Asia/Shanghai）→ 分页拉取 SLS ERROR/FATAL 日志 → 计算指纹 → 内存聚合 → 落库（保留处理状态）→ 命中阈值时触发企微告警 → 任务日志写 ScheduleX。详细参数与流程见 [references/sls-job.md](references/sls-job.md)。

**使用链路（研发）**：Web `运维管理 → 日志异常报表` → 顶部统计卡 + 筛选区（日期/应用/状态/关键字）→ 命中行 → 详情抽屉看 traceId 样例 + 原始堆栈 → 跳转 SLS 控制台 deeplink → 修复后回页面"标记已处理"或"忽略"。

## 业务规则

1. **数据来源**：默认 LogStore = `${spring.application.name}-${spring.profiles.active}`（与索引增强保持一致）。多应用/多 LogStore 通过配置 `busyming.log-error-report.logstores: [...]` 列表枚举。
2. **时间窗**：以**日志原始时间戳**（SLS `__time__`）为准，按 `Asia/Shanghai` 时区切日，避免 UTC 跨日截断。任务执行时间晚于窗口结束至少 30min，防 SLS 写入延迟丢数据。
3. **指纹归一化**：
   - 异常消息中的数字、UUID、时间戳、IP、十六进制串统一替换为 `*`
   - 堆栈仅取最顶层非框架行（过滤 `java.*` / `javax.*` / `org.springframework.*` / `com.alibaba.*` 包）
   - 指纹长度固定 32 位（MD5 hex）
4. **聚合维度**：`日期(yyyy-MM-dd) + 应用名 + 指纹` 三元组唯一，**这是落库主键**（业务唯一索引）。
5. **样例字段**：
   - `traceIdSamples`：JSON 数组，最多 5 个 traceId（按出现先后保留前 5）
   - `messageSample`：保留首次原始 message（截断 2000 字符）
   - `stackTraceSample`：保留首次原始 stackTrace（截断 8000 字符）
6. **状态机**：
   ```
   PENDING（默认） ──标记已处理──▶ RESOLVED ──撤销标记──▶ PENDING
   PENDING ──忽略──▶ IGNORED（噪声异常，不再统计告警，但保留记录）
   ```
7. **静默丢数据防控**：SLS 查询失败、解析失败、落库失败均必须打 ERROR 日志 + ScheduleX 任务标记失败；不得 `try { ... } catch (Exception ignored) {}`。见记忆「静默丢数据防控与Job健壮性」。
8. **重跑幂等**：任务支持手动指定日期重跑，落库走 `INSERT ON DUPLICATE KEY UPDATE`，重跑后已处理状态（`RESOLVED` / `IGNORED`）**不被覆盖**——用户标记字段独立列存储，重跑只更新统计字段。
9. **租户隔离**：本功能为运维内部能力，不挂租户字段，统一所有 `system_book_code` 共享。但页面访问受 RBAC 控制（仅"运维管理"菜单可见者可访问）。
10. **保留期**：报表项保留 90 天，第 91 天起每日清理任务自动删除（独立 Job，禁止与采集 Job 串联）。

## 数据模型

核心表 `log_error_daily_report`，字段分三组：

| 维度 | 字段 |
|---|---|
| 业务幂等键（唯一） | `report_date + app_name + fingerprint` |
| 统计快照（重跑可覆盖） | `error_class / error_message / occur_count / first_occur_at / last_occur_at / trace_id_samples / message_sample / stack_trace_sample / log_store` |
| 处理快照（重跑禁覆盖） | `status / resolved_by / resolved_at / resolve_remark` |

建表 SQL、索引列表、ON DUPLICATE KEY UPDATE 字段白名单 → [references/ddl.md](references/ddl.md)。

字段规范遵循「SQL字段定义规范（主键UNSIGNED + 非空默认值 + 审计字段）」。

## 后端实现要点

### 模块归属

| 类型 | 位置 |
|---|---|
| Job | `busyming-snackingdom-job/.../job/logreport/` |
| Service | `busyming-snackingdom-service/.../logreport/` |
| Controller | `busyming-snackingdom-web/.../logreport/` |
| DO / Mapper | `busyming-snackingdom-domain/.../logreport/` |
| VO / Request | `busyming-snackingdom-api/.../logreport/` |

### 定时任务

两个 ScheduleX 任务：
- `logErrorDailyReportJob` —— 每日 02:00 拉取 + 聚合 + 落库（详见 [references/sls-job.md](references/sls-job.md)）
- `logErrorDailyReportCleanJob` —— 每日 02:30 清理 90 天前数据

注册方式遵循「ScheduleX定时任务自动化注册规范设计与落地」，Cron 走 Nacos 配置，禁硬编码。

### 接口与 SLS 查询

8 个接口（统一 POST，Controller 直接返 VO）的字段、错误码、操作日志六要素、SLS deeplink 拼接 → [references/api-spec.md](references/api-spec.md)。

SLS 查询规则、分页与上限保护、流程伪代码、重跑约束 → [references/sls-job.md](references/sls-job.md)。

## 前端实现要点

> **强制约束**：本页面属于「Web 列表型」，**必须**从 `busyming-skills/.agents/skills/page-blueprint/skeletons/web/list-page.vue.tpl` 复制起手，零自由发挥；所有颜色 / 间距 / 字号通过 `var(--ac-*)` Token 取值，禁止裸色值与裸像素。

### 路由与菜单

| 项 | 值 |
|---|---|
| 一级菜单 | `运维管理`（首次新增，需要 RBAC SQL 一并发版） |
| 二级菜单 | `日志异常报表` |
| Path | `/ops/log-error-report` |
| Component | `views/ops/log-error-report/index.vue` |
| functionCode | `OPS_LOG_ERROR_REPORT` |

按钮权限（v-permission 指令绑定）：

| Code | 控件 |
|---|---|
| `OPS_LOG_ERROR_REPORT_RESOLVE` | 行内"标记已处理" / "撤销"按钮 |
| `OPS_LOG_ERROR_REPORT_IGNORE` | 行内"忽略"按钮 |
| `OPS_LOG_ERROR_REPORT_RERUN` | 工具栏"手动重跑"按钮 |
| `OPS_LOG_ERROR_REPORT_EXPORT` | 工具栏"导出"按钮 |

### 页面骨架（page-blueprint v3.4.0 · list-page）

严格遵循 page-blueprint 的「卡片化容器 / 无页面级标题 / 操作下沉表格」原则：

```
Layout（PortalLayout 渲染面包屑：运维管理 / 日志异常报表）
└─ <div class="tpl-page">
   ├─ <AcCard :bordered="false">  ← KPI 卡（顶部统计）
   │    └─ <div class="tpl-kpi-row">
   │         ├─ <AcStatistic title="异常分组数"      :value="stat.totalGroups"     />
   │         ├─ <AcStatistic title="出现总次数"      :value="stat.totalOccurCount" />
   │         ├─ <AcStatistic title="待处理"          :value="stat.pendingCount"    value-style="--ac-biz-pending" />
   │         ├─ <AcStatistic title="已处理"          :value="stat.resolvedCount"   value-style="--ac-biz-completed" />
   │         └─ <AcStatistic title="已忽略"          :value="stat.ignoredCount"    />
   │
   ├─ <AcCard :bordered="false">  ← 筛选 + 表格（同卡，操作下沉）
   │    ├─ <AcFilterBar>           日期 + 应用 + 状态 + 出现次数下限 + 关键字 + [查询/重置]
   │    ├─ <div class="tpl-toolbar">
   │    │     ├─ tpl-toolbar__left  ← 默认留空（仅过程性状态：刷新时间 / 已选 N 项）
   │    │     └─ tpl-toolbar__right ← [手动重跑] [导出] [刷新]
   │    ├─ <AcTable :columns="..." :data="..." row-key="id">
   │    │    <template #empty>
   │    │       <AcEmpty description="昨天没有 ERROR 日志，棒！" />
   │    │    </template>
   │    │    <!-- 自定义列：errorMessage Tooltip 全文、occurCount Link、status AcTag、操作列 -->
   │    ├─ <AcPagination />
   │
   ├─ <AcDrawer> 详情抽屉（点击行触发）
   │    └─ 左：聚合统计 + traceId 样例（Link 跳 SLS）
   │       右：消息样例（AcTypography）+ 折叠堆栈（AcCollapse + 等宽字体）
   │
   └─ <AcModal> 标记弹窗（resolve / ignore 共用，备注必填）
```

### 关键控件 → 白名单组件映射

| 区域 | 组件 | 备注 |
|---|---|---|
| 容器 | `<AcCard :bordered="false">` | 禁止自写 `.tpl-panel`；多 Card 用 `gap` 分隔 |
| 顶部 KPI | `<AcStatistic>` | **数值统计必走 AcStatistic**（page-blueprint v2.5.4 硬约束），禁止自拼 div |
| 筛选 | `<AcFilterBar>` + `<AcDatePicker>` + `<AcSelect>` + `<AcInputNumber>` + `<AcInput>` | 禁原生 `<input>` `<select>` |
| 工具栏 | `class="tpl-toolbar"` + `__left` / `__right` 三层结构 | 即使 `__left` 暂无内容也要保留空容器（lint C4） |
| 表格 | `<AcTable>` | 必带 `#empty` 插槽 + 场景化文案（lint C2 块级） |
| 表格列 - 状态 | `<AcTag>` | `PENDING`→`--ac-biz-pending`、`RESOLVED`→`--ac-biz-completed`、`IGNORED`→`--ac-text-3` |
| 表格列 - 出现次数 | `<AcLink>` + `<AcTooltip>` | hover 显示 traceId 样例 |
| 表格列 - 异常消息 | `<AcTypography.Paragraph :ellipsis>` | 截断 + Tooltip 全文 |
| 行操作 | `<AcButton type="text">` + `v-permission` | 标记已处理 / 忽略 / 跳 SLS / 详情 |
| 详情 | `<AcDrawer>` 而非 `<AcModal>` | 信息密度高、需要折叠堆栈 |
| 标记/忽略 | `<AcModal>` + `<AcTextarea>` | 备注必填 ≤500 字符 |
| 时间显示 | `<AcDateTime>` | 统一格式 `yyyy-MM-dd HH:mm:ss` |

### 列表列定义

| 列 | 字段 | 宽度 | 说明 |
|---|---|---|---|
| 日期 | `reportDate` | 110 | 默认按此排序倒序 |
| 应用 | `appName` | 140 | AcTag 灰底 |
| 异常类 | `errorClass` | 220 | 等宽字体 `var(--ac-ff-mono)`、Tooltip 全名 |
| 异常消息 | `errorMessage` | 自适应 | Paragraph ellipsis + Tooltip |
| 出现次数 | `occurCount` | 100 | 右对齐、Link、hover Popover 显示 traceId 样例 |
| 首次/最后 | `firstOccurAt / lastOccurAt` | 320 | 一列双行展示 |
| 状态 | `status` | 100 | AcTag |
| 处理人 | `resolvedBy` | 110 | 空值显 `—` |
| 处理时间 | `resolvedAt` | 160 | |
| 操作 | — | 200 | v-permission 控制可见 |

表格列宽支持拖拽（`AcTable column-resizable`，复用「AcTable列宽拖拽通用能力」）。

### 状态色映射

| 状态 | Token | 说明 |
|---|---|---|
| PENDING | `--ac-biz-pending` | 黄/橙系，警示但非错误 |
| RESOLVED | `--ac-biz-completed` | 绿系，正向完成 |
| IGNORED | `--ac-text-3` | 中性灰，弱化呈现 |

禁止使用品牌红 `--ac-brand-red` 作为状态色。

### 交互细节

1. **默认筛选**：进入页面默认 `reportDate=T-1`、`status=PENDING`，按 `occurCount` 倒序
2. **行点击**：点击行任意位置打开 `AcDrawer` 详情；操作列按钮单独 stop propagation
3. **标记已处理 / 忽略**：触发 `AcModal`，备注必填校验通过后调接口，成功后 `Message.success` + 刷新当前页
4. **撤销标记**：参照「删除操作必须强约束弹窗确认」，`AcModal.confirm` 二次确认后调用 `unresolve`
5. **手动重跑**：`AcModal` 选择 `reportDate`（最长 90 天），二次确认后调接口；提示"任务已提交，结果约 N 分钟后刷新"
6. **导出**：调 `/export` 后 `Notification.info` 提示"导出任务已提交，请到消息中心查看"，复用统一导出中心
7. **空态**：`AcEmpty` 描述根据筛选场景化（如"昨天没有 ERROR 日志，棒！" / "该筛选条件下无数据"）
8. **加载态**：`AcTable :loading`；筛选切换 / 翻页时显示骨架
9. **错误态**：网络异常时 `AcResult status="error"` 占位 + 重试按钮

### Pre/Post-flight 检查

开发完成后必须通过 `page-blueprint` 的 lint 脚本（业务仓 `npm run lint:page`）：

- C2：每个 AcTable 必须有 `#empty` 插槽
- C4：必须使用 `.tpl-toolbar` + `__left` / `__right` 三层结构
- C5：`__left` 不得填充总数计数 / 业务标题前缀
- 禁止 `<input>` `<table>` `<select>` `<button>` `<dialog>` 等原生标签
- 禁止裸 `#xxx` / `rgb()` / `16px` / `14px`
- 禁止页面级标题 `<AcPageHeader>` / `<h1>` / `<h2 class="tpl-panel__title">`

## 通知集成（可选，灰度后开启）

触发条件、消息模板、字段约束、失败兜底 → [references/wecom-alert.md](references/wecom-alert.md)。

复用「创建企微应用消息发送公共skill」的发送能力。

## RBAC 权限 SQL

发版 SQL 同步包含：
- 一级菜单：`运维管理`（parent_id 取一级菜单根）
- 二级菜单：`日志异常报表`
- 4 个按钮权限：RESOLVE / IGNORE / RERUN / EXPORT
- 默认授给"超级管理员"和"研发主管"角色，其它角色按需开启

挂载位置与 SQL 编写遵循「RBAC权限SQL编写规范」记忆。

## AC 验收清单

### 技术冒烟
- [ ] 凌晨 02:00 任务自动触发，日志显示拉取条数 + 聚合分组数 + 落库行数
- [ ] 手动指定 `reportDate` 重跑，状态字段不被覆盖
- [ ] SLS 查询失败时任务失败重试，ScheduleX 控制台可见
- [ ] 90 天清理任务可独立触发并真实删除数据

### 业务验收（按角色）

研发负责人：
- [ ] 进入"运维管理 → 日志异常报表"，默认看到昨天的待处理列表
- [ ] 顶部统计卡数字与列表 PENDING 行数一致
- [ ] 点击异常分组进入详情抽屉，能看到 traceId 样例 + 原始堆栈
- [ ] 点击 SLS deeplink 能跳到 SLS 控制台并自动定位到对应日志
- [ ] 标记已处理后，列表行状态变 RESOLVED，处理人=当前登录用户、处理时间=now
- [ ] 撤销标记后回到 PENDING
- [ ] 导出 Excel 后到消息中心看到任务，下载内容与列表筛选一致

运维管理员：
- [ ] 能看到"手动重跑"按钮，重跑成功后刷新列表
- [ ] 能看到"忽略"按钮，IGNORED 后不再进入待处理筛选

无权限角色：
- [ ] 菜单不可见
- [ ] 直接访问 `/ops/log-error-report` 走 403

### 跨端联动
- App 端不展示该菜单（菜单类型仅 WEB）

### 可观测性
- [ ] 任务每次执行写入 ScheduleX 日志（拉取条数 / 聚合数 / 落库数 / 耗时）
- [ ] 操作日志覆盖 RESOLVE / UNRESOLVE / IGNORE / RERUN

## 风险与边界

| 风险 | 控制措施 |
|---|---|
| 单日 ERROR 日志爆量（百万级）拖垮 Job | 单 LogStore 单日 100K 条上限保护；超限只取前 100K 并告警，后续按需引入 SLS SQL 聚合 |
| 指纹归一化漏掉变量字段 → 同源被拆成多组 | 在 `references/fingerprint-normalize.md`（待补）维护正则字典；每次新增正则要回归测试 |
| SLS 写入延迟导致 02:00 任务漏数据 | 任务时间晚于 T-1 结束至少 2 小时；保护性"次日 04:00 增量补跑"任务可后置规划 |
| 状态字段被重跑覆盖 | DDL 业务唯一键 + Mapper 用 ON DUPLICATE KEY UPDATE 时仅更新统计字段，明确 SET 列名 |
| 操作日志六要素缺失 | Code Review 时强制核对 |
| 历史 SLS 没有结构化堆栈字段 | 首期接受 `messageSample` 兼容；后续推进各服务统一日志格式 |

## 反模式

- ❌ 直接在 Controller 里循环调 SLS（必须由 Job 落库后查 DB）
- ❌ 把状态字段写进唯一键（导致重跑覆盖处理状态）
- ❌ `try { ... } catch (Exception ignored) {}` 吞 SLS / DB 异常
- ❌ 自起 OSS 上传导出文件（必须接统一导出中心）
- ❌ 在 SKILL 主文档塞具体 SQL / 代码片段（必须沉淀到 `references/`）
- ❌ 前端使用裸 `<input>` `<table>` `<button>` 或裸色值 `#xxx` / 裸像素 `16px`
- ❌ 前端业务页加 `<AcPageHeader>` 作为页面级大标题（面包屑由 Layout 统一渲染）
- ❌ AcTable 不写 `#empty` 插槽走默认 "No Data" 文案
- ❌ 用 `xxx-page__toolbar` 自定义 BEM 类替代 `.tpl-toolbar` 三层结构

## 三态迁移

完成开发并上线后，本目录从 `研发/运维管理/日志异常报表/` 迁移到 `上线/.../日志异常报表/`，并按 `req-sync-spec` 同步发版部署文档（`docs/{yyyyMMdd}/log-error-daily-report/README.md`）。
