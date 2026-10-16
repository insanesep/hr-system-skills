---
name: feature-schedule-frontend-guide
description: 系统功能排期模块 - 前端页面结构、组件拆分、状态管理、事件流
---

> ⚠️ **历史参考（v1.x 单页架构）**：本文写于 v1.x「单页面 FeatureSchedule.vue + 手写原生 DOM」时期。**v2.0 起页面已重构为组件化研发排期工作台**：容器 `src/views/schedule/FeatureSchedule.vue`（状态/数据/拖拽/合并/筛选/保存分发）+ `src/views/schedule/feature-schedule/` 子组件目录（`PendingPool / MonthView / WeekView / ListView / GanttView / CardDrawer / ScheduleCardItem / ScheduleBar / DayCardsModal / NonFeatureModal / RepoConfigModal / CreateCardModal / fs-utils` 共享契约），组件库也已切换为 Ac 组件体系（非 Element Plus）。组件布局、状态管理、事件流（含卡片交互共享契约 CardUiState/CardStateFns/CardHandlers）以**当前代码**为准；本文以下章节仅作 v1.x 历史设计参考，其中的 BackupPanel、原生 `<input>`、Element Plus 等描述均已过时。

# 系统功能排期 - 前端实现指南

## 1. 工程规范

- **框架**：Vue 3.5 + `<script setup>` + TypeScript
- **组件库**：Element Plus 2.13.7（本页面仅用 ElMessageBox 做 confirm，其它手写原生 DOM 保持与原型一致）
- **样式**：全局 CSS 变量 `src/styles/variables.scss`，页面内使用 `var(--primary)` 等；原型中 `:root{...}` 覆写的变量需合并到页面 scoped CSS
- **HTTP**：`src/api/http.ts`；新增 `src/api/schedule.ts`（或直接扩在 `src/api/index.ts`）
- **路由**：`src/router/index.ts` 新增 `{ path:'feature-schedule', name:'MENU-SYSTEM-FEATURE-SCHEDULE', ... }`，permCode 对齐 `MENU:SYSTEM:FEATURE_SCHEDULE`

## 2. 文件清单

```
busyming-snackingdom-web/
├── src/
│   ├── api/
│   │   └── schedule.ts                  # 排期模块所有 HTTP 封装
│   ├── views/schedule/
│   │   └── FeatureSchedule.vue          # 单页面：月历 + Backup + 抽屉 + commit 选择器 + 发版日
│   └── router/
│       └── index.ts                     # 追加 feature-schedule 路由
```

## 3. 组件布局

```
<FeatureSchedule>
  ├── 顶部 toolbar（上月/月份选择/下月/今天 + 统计 chips）
  ├── workspace
  │    ├── <BackupPanel>   ——  固定 280px，滚动 backup[]
  │    └── <CalendarPanel> ——  周一为首 7 列，动态 5~6 行
  │         ├── <DayCell v-for="day in calendarDays"> ——  卡片最多显示 3 张，超出显示 +N
  │         │     └── <MiniCard draggable> ——  标题 / 编号 / 负责人 / 模块小药丸
  └── <DetailDrawer>        ——  右侧 440px 抽屉；切 DONE 时展开 CommitPicker
  └── <DayCardsModal>       ——  +N 点击弹层
  └── <ReleaseDayConfirm>   ——  发版日切换弹窗
```

本期为**单文件 Vue** 简化，按原型逻辑将上述 5 部分写在同一个 `.vue` 中；若后续复杂度上升再拆。

## 4. 数据流

### 4.1 状态变量

