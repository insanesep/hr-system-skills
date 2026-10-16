---
name: feature-schedule-non-feature-bypass-implementation
description: 系统功能排期模块 - NON_FEATURE 旁路态 / 手动标记 实施总结（对应 SKILL v1.5 / commit 558435b·58b5a4b）
---

# NON_FEATURE 旁路态 实施总结

## 1. 背景

| 提交       | 说明                                                                       |
|----------|--------------------------------------------------------------------------|
| 558435b  | 新增非需求改动（NON_FEATURE）旁路态与列表弹层（PM 原型阶段，仅 asset/HTML + SKILL.md）            |
| 58b5a4b  | 代码仓列表配置 + **手动移入非需求改动** + **废弃自动分类**（PM 终稿）                              |
| 0a7800d  | 新增「⚙ 代码仓」配置弹层入口（仅 asset/HTML，纯前端 demo，**本期不做后端落库**——见偏差说明）              |

**核心变更**：

- 废弃原根据 commit message 前缀（chore/style/refactor/test/docs/build/perf）的自动归类（**后端从未实现过此自动分类**，本次为纯增量需求）
- 新增 PM 在抽屉内手动「🔧 移入非需求改动」/「↩ 恢复为待开发」入口
- 新增工具栏「🔧 非需求改动 N」计数与列表弹层

## 2. 后端实施

### 2.1 枚举扩展

`busyming-snackingdom-api` ▸ `FeatScheduleStatusEnum`

```java
PENDING("PENDING", "待开发"),
DONE("DONE", "开发完成"),
/** 非需求改动（旁路态，PM 手动标记） */
NON_FEATURE("NON_FEATURE", "非需求改动"),
```

### 2.2 接口契约（3 个新 endpoint）

| URL                                                              | 限制                | 起响业务                                                                 |
|------------------------------------------------------------------|-------------------|----------------------------------------------------------------------|
| `POST /schedule/cards/move-to-non-feature`                       | from PENDING/DONE | status→NON_FEATURE；同事务清空 scheduled_date / done_*；写流水 EDITED         |
| `POST /schedule/cards/restore-from-non-feature`                  | from NON_FEATURE  | status→PENDING；scheduled_date 保持 NULL（回到 Backup）；写流水 EDITED         |
| `POST /schedule/cards/non-feature/list`                          | -                 | 全量 NON_FEATURE 卡片，按 created_at DESC                                  |

