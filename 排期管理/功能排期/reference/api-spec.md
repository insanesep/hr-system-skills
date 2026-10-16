---
name: feature-schedule-api-spec
description: 系统功能排期模块 - 接口契约（URL、Method、Request/Response、错误码）
---

# 系统功能排期 - 接口规范

## 1. 通用约定

- **统一前缀**：`/api/v1/inner/snackingdom/schedule`
- **权限编码**：`MENU:SYSTEM:FEATURE_SCHEDULE`（前端路由守卫 + 后端菜单树限制，后端暂无强制注解）
- **统一响应包装**：由 `AbstractRestResponseAdvice` 包装为 `{code, success, data, error}`，接口签名只写业务 `data`
- **日期格式**：`yyyy-MM-dd`；日期时间 `yyyy-MM-dd HH:mm:ss`
- **空返回**：写操作成功统一返回 `EmptyVO.INSTANCE`

## 2. 接口清单

### 2.1 月视图（卡片聚合）

```
POST /api/v1/inner/snackingdom/schedule/cards/month
Request: { month: "2026-05", includeBackup: true, backupPageNum: 1, backupPageSize: 20,
           backupOnlyOwnerName?: "张三", sourceRepos?: ["snackingdom-mall-web"],
           backupStatuses?: ["PENDING","IN_PROGRESS"], backupOwnerNames?: ["张三","李四"], backupModules?: ["store-request"] }
Response: {
  month: "2026-05",
  cards:  [CardVO, ...],   // v2.1 起按「区间重叠」检索：start_date<=月末 && end_date>=月初；
                           // start_date IS NULL 的 legacy 行回退 scheduled_date 锚点匹配（含 PENDING / IN_PROGRESS / DONE）
  backup: [CardVO, ...],   // scheduled_date IS NULL 的卡片当前页（includeBackup=true 才返回）
  backupTotal:    120,     // Backup 池总记录数（分页用）
  backupPageNum:  1,       // 页码回显
  backupPageSize: 20       // 页大小回显，缺省 20，上限 100
}
# 后端过滤 status=NON_FEATURE；IN_PROGRESS 与 PENDING 同路返回，由前端依 status 字段渲染不同色块。
# Backup 池按 created_at DESC 分页；backupPageNum/backupPageSize 仅 includeBackup=true 时生效，其余情况回显缺省值。
# backupOnlyOwnerName（可选）：非空时仅 Backup 池按 owner_name 或 dev_user_name = 该名过滤（「只看自己」）。
# sourceRepos（可选，「skills 仓库筛选」）：非空时对 cards 与 Backup 池统一追加 source_repo IN (?)；null/空数组=全部不过滤（前端全选时不传）；与 backupOnlyOwnerName 可叠加。
# backupStatuses（可选，v2.0.1）：非空时对 Backup 池追加 status IN (?)；前端延期映射 DELAYED 哨兵值（IN 查询天然不命中，「仅选延期」时 Backup 为空）。
# backupOwnerNames（可选，v2.0.1）：非空时对 Backup 池追加 owner_name IN (?)；与 backupOnlyOwnerName 可叠加（AND）。
# backupModules（可选，v2.0.1）：非空时对 Backup 池追加 source_module IN (?)。三者均仅作用于 Backup 池，不影响 cards（cards 由前端按同值过滤）。
# v2.1 区间重叠口径使跨月区间卡（如 8/30~9/2）在两个月份视图中均返回。
```

### 2.2 卡片 CRUD

```
# 生成卡片（由采集 job / webhook 调用；PM 前端「新建卡片」弹窗也走此接口）
POST /api/v1/inner/snackingdom/schedule/cards
Request: {
  sourceRepo: "snackingdom-mall-web",
  sourceModule: "store-request",   // 可选（v2.1.2 起）：缺省由后端按 commit message Conventional Commit 头部解析，未命中兜底 MISC
  sourceCommitHash: "a3f9c2d",
  commitMessage: "fix(pick): 修复分拣任务超时不释放的问题",
  authorUserId: 1001,     // 可选，非必填
  authorName: "张三",
  authoredAt: "2026-05-07T09:12:33+08:00",
  hardwareManagement: "门店摄像头-离线检测"   // 可选（v2.1.2 起）：缺省时若解析 module=hardware-management 自动提取 message 中 [hw:xxx]
}
Response: { cardNo: "FS-20260507-001", firstTime: true }   // firstTime=false 代表源 commit 已存在，返回既有卡片
```

