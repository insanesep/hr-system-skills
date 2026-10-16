---
name: feature-schedule-implementation-steps
description: 系统功能排期模块 - 后端实现步骤、文件清单、包路径
---

# 系统功能排期 - 后端实现步骤

## 1. 模块划分与文件清单

### 1.1 busyming-snackingdom-api

```
io.busyming.basic.snackingdom.api
├── enums
│   ├── FeatScheduleStatusEnum.java          # PENDING / DONE
│   └── FeatScheduleOpTypeEnum.java          # CREATED / SCHEDULED / ...
├── request.schedule
│   └── FeatScheduleRequest.java             # 外壳类：Month / CreateCard / UpdateCard / MarkDone / NoReq / CommitsQuery / MonthReq / ReleaseDayReq
└── response.schedule
    ├── FeatScheduleCardVO.java
    ├── FeatScheduleCardLogVO.java
    ├── FeatScheduleMonthVO.java
    ├── FeatScheduleRepoVO.java
    ├── FeatScheduleCommitVO.java
    ├── FeatScheduleCollectVO.java            # 采集结果统计（含 skippedByPath）
    ├── FeatScheduleModuleCodeVO.java
    └── FeatScheduleMarkDoneVO.java
```

### 1.2 busyming-snackingdom-domain

```
io.busyming.basic.snackingdom.domain.snackingdom
├── entity
│   ├── FeatScheduleCardDO.java
│   ├── FeatScheduleCardLogDO.java
│   ├── FeatScheduleReleaseDayDO.java
│   ├── FeatScheduleCardMergeItemDO.java   # v1.8+ 合并卡 ↔ 子卡关系与快照
│   └── FeatScheduleModuleCodeDO.java
└── mapper
    ├── FeatScheduleCardMapper.java
    ├── FeatScheduleCardLogMapper.java
    ├── FeatScheduleReleaseDayMapper.java
    ├── FeatScheduleCardMergeItemMapper.java  # v1.8+
    └── FeatScheduleModuleCodeMapper.java
```

XML: `busyming-snackingdom-domain/src/main/resources/mapper/snackingdom/FeatScheduleCardMapper.xml`
（仅卡片主表需要自定义 MAX 序号查询，其余用 BaseMapper 原生）

### 1.3 busyming-snackingdom-service

```
io.busyming.basic.snackingdom.service.schedule
├── FeatureScheduleService.java              # 接口
├── FeatureScheduleServiceImpl.java          # 实现
├── FeatScheduleCollectService.java          # 采集服务接口
├── FeatScheduleCollectServiceImpl.java      # 采集服务实现（过滤 + 模块识别 + 路径过滤）
├── FeatScheduleCardNoGenerator.java         # 编号生成
├── FeatScheduleLogWriter.java               # 流水写入工具
├── FeatScheduleCommitFetcher.java           # 抽象接口
└── CodeupFeatScheduleCommitFetcher.java     # Codeup 真实实现（listCommits / findCommit / listChangedPaths）
```

### 1.4 busyming-snackingdom-web

```
io.busyming.basic.snackingdom.web.controller
└── FeatureScheduleController.java
```

## 2. 关键实现要点

### 2.1 统一数据源

- DO 继承 `BaseEntity`，审计字段走 `SnackingdomMetaObjectHandler`
- Service 方法标注 `@Transactional(rollbackFor=Exception.class, transactionManager="snackingdomTransactionManager")`
- 所有 Mapper.xml 放在 `mapper/snackingdom/` 下，Nacos 配置已将此目录扫描入 SqlSessionFactory

### 2.2 CardNo 生成器

**v1.7+ 实现（与模块解耦，全局统一前缀 FS）**：

