# Web 端 UI 描述 · 项目进度报告

> 归档、齐全度、触发、版本、渲染与权限规则以 [报告配置 · 业务规则](../../报告配置/references/business-rule.md) 为真源；报告正文章节以 [progress-report.md · 章节规范](progress-report.md#章节规范) 为真源。
> 报告范围只读引用 [报告配置 · 业务规则](../../报告配置/references/business-rule.md#3-报告项目配置) 的全部启用项目组；新报告仅使用 `_all`，列表每周期一条，详情按项目组分组展示。
> 手动补传的通用字段、文件名识别与入库反馈以 [报告配置 · 手动补传弹窗](../../报告配置/references/web-ui.md#手动补传弹窗报告模块共用) 为真源，本文只声明本模块差异。

---

## 页面清单

<a id="report-list"></a>
### 报告列表

- **页面路径**：`/report/project-progress`
- **权限编码**：
  - 菜单：`devhubProjectProgressReport`
  - 按钮：`devhubReportUpload`（手动补传）、`devhubReportTrigger`（立即生成）
- **页面类型**：列表页（按周索引，每周期一份）
- **区块职责**：
  - 筛选卡：发报日期范围（默认近 90 天）、关键词（报告标题模糊查询，回车执行）；查询 / 重置。不提供项目组筛选，项目组只在报告详情内查看。
  - 结果卡统计（当前查询口径，不参与筛选）：本周已入库（0/1 或 1/1）、累计报告（按统计周期计，不含历史版本）、最近发报日、历史版本总数。
  - 结果卡工具栏：左侧「手动补传」（持上传权限可见）；右侧「刷新」。
  - 按周索引表格：按所属周倒序排列，不设置独立周分组行；统计周期与报告合并在同一行，依次展示统计周期（含齐全度徽标）、报告标题、发报日、来源、当前版本与操作。每周仅一条 `_all` 报告，操作含「查看 / 获取原件」。未入库时仅展示一条灰显「未入库」行，发报日、来源与版本显示「—」，操作按权限显示「立即生成 / 补传」。
  - 分页：按自然周计数，默认 20 条/页，可切换 20 / 50 / 100 条；查询或重置后回到第 1 页。
  - 数据区状态：加载中显示表格骨架；无结果显示「该条件下暂无报告」；加载失败显示「报告列表加载失败」与「重试」，重试保留当前筛选与页码。
  - 手动补传弹窗：报告类型固定为「项目进度报告」，报告项固定 `_all`，不提供项目组选择；发报日不可晚于今天。仅识别 `progress_yyyyMMdd__all.md`，识别成功时回填发报日，识别失败时保留手动填写。从缺失行「补传」进入时预填当周周日，并展示「已从缺口带入：全部项目组 · 发报日 {日期}」。
- **组件引用**：[Button](../../../../busyming-skills-design/components/web/docs/Button/spec.md)、[BusyInput](../../../../busyming-skills-design/components/web/docs/BusyInput/spec.md)、[DatePicker](../../../../busyming-skills-design/components/web/docs/DatePicker/spec.md)、[ProTable](../../../../busyming-skills-design/components/web/docs/ProTable/spec.md)、[Pagination](../../../../busyming-skills-design/components/web/docs/Pagination/spec.md)、[Tag](../../../../busyming-skills-design/components/web/docs/Tag/spec.md)、[Message](../../../../busyming-skills-design/components/web/docs/Message/spec.md)、[MessageBox](../../../../busyming-skills-design/components/web/docs/MessageBox/spec.md)、[Dialog](../../../../busyming-skills-design/components/web/docs/Dialog/spec.md)、[Upload](../../../../busyming-skills-design/components/web/docs/Upload/spec.md)。
- **编排标准**：[Web 操作列表页](../../../../busyming-skills-design/shared/page-standards/web-operation-list.md)；页面无批量业务，不设置勾选列与批量操作。
- **布局引用**：[assets/web/report-list.html](../assets/web/report-list.html)。

#### 导航关系

- 来源页：研发分组侧边菜单「研发报告 → 项目进度报告」。
- 去向页：已入库行「查看」→ `/report/progress/detail/:id`；缺失行「补传」→ 手动补传弹窗；「立即生成」成功 → 报告配置页对应报告项的生成记录。
- 返回行为：从详情返回时恢复原筛选条件、页码与滚动位置；面包屑「项目进度报告」停留当前页。
- 面包屑：首页 / 研发 / 研发报告 / 项目进度报告。

#### 操作反馈清单

| 操作名 | 触发条件 | 二次确认? | Loading 形式 | 成功反馈+去向 | 失败反馈+重试 |
|--------|---------|----------|-------------|-------------|-------------|
| 查询 | 点击「查询」或在关键词输入框回车 | 否 | 表格 loading | 列表与统计刷新 → 停留第 1 页 | BusyMessage.error「查询失败，请重试」→ 保留条件，按钮恢复 |
| 重置 | 点击「重置」 | 否 | 表格 loading | 恢复近 90 天与空关键词 → 刷新第 1 页 | BusyMessage.error「重置后加载失败，请重试」→ 保留默认条件，按钮恢复 |
| 刷新 | 点击「刷新」 | 否 | 按钮 loading + 表格 loading | 列表与统计刷新 → 停留当前筛选和页码 | BusyMessage.error「刷新失败，请重试」→ 按钮恢复 |
| 手动补传提交 | 发报日与文件校验通过 | 否 | 提交按钮 loading + disabled | BusyMessage.success「补传成功，已生成 v{N}」→ 关闭弹窗并刷新来源列表；重复内容提示「内容重复，与现有版本一致，未产生新版本」 | BusyMessageBox 展示错误详情 → 弹窗与输入保留，按钮恢复后可重试 |
| 立即生成 | 未入库行点击「立即生成」，且对应触发配置可用 | BusyMessageBox 展示报告项、统计周期与统计窗口 | 确认按钮 loading + disabled | BusyMessage.success「已创建生成任务」→ 跳转报告配置页对应报告项的生成记录 | BusyMessage.error 展示配置缺失、任务进行中或权限不足原因 → 停留本页，按钮恢复 |
| 获取原件 | 已入库行点击「获取原件」 | 否 | 按钮 loading + disabled | 下载当前版本原始 Markdown，BusyMessage.success「已开始下载 {文件名}」→ 停留本页 | BusyMessage.error 展示无原始内容或下载失败原因 → 按钮恢复后可重试 |
| 加载失败重试 | 数据区点击「重试」 | 否 | 表格 loading | 列表与统计刷新 → 停留当前筛选和页码 | BusyMessage.error「报告列表加载失败」→ 保留重试入口 |

#### 表单校验（手动补传弹窗）

- 初态：报告类型固定为「项目进度报告」、报告项固定为 `_all` 且只读；从工具栏进入时发报日默认为空，从缺失行进入时按缺口预填；无编辑模式。

| 字段名 | 必填 | 校验规则 | 触发时机 | 错误文案 | 异步? |
|--------|-----|---------|---------|---------|------|
| 发报日 | 是 | 不可晚于今天；文件名识别成功时自动回填 | change | 「发报日不可晚于今天」 | 否 |
| 报告文件 | 是 | 单个 UTF-8 Markdown 文件，扩展名为 .md，大小不超过 2MB；重复选择替换前次文件 | change | 「仅支持不超过 2MB 的 UTF-8 Markdown 文件」 | 否 |

- 提交成功跳转：无路由跳转；关闭弹窗并刷新来源列表。
- 提交失败展示：BusyMessageBox 展示服务端错误详情；字段错误显示在对应字段下方，已填内容与文件保留。
- 脏数据离开：已选择文件或已填写发报日时关闭，BusyMessageBox 确认「已选择文件或已填写补传信息，放弃本次补传？」。

---

<a id="report-detail"></a>
### 报告详情

- **页面路径**：`/report/progress/detail/:id`
- **路由名称**：`devhubProjectProgressReportDetail`，为项目进度报告的非菜单详情页。
- **权限编码**：
  - 所属菜单资源：`devhubProjectProgressReport`，不等同于详情路由名称。
  - 关联数据权限：点击人员姓名查看周报须具备 `devhubMemberOutputReport`；打开健康度报告须具备 `devhubDocHealthReport`。无对应权限时姓名仅作文本、健康度操作列为「—」，不发起数据请求。
- **页面类型**：详情页（阅读型）。
- **区块职责**：
  - 页头：返回链接「‹ 返回报告列表」、报告标题、「项目进度报告」Tag 与「全部项目组」Tag；右侧操作「导出为图片（PNG）/ 获取原件 / 返回列表」。
  - 历史版本警示：仅查看历史版本时展示「当前查看历史版本 v{N}（只读），最新版本为 v{M}；切换版本不改变归档内容。」
  - 元信息概览：全部项目组及组数、发报日、所属周、统计区间（解析失败显示「—」）、来源、当前版本、文件大小、入库时间。多版时当前版本通过下拉切换，辅助文案为「历史版本只读可查，URL 带 ?v=N 可分享」。
  - 阅读区：展示当前版本在入库时生成并持久化的服务端 HTML 产物，前端不做 Markdown 实时渲染；正文首部展示统计区间引用块，章节顺序固定为项目核心进展 / 团队人员 / 功能排期 / 代码提交 / Qoder 使用 / harness文档健康度。每章仅用一个表格，前五章第一列为项目组并按项目 key 字典序展示，harness文档健康度按仓库展示上周健康度得分、本周健康度得分、较上期与「查看报告」操作，不设全量汇总；团队人员展示各角色人数及具体人员明细，末行以加粗的「全量汇总(去重)」展示；代码提交与 Qoder 使用按产品、研发分别展示各项指标，功能排期、代码提交与 Qoder 使用末行以加粗的「全量汇总」展示，项目核心进展不设全量汇总；表格仅在正文容器内横向滚动，正文为空时展示「报告内容为空」。
  - 人员周报弹窗：具备人员产出报告权限时，团队人员中的姓名渲染为可点击按钮；点击后打开公共 Dialog，标题为「{姓名} · 本周研发周报」，展示统计区间、来源报告及版本，以及该人员在「按人员综合分析」下的完整小节。加载中显示局部状态；未入库、人员小节缺失或读取失败时显示「未取得」，不推测内容。弹窗提供「查看完整周报」与「关闭」，关闭后焦点返回原姓名；切换进度报告版本前关闭弹窗。Markdown 原件与 PNG 中姓名保持纯文本。
  - 大纲：读取当前版本服务端产物的 h2 / h3 锚点目录；宽屏展示在阅读区右侧并随页面吸附，当前章节高亮，点击平滑定位；≤1024px 时移至阅读区下方，不另设抽屉。
  - 版本切换：选择历史版本后，元信息、正文与大纲整体切换；加载期间正文区显示「正在加载所选版本内容…」，成功后 URL 写入 `?v=N`；失败时停留原版本。
  - 异常空态：报告 ID 不存在或对应报告尚未入库时，显示「报告不存在或尚未入库」，元信息显示「—」，禁用版本切换、PNG 导出与获取原件，仅保留返回列表。
- **组件引用**：[Button](../../../../busyming-skills-design/components/web/docs/Button/spec.md)、[PageableSelect](../../../../busyming-skills-design/components/web/docs/PageableSelect/spec.md)、[Descriptions](../../../../busyming-skills-design/components/web/docs/Descriptions/spec.md)、[Tag](../../../../busyming-skills-design/components/web/docs/Tag/spec.md)、[Message](../../../../busyming-skills-design/components/web/docs/Message/spec.md)、[Dialog](../../../../busyming-skills-design/components/web/docs/Dialog/spec.md)。
- **编排标准**：[Web 详情页 · 档案型](../../../../busyming-skills-design/shared/page-standards/web-detail.md)。
- **布局引用**：[assets/web/report-detail.html](../assets/web/report-detail.html)。

#### 导航关系

- 来源页：报告列表已入库行「查看」，路径携带报告 ID；历史版本通过 `?v=N` 直达。
- 去向页：健康度「查看报告」→ `/subapp/devhub/report/doc-health/detail/{本周报告 ID}`；人员周报弹窗「查看完整周报」→ `/subapp/devhub/report/member-output/detail/{周报报告 ID}`。「导出为图片（PNG）」下载当前版本的完整正文图片，「获取原件」下载当前展示版本 Markdown，大纲仅在页内定位。
- 返回行为：页头「‹ 返回报告列表」、右侧「返回列表」或面包屑「项目进度报告」→ 报告列表，并恢复原筛选条件、页码与滚动位置。
- 面包屑：首页 / 研发 / 研发报告 / 项目进度报告 / 报告详情。

#### 操作反馈清单

| 操作名 | 触发条件 | 二次确认? | Loading 形式 | 成功反馈+去向 | 失败反馈+重试 |
|--------|---------|----------|-------------|-------------|-------------|
| 版本切换 | 版本下拉选择其他版本 | 否 | 正文区加载指示 | 元信息、正文与大纲切换，URL 写入 `?v=N`；BusyMessage.success「已切换到 v{N}（当前版本）/（历史版本，只读）」→ 停留详情页 | BusyMessage.error「版本加载失败」→ 停留原版本，可重新选择 |
| 导出为图片（PNG） | 页头点击「导出为图片（PNG）」，且当前版本正文非空 | 否 | 按钮 loading + disabled | 下载当前版本完整正文 PNG，BusyMessage.success「已导出 {文件名}」→ 停留详情页 | BusyMessage.error「图片导出失败，请重试」→ 按钮恢复后可重试 |
| 获取原件 | 页头点击「获取原件」 | 否 | 按钮 loading + disabled | 下载当前展示版本原始 Markdown，BusyMessage.success「已开始下载 {文件名}」→ 停留详情页 | BusyMessage.error 展示无原始内容或下载失败原因 → 按钮恢复后可重试 |
| 查看人员周报 | 点击具备权限的人员姓名 | 否 | 弹窗正文局部 loading | Dialog 展示该人员本周完整周报小节 → 停留当前详情；可继续打开完整周报 | 弹窗展示「未取得」及重试入口，关闭后焦点返回原姓名 |
| 查看健康度报告 | 点击仓库行「查看报告」，且具备健康度报告权限 | 否 | 无 | 打开本周产品文档健康度报告详情 | 目标报告不可用时展示来源页异常空态，可返回当前报告 |
| 大纲定位 | 点击大纲条目 | 否 | 无 | 平滑滚动至目标章节并高亮当前条目 → 停留详情页 | 目标锚点缺失时 BusyMessage.error「未找到该章节」→ 停留当前阅读位置 |