```
# 字段编辑（标题/内容/负责人/排期）
POST /api/v1/inner/snackingdom/schedule/cards/update
Request: {
  cardNo: "FS-20260507-001",
  title: "分拣超时",          // 可选
  content: "...",            // 可选
  ownerUserId: 1002,         // 可选
  ownerName: "李四",          // 可选
  scheduledDate: "2026-05-09" | null,   // 可选，显式传 null 代表移回 Backup
  clearScheduledDate: false,            // 可选，true 时显式清空排期（三字段同清 NULL）
  startDate: "2026-05-09",   // v2.1+ 可选；与 endDate 必须成对提供
  endDate: "2026-05-11",     // v2.1+ 可选；不可早于 startDate
  reqNature: "BIZ" | "TECH", // v2.6+ 可选；需求性质（默认 BIZ；实施排期聚合分流依据）
  bizContactName: "张三"      // v2.6+ 可选；业务对接人（≤64 字）；v2.7 起排期写入时必填校验（REQ 关联 / TECH / NON_FEATURE 豁免）
}
Response: EmptyVO
# v2.1 区间排期双写联动：
#   · 只传 scheduledDate（旧前端）→ 后端联动 start_date = end_date = scheduledDate；
#   · 传 startDate+endDate（新前端）→ 后端联动 scheduled_date = startDate（月视图索引锚点）；
#   · clearScheduledDate=true / 移入非需求改动 → scheduled_date / start_date / end_date 三字段同清 NULL。
# 校验：startDate/endDate 缺一 → FS_SCHEDULE_RANGE_INCOMPLETE；endDate < startDate → FS_SCHEDULE_RANGE_INVALID。
#   NON_FEATURE 上做任何排期修改 → FS_STATUS_NOT_ALLOW。
# 合并卡排期变更在同一事务内扩散写入所有子卡的三字段。
# v2.7 业务对接人校验（时点自 v2.6「保存/建卡时」前移至「排期写入时」）：本次请求写入排期
#   （scheduledDate/startDate 由空到有或变更；clearScheduledDate 清空不触发）且该卡无 REQ 单关联
#   （requirement.linked_card_no 同库反查无命中）且 reqNature≠TECH 且 bizContactName 为空
#   → 400 FS_BIZ_CONTACT_REQUIRED（BIZ.FS.017，文案「排期前请先填写业务对接人」）；
#   REQ 关联 / TECH / NON_FEATURE 豁免；纯字段保存与 POST /cards（手动建卡 / 采集 Job）不再校验；
#   存量无对接人卡不批量回填，下次排期写入时被拦截补录、自然收口。
#   reqNature / bizContactName 不参与合并卡扩散（功能粒度字段，合并卡按自身维护）。
```

```
# 标记完成（多仓库 commit，升级后）
POST /api/v1/inner/snackingdom/schedule/cards/mark-done
Request:
{
  "cardNo": "FS-20260507-001",
  "doneCommits": [
    { "repo": "snackingdom-mall-web", "commitHash": "b7e1d44" },
    { "repo": "busyming-snackingdom",  "commitHash": "a3f9c2d" }
  ]
}
Response:
{
  "doneCommits": [
    { "repo": "snackingdom-mall-web", "commitHash": "b7e1d44...", "shortHash": "b7e1d44",
      "commitUrl": "https://codeup.aliyun.com/.../commit/b7e1d44",
      "message": "fix(...)", "authorName": "张三", "authoredAt": "2026-05-07T10:21:00+08:00" },
    { "repo": "busyming-snackingdom", "commitHash": "a3f9c2d...", "shortHash": "a3f9c2d", ... }
  ]
}
# 请求体按 (repo, commitHash) 去重；commitHash 需 ≥ 6 字符。
# doneCommits 选填（v1.3 起）：缺省或空数组 = 不关联完成 commit，仅切换状态，done_repo/done_commit_hash/done_commit_url 显式置 NULL。
# 后端逐条调用 commitFetcher.findCommit 反查元信息，任一条不存在则返回 FS_COMMIT_NOT_FOUND。
# 落库：feat_schedule_card.done_commits (JSON) 写完整列表；done_repo / done_commit_hash / done_commit_url 同步首项（兼容老代码路径）。
# 流水 MARKED_DONE 详情列出全部 “{repo} / {shortHash}”；未关联 commit 时写「标记完成（未关联完成 commit）」；集合未变化不重复写流水。
```