```java
@Component
@RequiredArgsConstructor
public class FeatScheduleCardNoGenerator {
    private static final String PREFIX = "FS";
    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");
    private final FeatScheduleCardMapper cardMapper;

    /** 需在调用方 @Transactional 内执行。*/
    public String next(LocalDate date) {
        String prefix = PREFIX + "-" + date.format(YMD) + "-";
        // SELECT MAX(card_no) FROM feat_schedule_card
        //   WHERE card_no LIKE 'FS-20260507-%' FOR UPDATE
        String maxNo = cardMapper.selectMaxCardNoForUpdate(prefix + "%");
        int seq = (maxNo == null || maxNo.length() <= prefix.length())
                ? 1
                : Integer.parseInt(maxNo.substring(prefix.length())) + 1;
        return prefix + String.format("%03d", seq);
    }
}
```

Mapper XML:

```xml
<select id="selectMaxCardNoForUpdate" resultType="string">
    SELECT MAX(card_no) FROM feat_schedule_card
    WHERE card_no LIKE #{likePattern} AND deleted_flag = 0
    FOR UPDATE
</select>
```

### 2.3 流水写入工具

```java
@Component
@RequiredArgsConstructor
public class FeatScheduleLogWriter {
    private final FeatScheduleCardLogMapper logMapper;

    public void write(String cardNo, FeatScheduleOpTypeEnum op, String detail) {
        LoginUserInfo user = LoginContext.get();
        FeatScheduleCardLogDO log = new FeatScheduleCardLogDO();
        log.setCardNo(cardNo);
        log.setOpType(op.name());
        log.setOpDetail(detail);
        log.setOperatorId(user == null || user.getUserId() == null ? -1L : user.getUserId());
        log.setOperatorName(user == null || user.getRealName() == null ? "系统" : user.getRealName());
        logMapper.insert(log);
    }
}
```

### 2.4 FeatureScheduleServiceImpl 主要方法签名

```java
public interface FeatureScheduleService {
    FeatScheduleMonthVO month(FeatScheduleRequest.MonthReq req);
    Map<String, Object> createFromCommit(FeatScheduleRequest.CreateCard req);   // 幂等
    void updateCard(FeatScheduleRequest.UpdateCard req);
    Map<String, Object> markDone(FeatScheduleRequest.MarkDone req);
    void revert(FeatScheduleRequest.NoReq req);
    void deleteCard(FeatScheduleRequest.NoReq req);
    List<FeatScheduleCardLogVO> logs(FeatScheduleRequest.NoReq req);
    List<FeatScheduleRepoVO> repos();
    List<FeatScheduleCommitVO> commits(FeatScheduleRequest.CommitsQuery req);
    List<String> releaseDays(FeatScheduleRequest.MonthReq req);
    Map<String, Object> toggleReleaseDay(FeatScheduleRequest.ReleaseDayReq req);
    // v1.7 起删除 moduleCodes()：模块字典 feat_schedule_module_code 已下线
}
```

### 2.5 月视图查询

```java
@Override
public FeatScheduleMonthVO month(FeatScheduleRequest.MonthReq req) {
    YearMonth ym = YearMonth.parse(req.getMonth());
    LocalDate first = ym.atDay(1), last = ym.atEndOfMonth();

    List<FeatScheduleCardDO> cards = cardMapper.selectList(
        new LambdaQueryWrapper<FeatScheduleCardDO>()
            .between(FeatScheduleCardDO::getScheduledDate, first, last)
            .orderByAsc(FeatScheduleCardDO::getScheduledDate));

    List<FeatScheduleCardDO> backup = Boolean.TRUE.equals(req.getIncludeBackup())
        ? cardMapper.selectList(new LambdaQueryWrapper<FeatScheduleCardDO>()
            .isNull(FeatScheduleCardDO::getScheduledDate)
            .orderByDesc(FeatScheduleCardDO::getCreatedAt))
        : Collections.emptyList();

    FeatScheduleMonthVO vo = new FeatScheduleMonthVO();
    vo.setMonth(req.getMonth());
    vo.setCards(cards.stream().map(this::toVO).collect(Collectors.toList()));
    vo.setBackup(backup.stream().map(this::toVO).collect(Collectors.toList()));
    return vo;
}
```

### 2.6 Codeup 代理

- `FeatScheduleCommitFetcher` 抽象接口，`CodeupFeatScheduleCommitFetcher` 为真实实现
- 通过 `@ConditionalOnProperty(name="codeup.mock-enabled", havingValue="false")` 控制注入
- Mock 模式下使用 `MockFeatScheduleCommitFetcher`（`havingValue="true"`），保证前端选择器可用