```ts
interface CardVO { cardNo: string; title: string; content: string;
  ownerUserId: number; ownerName: string;
  status: 'PENDING'|'IN_PROGRESS'|'DONE'|'NON_FEATURE';   // v1.6 状态机升 4 态
  scheduledDate: string|null; sourceRepo: string; sourceModule: string;
  sourceCommitHash: string; hardwareManagement: string|null;
  devUserId: number|null;          // v1.6 新增：开发人 ID
  devUserName: string|null;        // v1.6 新增：开发人姓名
  devTakenAt: string|null;         // v1.6 新增：领取时间
  isMerged: boolean;               // v1.8 新增：是否合并卡
  parentMergeCardNo: string|null;  // v1.8 新增：子卡指向合并卡
  doneRepo: string|null; doneCommitHash: string|null; doneCommitUrl: string|null;
  doneAt: string|null; createdAt: string; updatedAt: string; }

const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())   // 0~11
const cards = ref<CardVO[]>([])           // 当月 + backup 合并
const backup = ref<CardVO[]>([])
const releaseDays = ref<Set<string>>(new Set())
const repos = ref<RepoVO[]>([])
const moduleCodes = ref<ModuleCodeVO[]>([])

const editing = ref<CardVO|null>(null)     // 抽屉编辑态
```

### 4.2 请求入口

- 页面 onMounted：`Promise.all([ scheduleApi.monthView(...), scheduleApi.repos(), scheduleApi.moduleCodes(), scheduleApi.releaseDays(...) ])`
- 月份切换：`loadMonth()`
- 拖拽完成：`scheduleApi.updateCard({cardNo, scheduledDate})` → 成功后本地更新不再拉全量（乐观更新）；失败回滚 + toast
- 抽屉保存：先 `updateCard`（标题/内容/负责人）；随后按 `(oldStatus, newStatus)` 分发状态动作：
  - `* → DONE` ： `markDone({cardNo, doneCommits})`（`PENDING → DONE` 后端 autoFillDev）
  - `PENDING → IN_PROGRESS`：`takeCard(cardNo)`
  - `DONE → IN_PROGRESS` ： `revert(cardNo, 'IN_PROGRESS')`（后端保留 dev_*）
  - `IN_PROGRESS → PENDING`：`releaseCard(cardNo)`
  - `DONE → PENDING`：`revert(cardNo)`（默认 targetStatus=PENDING，后端同事务清 dev_*）

### 4.3 乐观更新 vs 重拉

原型为纯本地内存，真实场景建议：
- 所有**写操作成功后仅修补当前 cards 数组**（O(1)）
- 失败时 toast + 回滚（撤销对应字段）
- 不做全量 `monthView` 重拉（只有月份切换时拉一次）

## 5. 关键交互

### 5.1 日历生成

```ts
function buildCalendar(year: number, month: number) {
  const first = new Date(year, month, 1)
  const firstDow = (first.getDay() + 6) % 7       // 周一为首
  const totalDays = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((firstDow + totalDays) / 7) * 7
  const days: { date: string; offMonth: boolean; isToday: boolean }[] = []
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month, 1 - firstDow + i)
    days.push({
      date: fmt(d),
      offMonth: d.getMonth() !== month,
      isToday: fmt(d) === todayStr
    })
  }
  return days
}
```

### 5.2 HTML5 Drag & Drop

- `MiniCard` 设置 `draggable="true"`；`dragstart` 时 `e.dataTransfer.setData('text/plain', cardNo)`
- `DayCell`（非 off-month）绑定 `dragover`（`e.preventDefault()` 打开 drag-over 样式）与 `drop`
- `BackupPanel.list` 同样绑定 drop 接收从日历格拖回
- 拖到相同日期 → 不请求
- 失败恢复：`card.scheduledDate = oldDate`

### 5.3 Commit 选择器（抽屉内）