> 版本历史：首版仅支持单一 `doneRepo + doneCommitHash` 入参；本次升级后为了不破坏历史存量卡片，老字段仍以“首项”同步保存。详见 [done-commits-multi-repo-upgrade.md](done-commits-multi-repo-upgrade.md)。

```
# 回退（分叉：可选 targetStatus）
POST /api/v1/inner/snackingdom/schedule/cards/revert
Request: {
  cardNo: "FS-20260507-001",
  targetStatus: "PENDING" | "IN_PROGRESS" | null   // 可选，默认 PENDING
}
Response: EmptyVO
# 状态守卫：仅 status=DONE 可调起，其他状态返回 FS_STATUS_NOT_ALLOW。
# 分叉：
#   targetStatus=PENDING（默认）  → status=PENDING，同事务清空 done_repo / done_commit_hash / done_commit_url
#                                /done_commits / done_at，并清空 dev_user_id / dev_user_name / dev_taken_at。
#   targetStatus=IN_PROGRESS    → status=IN_PROGRESS，仅清空 done_* 五字段，保留 dev_* 三字段。
#                                  若 dev_user_id IS NULL 则降级到 PENDING 路径。
# 流水 REVERTED 的 detail 分别为「已回退为「待开发」」 / 「已回退为「开发中」，保留开发人 {dev_user_name}」。
# MyBatis-Plus 必须使用 LambdaUpdateWrapper.set(field, null) 显式设 null。
```

```
# 领取卡片（PENDING → IN_PROGRESS）
POST /api/v1/inner/snackingdom/schedule/cards/take
Request: { cardNo: "FS-20260507-001" }
Response: EmptyVO
# 状态守卫：仅 status=PENDING 可调起，其他状态返回 FS_STATUS_NOT_ALLOW。
# 起响业务：status=IN_PROGRESS；同事务写入 dev_user_id / dev_user_name / dev_taken_at = NOW()
#         （账号上下文取 LoginContext.get()，dev_user_name 优先 realName 后 username，未登录场景兑底 -1 / 「未知」）。
# 写流水 op_type=TAKEN，detail = 「领取开发：{dev_user_name}」。
```

```
# 释放卡片（IN_PROGRESS → PENDING）
POST /api/v1/inner/snackingdom/schedule/cards/release
Request: { cardNo: "FS-20260507-001" }
Response: EmptyVO
# 状态守卫：仅 status=IN_PROGRESS 可调起，其他状态返回 FS_STATUS_NOT_ALLOW。
# 起响业务：status=PENDING；同事务使用 LambdaUpdateWrapper.set(field, null) 清空 dev_user_id / dev_user_name / dev_taken_at。
# 写流水 op_type=RELEASED，detail = 「释放开发：{原 dev_user_name}」。
```

```
# 删除卡片（软删）
POST /api/v1/inner/snackingdom/schedule/cards/delete
Request: { cardNo: "FS-20260507-001" }
Response: EmptyVO
# deleted_flag=1，写流水 DELETED。
```

```
# 卡片操作流水（抽屉时间线）
POST /api/v1/inner/snackingdom/schedule/cards/logs
Request: { cardNo: "FS-20260507-001" }
Response: { list: [CardLogVO, ...] }  // operated_at DESC
```

### 2.3 研发仓与 commit（完成 commit 选择器）

```
POST /api/v1/inner/snackingdom/schedule/repos
Response: { list: [RepoVO, ...] }
# RepoVO = { repo, name, defaultBranch, cardPoolSource }
# cardPoolSource=true 表示该仓为卡片池采集源（skills 仓库），前端「skills 仓库筛选」下拉仅列出该值为 true 的仓
# 来源：Nacos 配置 schedule.repos，启动时加载；或库表 feat_schedule_repo（本期不建，用配置即可）
```

```
POST /api/v1/inner/snackingdom/schedule/repos/commits
Request: { repo: "snackingdom-mall-web", branch: "main", q: "pick", limit: 50 }
Response: { list: [CommitVO, ...] }
# CommitVO = { hash, shortHash, author, authoredAt, message, url }
# 后端代理云效 Codeup OpenAPI，或基于 webhook 回流的本地缓存查询；本期默认走 Mock 实现。
# q 关键字模糊 = hash 前缀 / message（前端请求字段必须是 q，不是 keyword）。
# 云效 search 参数仅匹配提交信息、不匹配 SHA；q 命中 6~40 位十六进制时，
# 后端先走 GET /commits/{sha} 精确解析并置顶合并去重，解析失败退化为最近 100 条本地 hash 前缀过滤兜底。
# branch 缺省 = 仓配置 defaultBranch；前端选择器暴露分支输入（v2.7.1，手改按仓 localStorage 记忆）——
# 日常提交在迭代集成分支，仅查 defaultBranch 会让候选停更在 master 发版点。
```