**核心方法**：

| 方法 | 作用 |
|------|------|
| `listRepos()` | 返回配置中所有仓库 VO 列表 |
| `listCommits(repo, branch, keyword, since, until, perPage)` | 拉取指定仓 + 分支的 commit 列表 |
| `findCommit(repo, hash)` | 按 SHA 获取单个 commit 详情 |
| `listChangedPaths(repo, commitHash)` | 拉取 commit diff，收集 newPath / oldPath 去重返回 |

### 2.7 路径前缀过滤（FeatScheduleCollectServiceImpl）

采集循环中在 `ignoreAuthors` 过滤之后、入库之前，增加路径前缀白/黑名单校验：

```java
// 从 RepoConfig 读取
List<String> whitelist = src.getPathPrefixWhitelist();
List<String> blacklist = src.getPathPrefixBlacklist();
boolean needPathFilter = (whitelist != null && !whitelist.isEmpty())
        || (blacklist != null && !blacklist.isEmpty());

// 循环内
if (needPathFilter) {
    List<String> changedPaths = codeupFetcher.listChangedPaths(repo, hash);
    if (changedPaths == null || changedPaths.isEmpty()) {
        // 接口异常 → 保守采集 + WARN
    } else {
        // 白名单：非空时至少命中一条前缀才入库
        // 黑名单：非空时全部命中则跳过
    }
}
```

统计字段 `skippedByPath` 同时累加到 `skipped`（总跳过数）中，并在 summary 与 `FeatScheduleCollectVO` 中单独输出。

### 2.8 permCode 前端路由命名对应

前端 route.name 为 `MENU-SYSTEM-FEATURE-SCHEDULE`，path 为 `/feature-schedule`；必须在 `src/router/index.ts` 新增记录。

## 3. 开发验证顺序

1. **建表**：执行 `docs/feature_schedule.sql` 与初始化 INSERT
2. **菜单注册**：执行 `sys_permission` 的 INSERT，给 PM 角色授予权限
3. **后端启动**：`mvn clean install -DskipTests` + `snackingdom-starter` 启动，验证 `/schedule/cards/month` 可访问（`/schedule/module-codes/list` 已下线）
4. **手动造数**：通过 `/schedule/cards` POST 接口塞入 10 条 commit
5. **前端联调**：`npm run dev`，从 Portal 点"系统功能排期"，依次验证 月切换 / 拖拽 / 抽屉 / mark-done / revert / delete / 发版日
6. **回归**：浏览器刷新后数据持久；Backup 池不重复；cardNo 唯一

## 3.1 阶段 v1.8：卡片合并实施步骤

### 3.1.1 建表与扩列

在 `docs/feature_schedule.sql` 追加：

```sql
ALTER TABLE feat_schedule_card
  ADD COLUMN is_merged TINYINT NOT NULL DEFAULT 0 COMMENT 'v1.8+ 合并卡标记：1=合并卡 0=普通卡/子卡' AFTER hardware_management,
  ADD COLUMN parent_merge_card_no VARCHAR(32) NULL COMMENT 'v1.8+ 子卡指向合并卡' AFTER is_merged,
  ADD KEY idx_parent_merge (parent_merge_card_no);

CREATE TABLE IF NOT EXISTS feat_schedule_card_merge_item (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  merge_card_no VARCHAR(32) NOT NULL,
  child_card_no VARCHAR(32) NOT NULL,
  pre_merge_status VARCHAR(16) NOT NULL,
  pre_merge_scheduled_date DATE,
  pre_merge_dev_user_id BIGINT,
  pre_merge_dev_user_name VARCHAR(64),
  pre_merge_dev_taken_at DATETIME,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by BIGINT NOT NULL DEFAULT -1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_child (child_card_no),
  KEY idx_merge (merge_card_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合并卡↔子卡关系与快照';
```

### 3.1.2 API / VO