- 仓库下拉：加载自 `repos.value`；选项双行展示（第 1 行完整中文名、第 2 行 repo 标识 mono 灰字，:deep 放开 AcSelect 选项 36px 固定行高，v2.7.1）
- 分支框（v2.7.2 起可输可选）：**AcAutoComplete**，候选来自 `POST /repos/branches`（仓默认分支置顶 + 最近活跃倒序，CI 一次性 release 分支后端已过滤；候选按仓在组件内缓存一次，拉取失败记空、静默降级为纯输入）；自定义 `filterOption`——聚焦未输入全量候选（组件默认按当前值过滤会把候选收敛成只剩当前分支），输入后子串收窄；下拉点选立即定型、自由输入 debounce 500ms 定型，均 trim + 按仓 localStorage 记忆（key=`fs-commit-picker-branch:{repo}`，迭代换分支只改一次）并带 `branch` 重查；空 = 仓默认分支。**为何需要分支**：日常提交落在迭代集成分支（如 feature/20260806_0806），仅查 master 会让候选停更在发版点
- 搜索框：`input` 事件 debounced 300ms 后调 `scheduleApi.commits({repo, branch, q, limit:50})`
- 列表项 click → 保存到本地 `selectedCommit`；不手写 hash
- 保存抽屉时：先 `updateCard`（标题/内容/负责人），再 `markDone`；若失败则不关闭抽屉

### 5.4 延期渲染

```ts
function tagOf(card: CardVO) {
  if (card.status === 'DONE')         return { cls: 'done',        text: '开发完成' }
  if (card.status === 'IN_PROGRESS')  return { cls: 'in-progress', text: '开发中' }   // 不计入延期
  if (card.status === 'PENDING' && card.scheduledDate && card.scheduledDate < todayStr)
    return { cls: 'delayed',     text: '延期' }
  return                              { cls: 'pending',     text: '待开发' }
}
```

**状态色套**（v1.6）：

| 状态 | 主色 | 背景 | 边框 | 应用点 |
|------|------|------|------|------|
| `PENDING` | `var(--primary)` | 默认 | 默认 | chip / 卡片 / log dot |
| `IN_PROGRESS` | `#7E57C2` 紫 | `#F3E5F5` | `#D1C4E9` | chip.in-progress / card.status-in-progress / drawer-title .tag.in-progress / status-opt .in-progress-dot / log-item.op-TAKEN |
| `DONE` | `var(--positive)` | `var(--positive-light)` | 默认 | chip / 卡片 / log dot |
| `NON_FEATURE` | 灰 | 灰白 | 灰 | 抽屉 tag / 工具栏计数 |
| `DELAYED`（计算态） | `var(--warn)` | 默认 | 默认 | chip / 卡片 |

### 5.6 状态切换守卫（v1.6）

- 抽屉 status-switcher 三选一：`待开发` / `开发中` / `完成`，`canMarkDone` 计算同原逻辑（需选中 ≥1 个 doneCommit 才能置 DONE）
- 状态切换后看 `(oldStatus, newStatus)` 在 `onSave` 包装：
  ```ts
  if (newStatus === 'DONE') await markDone(...)
  else if (newStatus === 'IN_PROGRESS') {
    if (oldStatus === 'PENDING') await takeCard(cardNo)
    else if (oldStatus === 'DONE') await revert(cardNo, 'IN_PROGRESS')
  } else if (newStatus === 'PENDING') {
    if (oldStatus === 'IN_PROGRESS') await releaseCard(cardNo)
    else if (oldStatus === 'DONE') await revert(cardNo)
  }
  ```
- 抽屉「开发人」字段：`v-if="editingCard.devUserName"` 条件渲染，同行追 `领取于 {devTakenAt}`。`take-card` 后后端回填，`releaseCard` / `revert(PENDING)` 后后端同事务置 null，前端在 `loadMonth` 后重拉。

### 5.5 发版日

- DayCell click（非卡片/非 more/非 off-month） → `releaseDayConfirm.show = true`
- 确认后 `scheduleApi.toggleReleaseDay({releaseDate})` → 更新本地 `releaseDays` Set

## 6. 样式复用

- 原型中 `:root{...}` 已声明的 `--primary/--positive/--warn` 等均已在 `src/styles/variables.scss` 中定义，页面内**不要再覆写**，直接引用
- 原型中 `--info`、`--positive-light`、`--warn-light` 均已存在
- 原型中 `.card`、`.day-cell`、`.drawer`、`.commit-option` 等类名仅在本页面使用，写在 `<style scoped>` 中

## 7. Mock 开发模式