详细 Request/Response → [api-spec.md §2.4](零食王国/研发/研发管理/feature-schedule/reference/api-spec.md#24-非需求改动non_feature-旁路态)。

### 2.3 状态守卫（FeatureScheduleServiceImpl）

| 入口            | 守卫                                                            | 错误码                  |
|---------------|---------------------------------------------------------------|----------------------|
| `update-card` | NON_FEATURE 拒绝排期日修改（`scheduledDate`）                          | `FS_STATUS_NOT_ALLOW` |
| `mark-done`   | NON_FEATURE 拒绝标记完成                                            | `FS_STATUS_NOT_ALLOW` |
| `move-to-nf`  | NON_FEATURE 拒绝重复调用                                            | `FS_STATUS_NOT_ALLOW` |
| `restore-nf`  | 仅允许 NON_FEATURE 调起                                            | `FS_STATUS_NOT_ALLOW` |

### 2.4 月视图 / Backup 过滤

`cardMapper` 月视图查询追加：

```java
.ne(FeatScheduleCardDO::getStatus, FeatScheduleStatusEnum.NON_FEATURE.getCode())
```

> 前端 `cards.value` 不会包含 NON_FEATURE，统一通过独立接口 `/cards/non-feature/list` + 弹层呈现。

### 2.5 字段清空（关键陷阱）

进入 NON_FEATURE 时**必须使用 `LambdaUpdateWrapper.set(field, null)` 显式置 null**，避免 BaseEntity / DO 实体的 null-skip 反向覆盖：

```java
cardMapper.update(null, new LambdaUpdateWrapper<FeatScheduleCardDO>()
    .eq(FeatScheduleCardDO::getCardNo, card.getCardNo())
    .set(FeatScheduleCardDO::getStatus, FeatScheduleStatusEnum.NON_FEATURE.getCode())
    .set(FeatScheduleCardDO::getScheduledDate, null)
    .set(FeatScheduleCardDO::getDoneRepo, null)
    .set(FeatScheduleCardDO::getDoneCommitHash, null)
    .set(FeatScheduleCardDO::getDoneCommitUrl, null)
    .set(FeatScheduleCardDO::getDoneCommits, null)
    .set(FeatScheduleCardDO::getDoneAt, null));
```

### 2.6 流水

复用 `FeatScheduleOpTypeEnum.EDITED`（**不新增 op_type 枚举**），detail 描述：

- 移入：`从「{oldLabel}」移入非需求改动；已清空排期与完成 commit`
- 恢复：`从非需求改动恢复为待开发`

## 3. 前端实施

### 3.1 类型与 API（`src/api/index.ts`）

```ts
export type FeatScheduleStatus = 'PENDING' | 'DONE' | 'NON_FEATURE'

featureScheduleApi = {
  // ...
  moveToNonFeature:    (cardNo) => post(`${FS_BASE}/cards/move-to-non-feature`, { cardNo }),
  restoreFromNonFeature:(cardNo) => post(`${FS_BASE}/cards/restore-from-non-feature`, { cardNo }),
  listNonFeature:      ()       => post(`${FS_BASE}/cards/non-feature/list`, {}),
}
```

### 3.2 视图改造（`src/views/schedule/FeatureSchedule.vue`）

- `statusClass` 加分支：`{ cls: 'non-feature', text: '非需求改动' }`
- `loadMonth` 用 `Promise.all([month, releaseDays, listNonFeature])` 并行刷新
- 工具栏新增 `🔧 非需求改动 N` 按钮（黄底 #FFFBE6 + 1px #FFE082 边框）
- 抽屉：
  - `editing.status === 'NON_FEATURE'` 时隐藏状态切换器、显示「非需求改动」提示块
  - 底部按钮：NON_FEATURE 显示「↩ 恢复为待开发」并隐藏「保存」；其它状态显示「🔧 移入非需求改动」+「保存」
- NF 列表弹层：复用 `.day-modal-mask / .day-modal` 风格，列表项 `class="card status-non-feature"`，点击调用 `openNfCard(cardNo)`（先临时把 NF 卡补入 `cards.value` 以供 `openDrawer` 查找）

### 3.3 视觉规范（与 PM HTML 保持一致）

| 元素                              | 颜色                              |
|---------------------------------|---------------------------------|
| 卡片背景 `.card.status-non-feature` | `#FFFBE6` 底 + `#FFE082` 边       |
| 卡片左侧条 `::before`                | 3px `#FFA000`                   |
| 抽屉提示块 `.non-feature-hint`       | `#FFFBE6` 底 + `#FFE082` 边 + `#F57F17` 文字 |
| 工具栏按钮 `.nf-btn`                 | `#FFFBE6` 底 + `#FFE082` 边 + `#F57F17` 文字 + `#E65100` 计数 |
| 抽屉「移入」按钮 `.btn-nf`              | 同上                              |
| 抽屉「恢复」按钮 `.btn-restore`         | `#E3F2FD` 底 + `#90CAF9` 边 + `#1976D2` 文字 |

## 4. Skill 偏差说明

### 4.1 「⚙ 代码仓配置」弹层（commit 0a7800d）

- PM 在 `asset/feature-schedule.html` 中新增 `SOURCE_REPOS` / `DONE_REPOS` 数组与配置弹层（增删修改本地数组），但 `SKILL.md` 未追加后端接口契约与 DDL。
- **本期落地为「只读弹层 + 源仓一份 + Nacos 持久化」**（已于本轮交互中与 PM 对齐完成）：
  1. 范围：仅「卡片池源 commit 仓」一份。「卡片池 source 仓」与「完成 commit done 仓」同源（都是 Nacos `codeup.repos:` 同一名单），不划分 SOURCE / DONE 两份。
  2. 持久化：走 Nacos `codeup.repos:` YAML，由运维维护，不新建 `feat_schedule_repo` 表、不提供 CRUD 接口。
  3. 前端入口：`FeatureSchedule.vue` toolbar 增 `⚙ 代码仓` 按钮 → 弹出表格弹层（`repoConfigModalOpen`）→ `openRepoConfigModal()` 调 `POST /schedule/repos` 拉取实时生效的 Nacos 配置，以 `repo / name / defaultBranch` 三列呈现。
  4. 后端零变动：`FeatScheduleRepoVO` 已含三字段；`POST /schedule/repos` 已返回完整列表；Nacos / Mock 双源均已到位。
  5. 前端提示文案：顶部「卡片池（Backup）仅采集以下仓库的 commit」；底部「需增减 / 修改？请联系运维修改 Nacos `codeup.repos`」。
- 后续若 PM 明确提出「仓库可动态增删」需求，再评估补充：
  1. 新建 `feat_schedule_repo` 表（repo, name, defaultBranch, status，不再需 SOURCE/DONE 两种 kind）
  2. 新增 `POST /schedule/repos/save` / `delete` / `list` 接口
  3. 调整 `repos` 接口优先读表、回退 Nacos

### 4.2 自动分类废弃（commit 58b5a4b）

- `SKILL.md` 移除原 commit message 前缀正则自动分类语义
- **后端从未实现过此自动分类逻辑**（`grep_code` 在 `busyming-snackingdom` 全模块未找到 `chore|style|refactor|test|docs|build|perf` 前缀匹配相关代码）
- 本次为纯增量需求开发，未删除任何已有逻辑

## 5. 关联文档

- 接口契约 → [api-spec.md §2.4](零食王国/研发/研发管理/feature-schedule/reference/api-spec.md#24-非需求改动non_feature-旁路态)
- 状态机 / 守卫规则 → [business-rules.md §1](business-rules.md#1-状态机)
- DDL 字段注释 → [data-model.md §3.1](data-model.md#31-feat_schedule_card)
- 多仓库 commit 升级 → [done-commits-multi-repo-upgrade.md](done-commits-multi-repo-upgrade.md)