- `FeatScheduleRequest` 新增内部类：`MergeCard(title, childCardNos)`、`MergeItemsReq(cardNo)`、`DissolveReq(cardNo)`
- `response.schedule` 新增：`FeatScheduleMergeItemVO(childCardNo, title, sourceModule, preMergeStatus, preMergeScheduledDate, preMergeDevUserName, addedAt)`
- `FeatScheduleCardVO` 新增字段：`isMerged: Boolean`、`parentMergeCardNo: String`、`mergeChildrenCount: Integer`（仅合并卡返回）
- `FeatScheduleOpTypeEnum`：复用现有 `CREATED / EDITED / DELETED`，不新增枚举（通过 `op_detail` 区分合并相关行为）
- `BusyErrorCodeEnum` 新增错码：`FS_MERGE_AT_LEAST_TWO(40001)`、`FS_MERGE_SAME_MODULE_REQUIRED(40001)`、`FS_MERGE_STATUS_NOT_ALLOW(40901)`、`FS_MERGE_ALREADY_CHILD(40901)`、`FS_CHILD_LOCKED(40901)`

### 3.1.3 Service 层实现要点

```java
public interface FeatureScheduleService {
    // ... 原有方法 ...
    /** 同模块多卡聚合；返回合并卡 cardNo。*/
    Map<String, Object> mergeCards(FeatScheduleRequest.MergeCard req);
    /** 合并卡明细。*/
    List<FeatScheduleMergeItemVO> mergeItems(FeatScheduleRequest.MergeItemsReq req);
    /** 解散合并：按快照恢复子卡 + 软删合并卡。*/
    void dissolveMerge(FeatScheduleRequest.DissolveReq req);
}
```

**`mergeCards` 伪代码**：