在后端未通时，页面可通过环境变量 `VITE_USE_MOCK_SCHEDULE=true` 切换到本地 Mock 数据（直接内置原型里的 `MOCK_COMMITS` 数组），保证页面可独立展示。Mock 代码位置：`src/api/schedule.mock.ts`。

## 8. 辅助函数

```ts
export const fmtDate   = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
export const fmtYM     = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}`
// v1.6：从「去业务前缀 + 15 字」改为「冒号后截取 + 30 字」
export const titleFromMsg = (m: string) => {
  const first = (m || '').split(/\r?\n/)[0]
  const colon = first.indexOf(':')
  const t = (colon >= 0 ? first.slice(colon + 1) : first).trim()
  return t.length > 30 ? t.slice(0, 30) : t
}
```

## 9. 可访问性 & 性能

- 键盘操作：抽屉 `Esc` 关闭；列表 `Enter` 打开抽屉
- 卡片列表 `v-memo` / `key=cardNo`，避免重复 diff
- 拖拽期间禁用 toast 提示
- 月切换 loading：使用顶部 1px 进度条（复用 `ProductApplyList.vue` 的 `.pa-loading-bar` 风格）

## 10. 当月卡片搜索（Backup 面板）

纯前端本地过滤，不落库、不请求后端。在 Backup 区顶部提示文字与卡片列表之间插入原生 `<input type="search">`。

### 10.1 数据流

```ts
// 响应式变量
const cardSearchKeyword = ref('')

// 分词：空格 / 中英文逗号分割，转小写
const searchTokens = computed(() => {
  const raw = cardSearchKeyword.value.trim()
  if (!raw) return [] as string[]
  return raw.split(/[,，\s]+/).filter(Boolean).map(t => t.toLowerCase())
})

// AND 模糊匹配：所有 token 都必须命中 (title + content)
function cardMatchSearch(c: FeatScheduleCardVO): boolean {
  if (!searchTokens.value.length) return true
  const text = ((c.title || '') + ' ' + (c.content || '')).toLowerCase()
  return searchTokens.value.every(t => text.includes(t))
}
```

### 10.2 应用点

- **Backup 列表**：`backupCards` computed 增加 `.filter(c => cardMatchSearch(c))`，搜索时只显示匹配卡片
- **月历卡片**：绑定动态 class——命中的加 `.search-hit`（橙黄边框高亮 `#FAAD14`），未命中的加 `.search-dim`（opacity: 0.25 淡化 + `pointer-events:none` 禁止交互）
- **清空**：Esc 键清空搜索框；搜索框右侧附 `×` 按钮，点击同样清空

### 10.3 HTML

```html
<div class="backup-search">
  <input id="cardSearchInput" type="text"
    v-model="cardSearchKeyword"
    placeholder="搜索当月卡片：标题 / 内容…"
    @keydown.esc="cardSearchKeyword = ''" />
  <button v-if="cardSearchKeyword" class="search-clear"
    @click="cardSearchKeyword = ''">×</button>
</div>
```

### 10.4 CSS

```css
.backup-search { padding: 0 12px 8px; display: flex; align-items: center; gap: 4px; }
.backup-search input { flex: 1; height: 28px; border: 1px solid #E0E0E0; border-radius: 4px; padding: 0 8px; font-size: 12px; }
.backup-search input:focus { outline: none; border-color: var(--primary, #E60013); }
.backup-search .search-clear { border: none; background: none; cursor: pointer; font-size: 14px; color: #999; padding: 0 4px; }
.card.search-hit { box-shadow: 0 0 0 2px #FAAD14 !important; }
.card.search-dim { opacity: .25; pointer-events: none; }
```

搜索框始终显示在 Backup 面板，跨月切换时不清空关键字（`cardSearchKeyword` 不在 `loadMonth` 中重置）。

## 11. 卡片合并（v1.8+）

合并功能由工具栏「🔗 合并卡片」按钮进入全局「多选态」→ 选择同模块 2+ 卡片 → 输入标题确认 → 生成合并卡；合并卡抽屉以「明细 Tab」收纳子卡，提供「↩ 解散合并」。