```
POST /api/v1/inner/snackingdom/schedule/repos/branches
Request: { repo: "snackingdom-mall-web" }
Response: { list: ["main", "feature/20260806_0806", ...] }  # 分支名字符串数组
# v2.7.2 新增，供 commit 选择器分支下拉（可输可选）。
# 排序：仓配置 defaultBranch 置顶，其余按云效 updated_desc（最近活跃）；封顶 50。
# 云效 CI 一次性 release 分支（release/yyyyMMdd-{毫秒}_release_{n}_{n}）后端过滤。
# 老后端无此端点时前端静默降级为纯输入，前后端可独立发布。
```

### 2.4 非需求改动（NON_FEATURE 旁路态）

```
# 移入非需求改动
POST /api/v1/inner/snackingdom/schedule/cards/move-to-non-feature
Request: { cardNo: "FS-20260507-001" }
Response: EmptyVO
# 限制：仅允许从 PENDING / DONE 调起；NON_FEATURE 重复调用返回 FS_STATUS_NOT_ALLOW。
# 起响业务：status = NON_FEATURE；同事务一次性清空 scheduled_date / done_repo / done_commit_hash
#         / done_commit_url / done_commits / done_at；写流水 op_type = EDITED，detail = 「从『X』移入非需求改动、已清空排期与完成 commit」。
# MyBatis-Plus 必须使用 LambdaUpdateWrapper.set(field, null) 显式设 null，避免 BaseEntity 反向覆盖。
```

```
# 从非需求改动恢复为待开发
POST /api/v1/inner/snackingdom/schedule/cards/restore-from-non-feature
Request: { cardNo: "FS-20260507-001" }
Response: EmptyVO
# 限制：仅允许从 NON_FEATURE 调起；其他状态返回 FS_STATUS_NOT_ALLOW。
# 起响业务：status = PENDING；scheduled_date 保持 NULL（回到 Backup 池）；写流水 op_type = EDITED，
#         detail = 「从非需求改动恢复为待开发」。
```

```
# 查询非需求改动列表（全局，不分月，分页）
POST /api/v1/inner/snackingdom/schedule/cards/non-feature/list
Request: { pageNum: 1, pageSize: 20 }   // pageNum 缺省 1，pageSize 缺省 20，上限 100
Response: {
  records: [CardVO, ...],   // 当前页记录，按 created_at DESC
  total:   42,              // 总记录数
  pageNum: 1,               // 页码回显
  pageSize: 20              // 页大小回显
}
# 供工具栏「🔧 非需求改动」计数与弹层分页列表使用。月视图 / Backup 后端会主动过滤掉
# status=NON_FEATURE，前端 cards.value 不会包含 NON_FEATURE 卡片。
```

### 2.7 卡片合并（v1.8+ 同模块多卡聚合）

```
# 创建合并卡（同模块多选 → 输入标题 → 生成合并卡）
POST /api/v1/inner/snackingdom/schedule/cards/merge
Request: {
  title: "门店要货流程优化",                    // ≤ 30 字，空串拒绝
childCardNos: ["FS-20260514-001","FS-20260513-002"]   // ≥ 2
}
Response: { cardNo: "FS-20260514-003" }
# 服务端：同模块校验 → 扁平化（若 child 中含 is_merged=1的 M_old）→ 生成合并卡 → 子卡挂接 + 快照
# 错误码：FS_MERGE_AT_LEAST_TWO / FS_MERGE_SAME_MODULE_REQUIRED / FS_MERGE_STATUS_NOT_ALLOW / FS_MERGE_ALREADY_CHILD
# 流水：合并卡写 CREATED（“合并自 N 张：{cardNo1}, ...”）；每张子卡写 EDITED（“并入合并卡 {mergeCardNo}”）；扁平化 M_old 写 DELETED（“被合并至 {M_new.cardNo}”）
```

```
# 合并卡明细（抽屉「明细 Tab」调用）
POST /api/v1/inner/snackingdom/schedule/cards/merge-items/list
Request: { cardNo: "FS-20260514-003" }
Response: { list: [FeatScheduleMergeItemVO, ...] }
# 限制：cardNo 必须指向 is_merged=1 的合并卡，否则返回 FS_STATUS_NOT_ALLOW
```