```java
@Transactional(rollbackFor = Exception.class, transactionManager = "snackingdomTransactionManager")
public Map<String, Object> mergeCards(FeatScheduleRequest.MergeCard req) {
    // 1. 基础校验
    if (CollUtil.size(req.getChildCardNos()) < 2) throw new BusyBizException(FS_MERGE_AT_LEAST_TWO);
    if (StrUtil.isBlankIfStr(req.getTitle())) throw new BusyBizException(FS_PARAM_INVALID);

    // 2. 拉取入参卡 + 还原扁平化：若包含 M_old，展开为子卡
    List<FeatScheduleCardDO> inputs = cardMapper.selectList(
        new LambdaQueryWrapper<FeatScheduleCardDO>().in(FeatScheduleCardDO::getCardNo, req.getChildCardNos()));
    List<FeatScheduleCardDO> mergedParents = inputs.stream().filter(c -> Boolean.TRUE.equals(c.getIsMerged())).toList();
    List<FeatScheduleCardDO> flatChildren = new ArrayList<>();
    for (FeatScheduleCardDO c : inputs) {
        if (Boolean.TRUE.equals(c.getIsMerged())) {
            // 读取 merge_item.child_card_no 展开
            flatChildren.addAll(cardMapper.selectList(
                new LambdaQueryWrapper<FeatScheduleCardDO>()
                    .eq(FeatScheduleCardDO::getParentMergeCardNo, c.getCardNo())));
        } else {
            flatChildren.add(c);
        }
    }

    // 3. 校验：同模块、状态合法、非他人子卡
    String module = flatChildren.get(0).getSourceModule();
    for (FeatScheduleCardDO c : flatChildren) {
        if (!Objects.equals(c.getSourceModule(), module)) throw new BusyBizException(FS_MERGE_SAME_MODULE_REQUIRED);
        if (!Set.of("PENDING", "IN_PROGRESS").contains(c.getStatus())) throw new BusyBizException(FS_MERGE_STATUS_NOT_ALLOW);
        // 已是他人子卡（来源不是本次 M_old）
        if (StrUtil.isNotBlank(c.getParentMergeCardNo())
                && mergedParents.stream().noneMatch(p -> p.getCardNo().equals(c.getParentMergeCardNo())))
            throw new BusyBizException(FS_MERGE_ALREADY_CHILD);
    }

    // 4. 生成合并卡
    LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
    String mergeCardNo = cardNoGenerator.next(today);
    FeatScheduleCardDO mergeCard = new FeatScheduleCardDO();
    mergeCard.setCardNo(mergeCardNo);
    mergeCard.setTitle(req.getTitle());
    mergeCard.setContent(buildMergedContent(flatChildren));
    LoginUserInfo user = LoginContext.get();
    mergeCard.setOwnerUserId(user.getUserId());
    mergeCard.setOwnerName(user.getRealName());
    mergeCard.setStatus("PENDING");
    // 子卡存在已排期日期 → 取最早排期日；全部未排期 → NULL 回 Backup
    LocalDate inheritedDate = flatChildren.stream().map(FeatScheduleCardDO::getScheduledDate)
            .filter(Objects::nonNull).min(LocalDate::compareTo).orElse(null);
    mergeCard.setScheduledDate(inheritedDate);
    mergeCard.setSourceRepo("_merge");
    mergeCard.setSourceModule(module);
    mergeCard.setSourceCommitHash("MERGE:" + mergeCardNo);
    mergeCard.setIsMerged(true);
    cardMapper.insert(mergeCard);

    // 5. 挂接子卡 + 快照
    //    扁平化：旧 M_old 的 merge_item 直接 UPDATE 其 merge_card_no=mergeCardNo（保留原快照）
    for (FeatScheduleCardDO m : mergedParents) {
        mergeItemMapper.update(null, Wrappers.<FeatScheduleCardMergeItemDO>lambdaUpdate()
            .eq(FeatScheduleCardMergeItemDO::getMergeCardNo, m.getCardNo())
            .set(FeatScheduleCardMergeItemDO::getMergeCardNo, mergeCardNo));
        // M_old 软删
        cardMapper.update(null, Wrappers.<FeatScheduleCardDO>lambdaUpdate()
            .eq(FeatScheduleCardDO::getCardNo, m.getCardNo())
            .set(FeatScheduleCardDO::getDeletedFlag, 1));
        logWriter.write(m.getCardNo(), DELETED, "被合并至 " + mergeCardNo);
    }
    //    新选中卡（非 M_old）新增 merge_item 行 + 覆盖子卡字段
    for (FeatScheduleCardDO c : flatChildren) {
        if (mergeItemMapper.selectByChildCardNo(c.getCardNo()) == null) {
            FeatScheduleCardMergeItemDO item = new FeatScheduleCardMergeItemDO();
            item.setMergeCardNo(mergeCardNo);
            item.setChildCardNo(c.getCardNo());
            item.setPreMergeStatus(c.getStatus());
            item.setPreMergeScheduledDate(c.getScheduledDate());
            item.setPreMergeDevUserId(c.getDevUserId());
            item.setPreMergeDevUserName(c.getDevUserName());
            item.setPreMergeDevTakenAt(c.getDevTakenAt());
            item.setAddedBy(user.getUserId());
            mergeItemMapper.insert(item);
        }
        // 子卡挂载 + 同步字段
        cardMapper.update(null, Wrappers.<FeatScheduleCardDO>lambdaUpdate()
            .eq(FeatScheduleCardDO::getCardNo, c.getCardNo())
            .set(FeatScheduleCardDO::getParentMergeCardNo, mergeCardNo)
            .set(FeatScheduleCardDO::getStatus, mergeCard.getStatus())
            .set(FeatScheduleCardDO::getScheduledDate, mergeCard.getScheduledDate())
            .set(FeatScheduleCardDO::getDevUserId, null)
            .set(FeatScheduleCardDO::getDevUserName, null)
            .set(FeatScheduleCardDO::getDevTakenAt, null));
        logWriter.write(c.getCardNo(), EDITED, "并入合并卡 " + mergeCardNo);
    }

    // 6. 合并卡流水
    logWriter.write(mergeCardNo, CREATED, "合并自 " + flatChildren.size() + " 张：" +
        flatChildren.stream().map(FeatScheduleCardDO::getCardNo).collect(Collectors.joining(", ")));
    return Map.of("cardNo", mergeCardNo);
}
```

**`dissolveMerge` 要点**：