### 11.1 状态变量

```ts
// 多选态会话状态（不落库，刻入 .vue 顶层 setup）
const mergeMode = ref(false)                                // 全局多选态开关
const mergeSelected = ref<Set<string>>(new Set())           // 选中 cardNo 集合
const mergeLockedModule = ref<string | null>(null)          // 首张勾选后锁定 sourceModule
const mergeTitleDialogVisible = ref(false)
const mergeTitleInput = ref('')

// 合并卡抽屉 Tab
const drawerTab = ref<'detail' | 'mergeItems' | 'logs'>('detail')   // detail=字段 / mergeItems=明细（仅合并卡）
const mergeItems = ref<FeatScheduleMergeItemVO[]>([])       // 缓存明细
```

### 11.2 多选态交互

- 工具栏「🔗 合并卡片」按钮：`mergeMode.value = !mergeMode.value`；关闭时清空 `mergeSelected` 与 `mergeLockedModule`
- 每张卡片渲染：`mergeMode === true` 时在卡片左上角插入 `<input type="checkbox">`，点击勾选 toggle `mergeSelected`
- **勾选限制**（前端预校验，服务端强校验）：
  - 若 `mergeSelected.size === 0`：首张勾选后锁定 `mergeLockedModule = card.sourceModule`
  - 若已锁定模块：其他模块的卡片 checkbox `disabled` + `.merge-disabled` 灰显 + tooltip「仅可合并同模块卡片」
  - `card.status === 'DONE' || card.status === 'NON_FEATURE'`：checkbox 灰禁用 + tooltip「该状态不可合并」
  - `card.parentMergeCardNo 非空` （理论上不在列表，保底）：灰禁用
- 底部悬浮操作条（`mergeSelected.size > 0` 时显示）：
  ```
  已选 {N} 张 · 模块 {sourceModule}   [取消]  [确认合并]
  ```
- 「确认合并」：`mergeSelected.size < 2` 时 toast `至少选择 2 张卡片`；否则弹出标题输入对话框
- 标题输入对话框：`maxlength=30`；提交 → `scheduleApi.mergeCards({ title, childCardNos: Array.from(mergeSelected) })` → 成功后：退出多选态、`loadMonth()`、toast `合并成功：{mergeCardNo}`
- 多选态下：注意关闭原有的单击卡片开抽屉行为，只走勾选 toggle

### 11.3 合并卡视觉

```css
.card.is-merged { background: #E3F2FD; border-color: #BBDEFB; }
.card.is-merged::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:#1565C0; }
.card.is-merged .card-title::before { content:"🔗 "; }
.card.is-merged .merge-badge { position:absolute; right:6px; top:4px; background:#1565C0; color:#fff; font-size:10px; padding:1px 6px; border-radius:10px; }
.card.merge-disabled { opacity: .4; pointer-events: none; }
.card.merge-selected { outline: 2px solid var(--primary); }
.merge-action-bar { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,.15); padding: 10px 16px; border-radius: 8px; display: flex; gap: 12px; align-items: center; z-index: 250; }
```

- `PENDING/IN_PROGRESS/DONE/DELAYED` 状态色在合并卡上仍生效：`is-merged` 类与 `status-*` 类共存，渲染为「蓝底 + 状态边框色」
- 指标：右上角 `merge-badge` 张数 = `mergeItems.length`，首渲染时 `loadMonth` 返回的合并卡包含 `mergeChildrenCount` 字段（后端可在 toVO 时 COUNT ）

### 11.4 抽屉扩展

当 `editing.value.isMerged === true`：

- 抽屉头部 Tab 切换器：`[详情] [明细 ({N})] [流水]`
- 「明细」 Tab：
  - 首次打开时 `scheduleApi.mergeItemsList({cardNo})` 拉取 `mergeItems`
  - 表格展示 `childCardNo / title / sourceModule / preMergeStatus / preMergeScheduledDate / addedAt`
  - 每行点击开只读详情小弹层（子卡抽屉重用，并 `readonly` 隔离所有状态切换控件）