```
# 解散合并（子卡按快照恢复独立）
POST /api/v1/inner/snackingdom/schedule/cards/dissolve
Request: { cardNo: "FS-20260514-003" }
Response: EmptyVO
# 限制：仅 is_merged=1 可调起；合并卡 status=DONE 时拒绝（需先 revert），返回 FS_STATUS_NOT_ALLOW
# 起响业务：事务内逐张按 merge_item.pre_merge_* 快照恢复子卡（status / scheduled_date / dev_*），置 parent_merge_card_no=NULL；
#         若快照 scheduled_date < today 则强制置 NULL（子卡回 Backup）；DELETE 该合并卡下所有 merge_item；
#         合并卡自身 deleted_flag=1。
# 流水：合并卡写 DELETED（“解散合并，子卡恢复独立（N 张）”）；每张子卡写 EDITED（“从合并 {mergeCardNo} 解散恢复”）
```

**现有接口扩散语义**：

- `POST /cards/take` `/cards/release` `/cards/mark-done` `/cards/revert` `/cards/update`：当 `cardNo` 指向 `is_merged=1` 的合并卡时，服务端在**同一事务**内扩散写入所有子卡的同名字段（值与合并卡一致），**不为子卡单独写流水**；对 `parent_merge_card_no` 非空的子卡直接调起这些接口返回 `FS_CHILD_LOCKED`（40901）
- `POST /cards/delete`：对合并卡 = 等同 `POST /cards/dissolve` + 软删合并卡；对子卡返回 `FS_CHILD_LOCKED`
- `POST /cards/month`：默认过滤 `parent_merge_card_no IS NULL`，子卡不在月视图 / Backup 返回
- `POST /cards/non-feature/list`：同样过滤 `parent_merge_card_no IS NULL`（子卡不可单独切 NON_FEATURE，不可能出现在该列表）

### 2.5 发版日

```
POST /api/v1/inner/snackingdom/schedule/release-days/list
Request: { month: "2026-05" }
Response: { list: ["2026-05-15", "2026-05-30"] }

POST /api/v1/inner/snackingdom/schedule/release-days/toggle
Request: { releaseDate: "2026-05-15" }
Response: { marked: true }   // true=新增标记 false=取消标记
```

### 2.6 ~~模块编码映射~~（已下线）