1. `cardMapper.selectByCardNo(cardNo)` —— 验 `is_merged=1`；`status=DONE` 拒绝
2. `mergeItemMapper.selectList(eq merge_card_no)` 遍历
3. 逐张子卡：`LambdaUpdateWrapper.set(status, preStatus).set(scheduledDate, preDate).set(devUserId, preDevId)...`；若 `preDate != null && preDate < today` 则 `.set(scheduledDate, null)` 并在流水 detail 标注
4. `mergeItemMapper.delete(eq merge_card_no)` 清掉关系行
5. 合并卡 `deleted_flag=1`
6. 写流水：合并卡 `DELETED`，每子卡 `EDITED`

**现有接口扩散**：在 `take / release / markDone / revert / updateCard / deleteCard` 之前引入 `dispatchIfMerge(card, action)`：
- 若 `card.parentMergeCardNo 非空` → throw `FS_CHILD_LOCKED`
- 若 `card.isMerged = true` → 执行原逻辑后，同事务对子卡集合 batch UPDATE 同名字段（不写子卡流水）

### 3.1.4 Controller

```java
@PostMapping("/cards/merge")          public Map<String,Object> merge(@RequestBody FeatScheduleRequest.MergeCard req) { return service.mergeCards(req); }
@PostMapping("/cards/merge-items/list") public Map<String,Object> mergeItems(@RequestBody FeatScheduleRequest.MergeItemsReq req) { return Map.of("list", service.mergeItems(req)); }
@PostMapping("/cards/dissolve")        public EmptyVO dissolve(@RequestBody FeatScheduleRequest.DissolveReq req) { service.dissolveMerge(req); return EmptyVO.INSTANCE; }
```

### 3.1.5 前端改造概要

1. `src/api/schedule.ts`：新增 `mergeCards / mergeItemsList / dissolveMerge` 三个方法
2. `FeatureSchedule.vue`：按 [frontend-guide.md §11](frontend-guide.md#11-卡片合并v18)添加多选态开关 / 勾选 UI / 悬浮操作条 / 标题输入对话框 / 合并卡样式 / 抽屉 Tab 切换 / 明细表格 / 解散按钮
3. 类型定义：`FeatScheduleCardVO` 增 `isMerged / parentMergeCardNo / mergeChildrenCount`
4. 路由守卫与菜单无变化，复用现有 `MENU:SYSTEM:FEATURE_SCHEDULE`

### 3.1.6 验证步骤

1. 造数：同模块 3 张 PENDING 卡 + 1 张 IN_PROGRESS 卡（已领取开发人）
2. 多选合并 → 生成合并卡 M1；验证：Backup/月历上 4 张子卡消失、仅出现 M1；M1 抽屉「明细」展示 4 张子卡与 preMerge 快照
3. 对 M1 「领取开发」→ `take`；验证 4 张子卡 status 同步为 IN_PROGRESS 、dev_* 同步为当前操作人
4. 拖动 M1 改期；验证 4 张子卡 scheduledDate 同步
5. M1 + 另一张独立卡 再次合并 → 生成 M2；验证 M1 软删、merge_item.merge_card_no 已迁移至 M2、原 4 张子卡 + 新选中卡全部挂在 M2；preMerge 快照保留原始值不变
6. 解散 M2 → 验证 5 张子卡恢复为各自原状态（长期未排期回 Backup，排过期的回 Backup + 流水注释）
7. M2 DONE 后的解散拒绝；先 revert 再解散

## 4. 日后扩展方向

- ~~**commit 自动采集**：Codeup webhook → `/api/v1/inner/snackingdom/schedule/cards` 直采~~ → **已落地为 SchedulerX 周期 Job 方案**，详见 [job-schedule.md](job-schedule.md)。Webhook 方案作为 Job 上线后的进一步演进项保留。
- **研发仓管理**：将 REPOS 固定配置迁到 `feat_schedule_repo` 表，允许 PM 维护
- **统计视图**：月度完成率、延期率图表（需复用 usage-analytics 的图表组件）
- **App 适配**：本期仅 Web，若 App 需要看排期，读月视图接口即可，无需新增