- 抽屉底部「危险区」区域新增「↩ 解散合并」按钮：
  - `status === 'DONE'` 时灰禁用 + tooltip「DONE 合并卡禁止解散，请先回退状态」
  - `ElMessageBox.confirm(「解散后子卡将恢复为独立状态」)` → `scheduleApi.dissolveMerge({cardNo})` → 成功后关抽屉 + `loadMonth()`

当 `editing.value.parentMergeCardNo 非空`（理论不会通过正常点击进入，仅「明细」行点击会打开）：抽屉整体 `readonly`，状态切换器/编辑/删除/移入非需求改动 均隐藏，顶部提示 `已并入合并卡 {parentMergeCardNo}，状态随合并卡`

### 11.5 与拖拽/搜索的共存

- `mergeMode === true` 时所有卡片 `draggable=false`（避免误拖）
- `mergeMode === true` 时搜索框仍可用：勾选不受搜索结果约束，但 `.search-dim` 淡化的卡片 `pointer-events:none` 仍不可勾选
- 合并卡 `title + content` 参与当月搜索（`content` 包含子卡清单），子卡不在列表不参与

### 11.6 卡片拖拽合并（非多选态快捷入口）

除多选态外，普通拖拽操作也能触发合并：拖动一张卡片到另一张同模块卡片上（日历、Backup、+N 弹层皆支持）即可快速合并。

**状态变量**:

```ts
const dragOverCardNo = ref<string | null>(null)  // 当前拖拽 hover 到的目标卡 cardNo
```

**校验函数**:

```ts
// 判定 src 可否拖到 tgt 上触发合并；同模块 + PENDING/IN_PROGRESS + 非子卡
function canMergeWith(srcNo, tgtNo): { ok: boolean; reason?: string }
```

**交互流程**:
1. `onCardDragOver(e, tgt)`：校验通过后 `e.preventDefault() + e.stopPropagation()`，置 `dragOverCardNo = tgt.cardNo`，目标卡显示 `.merge-drop-target`（`outline: 2px dashed #1565C0`）
2. `onCardDrop(e, tgt)`：校验通过后将 `mergeSelected = [src, tgt]`，弹出合并标题对话框，复用 `submitMergeTitle()` 调 `/cards/merge`
3. 对话框取消时（`cancelMergeTitleDialog`）：若非 `mergeMode` 则清空 `mergeSelected / mergeLockedModule`

**与日期格改期的共存**:
- `onCardDragOver` 调用 `e.stopPropagation()` 阻止事件冒泡到父级 `.day-cell` 的 `onDayDragOver`
- 不可合并时不调 `e.preventDefault()`，事件自然冒泡到日期格，仍走改期逻辑

### 11.7 非需求改动弹层分页

工具栏「🔧 非需求改动 N」弹层改为后端分页（默认 20/页）：

```ts
// 状态变量
const nfPageNum = ref(1)
const nfPageSize = ref(20)
const nfTotal = ref(0)
const nfLoading = ref(false)

// loadMonth 时仅调 listNonFeature(1,1) 取 total 用于工具栏 chip 显示计数
// 打开弹层时调 loadNonFeaturePage() 按当前页拉取
function loadNonFeaturePage() {
  featureScheduleApi.listNonFeature(nfPageNum, nfPageSize) → records/total
}
```

弹层底部 `<AcPagination>` 组件，切页 / 切每页数量触发重新拉取。

### 11.8 API 封装（`src/api/index.ts`）

```ts
export const mergeCards = (p: { title: string; childCardNos: string[] }) =>
  request<{ cardNo: string }>('/schedule/cards/merge', p)
export const mergeItemsList = (p: { cardNo: string }) =>
  request<{ list: FeatScheduleMergeItemVO[] }>('/schedule/cards/merge-items/list', p)
export const dissolveMerge = (p: { cardNo: string }) =>
  request<void>('/schedule/cards/dissolve', p)
```