> v1.7 起 `feat_schedule_module_code` 表与 `/schedule/module-codes/list` 接口已删除：模块标签由 commit message Conventional Commit 头部解析得到，cardNo 与模块解耦统一前缀 `FS-`。详见 [job-schedule.md §4](job-schedule.md#41-sourcemodule-识别规则commit-message-解析)。

## 3. VO 定义

### CardVO

```json
{
  "cardNo": "FS-20260507-001",
  "title": "分拣超时",
  "content": "fix(pick): 修复分拣任务超时不释放的问题",
  "ownerUserId": 1001,
  "ownerName": "张三",
  "status": "PENDING",        // PENDING / IN_PROGRESS / DONE / NON_FEATURE
  "scheduledDate": "2026-05-09",   // 月视图索引锚点（区间排期下 = startDate）；null=Backup 池
  "startDate": "2026-05-09",       // v2.1 新增：排期开始日期；与 endDate 成对；null=未排期
  "endDate": "2026-05-11",         // v2.1 新增：排期结束日期（含）；endDate >= startDate
  "sourceRepo": "snackingdom-mall-web",
  "sourceModule": "store-request",
  "sourceCommitHash": "a3f9c2d",
  "hardwareManagement": null,
  "devUserId": null,           // v1.6 新增：开发人 ID（take-card / mark-done autoFillDev / DONE→IN_PROGRESS revert 保留）
  "devUserName": null,         // v1.6 新增：开发人姓名（realName 优先，未登录兑底「未知」）
  "devTakenAt": null,          // v1.6 新增：领取时间（yyyy-MM-dd HH:mm:ss）
  "isMerged": false,           // v1.8 新增：1=合并卡（聚合卡）0=普通卡/子卡
  "parentMergeCardNo": null,   // v1.8 新增：子卡指向合并卡的 card_no；NULL=独立卡或合并卡自身
  "doneCommits": [],
  "doneRepo": null,
  "doneCommitHash": null,
  "doneCommitUrl": null,
  "doneAt": null,
  "createdAt": "2026-05-07 09:12",
  "updatedAt": "2026-05-07 09:12"
}
```

### CardLogVO

```json
{
  "opType": "MARKED_DONE",
  "opTypeLabel": "标记完成",
  "opDetail": "关联完成 commit：snackingdom-mall-web / b7e1d44",
  "operatorId": 1004,
  "operatorName": "李四",
  "operatedAt": "2026-05-07 16:30"
}
```

### FeatScheduleMergeItemVO

```json
{
  "childCardNo": "FS-20260513-002",
  "title": "修复分拣超时",
  "sourceModule": "store-request",
  "preMergeStatus": "PENDING",                // 进入合并前的快照
  "preMergeScheduledDate": "2026-05-13",       // 进入合并前的日期；null=来自 Backup
  "preMergeDevUserName": null,                 // 进入合并前如已领取则非空
  "addedAt": "2026-05-14 09:12:33"             // 挂入合并卡时间
}
```

## 4. 业务错误码

| code  | message                | 触发场景                  |
|-------|------------------------|-----------------------|
| 40001 | 参数非法                   | `cardNo`/`repo` 等必填为空；merge 入参子卡不足 2 张（FS_MERGE_AT_LEAST_TWO）；merge 入参子卡 sourceModule 不一致（FS_MERGE_SAME_MODULE_REQUIRED） |
| 40001 | 排期起止日期需成对提供       | v2.1：`/cards/update` 只传 startDate/endDate 其一（FS_SCHEDULE_RANGE_INCOMPLETE，BIZ.FS.015） |
| 40001 | 排期结束日期不可早于开始日期   | v2.1：`/cards/update` 传 endDate < startDate（FS_SCHEDULE_RANGE_INVALID，BIZ.FS.016） |
| 40001 | 排期前请先填写业务对接人       | v2.7：`/cards/update` 写入排期（排期/改期，清空排期除外）时，无 REQ 单关联且 reqNature≠TECH 且 bizContactName 为空（FS_BIZ_CONTACT_REQUIRED，BIZ.FS.017；REQ 关联/TECH/NON_FEATURE 豁免，纯字段保存与建卡不触发；自 v2.6「保存/手动建卡时必填」同码前移改义） |
| 40400 | 卡片不存在                  | 目标卡片已被删除或 cardNo 错误  |
| 40901 | 状态不允许此操作               | 例：对 DONE 卡调用 mark-done；NON_FEATURE 上调用 mark-done / update.scheduledDate；非 NON_FEATURE 调用 restore-from-non-feature；非 PENDING 调用 take-card；非 IN_PROGRESS 调用 release-card；非 DONE 调用 revert；非合并卡调用 dissolve / merge-items/list；子卡（parent_merge_card_no 非空）调用写接口（FS_CHILD_LOCKED）；DONE 合并卡调用 dissolve；merge 入参包含非 PENDING/IN_PROGRESS 卡（FS_MERGE_STATUS_NOT_ALLOW）；merge 入参包含他人子卡（FS_MERGE_ALREADY_CHILD） |
| 40902 | 选中的 commit 不在仓库内       | mark-done 校验失败        |
| 40903 | 源 commit 已生成卡片         | POST /cards 幂等命中，返回旧单 |
| 50000 | 系统异常                   | DB/Codeup 代理异常        |

## 5. 幂等约束

- `POST /cards`：`(sourceRepo, sourceCommitHash)` 唯一，重复调用返回同一 `cardNo` 且 `firstTime=false`
- `POST /cards/mark-done`：同一卡片重复提交相同的 `doneCommits` 集合不报错，且不重复写 `MARKED_DONE` 流水；集合变化时（增/删/换）：首次从 PENDING 切入写 `MARKED_DONE`，已 DONE 仅调整集合写 `EDITED`
- `POST /cards/move-to-non-feature` / `restore-from-non-feature`：同状态重复调用返回 FS_STATUS_NOT_ALLOW（不幂等透过），避免隐藏误操作
- `POST /cards/merge`：**非幂等**接口，每次成功都会生成新合并卡 `cardNo`；重复提交相同 `childCardNos` 会因第二次命中「子卡已被合并」而返回 `FS_MERGE_ALREADY_CHILD`
- `POST /cards/dissolve`：同一合并卡重复解散返回 40400（已软删）

## 6. 参考

- 实现细节 → [implementation-steps.md](implementation-steps.md)
- 前端数据流 → [frontend-guide.md](frontend-guide.md)
- 状态机规则 → [business-rules.md](business-rules.md)
