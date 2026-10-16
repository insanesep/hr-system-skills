# done_commits 多仓库标记完成 — 升级说明

> 一次开发可能横跨多个仓（web + java + app），需要把这一组 commit 全部登记到同一张排期卡片。
> 本次升级在不破坏存量卡片的前提下，把 `mark-done` 由「单 commit」扩展为「commit 数组」。

## 1. Skill 偏差说明

`SKILL.md`（产品文档）当前仍按「单一完成 commit」描述。开发实施后，已与产品确认：

- 抽屉中「完成 commit」改为多选（可跨仓），按 (repo, commitHash) 唯一去重
- 卡片视图、流水文案需展示全部完成 commit
- 历史卡片仅有 `done_repo / done_commit_hash / done_commit_url` 时，后端按单元素数组兜底返回

请产品在下一次 SKILL.md 修订时同步更新「标记完成」章节。

## 2. 数据模型

### 2.1 DDL 升级

```sql
ALTER TABLE feat_schedule_card
  ADD COLUMN done_commits JSON DEFAULT NULL
  COMMENT '完成 commit 列表 [{repo,commitHash,commitUrl,shortHash,message,authorName,authoredAt}]'
  AFTER done_commit_url;
```

> 字段的完整表结构以本模块 [data-model.md](data-model.md) 为准（不再保留 upgrade 过程脚本；已部署环境手动执行上述 ALTER 即可）。

### 2.2 兼容策略

| 场景 | 写入 | 读取 |
|------|------|------|
| 新版客户端标记完成 | 写 `done_commits` 全量 + `done_repo/hash/url` 同步首项 | 优先 `done_commits` |
| 历史卡片（仅老字段） | 不变 | 后端 fallback 构造单元素数组返回 `doneCommits` |
| 撤回 (revert) | 同时清空 `done_commits` 与三个老字段 | — |

## 3. 后端契约

### 3.1 请求

```http
POST /api/v1/inner/snackingdom/schedule/cards/mark-done
Content-Type: application/json

{
  "cardNo": "MISC-20260507-01",
  "doneCommits": [
    { "repo": "snackingdom-mall-web", "commitHash": "b7e1d44a..." },
    { "repo": "busyming-snackingdom",  "commitHash": "a3f9c2d..." }
  ]
}
```

校验规则：
- `cardNo` 必填，卡片必须存在
- `doneCommits` 选填（v1.3 起）：缺省或空数组 = 不关联完成 commit，仅切换状态；传入时每项 `repo` + `commitHash` 必填，`commitHash.length() ≥ 6`
- 数组按 `(repo, commitHash.toLowerCase())` 去重，保留入参顺序
- 逐条调用 `commitFetcher.findCommit`，任一不存在 → `FS_COMMIT_NOT_FOUND`

### 3.2 响应

```json
{
  "doneCommits": [
    {
      "repo": "snackingdom-mall-web",
      "commitHash": "b7e1d44a...",
      "shortHash": "b7e1d44",
      "commitUrl": "https://codeup.aliyun.com/.../commit/b7e1d44a...",
      "message": "fix(pick): xxx",
      "authorName": "张三",
      "authoredAt": "2026-05-07T10:21:00+08:00"
    }
  ]
}
```

### 3.3 流水（feat_schedule_card_log）

- 集合首次从 PENDING 切入：`MARKED_DONE`，详情形如 `关联完成 commit：repoA / b7e1d44，repoB / a3f9c2d`
- 已 DONE 仅调整集合：`EDITED`，相同详情格式
- 集合未变化：不写流水

## 4. 关键实现点

### 4.1 DO 层 JSON 字段映射

`busyming-snackingdom-domain` 的 [FeatScheduleCardDO.java](../../../../../../busyming-snackingdom/busyming-snackingdom-domain/src/main/java/io/busyming/basic/snackingdom/domain/snackingdom/entity/FeatScheduleCardDO.java) 必须开启 `autoResultMap` + 字段级 `JacksonTypeHandler`：

```java
@TableName(value = "feat_schedule_card", autoResultMap = true)
public class FeatScheduleCardDO extends BaseEntity {
    @TableField(value = "done_commits", typeHandler = JacksonTypeHandler.class)
    private List<DoneCommit> doneCommits;

    @Data
    public static class DoneCommit {
        private String repo;
        private String commitHash;
        private String shortHash;
        private String commitUrl;
        private String message;
        private String authorName;
        /** ISO-8601 字符串，避免 JSON 存储 OffsetDateTime 需要额外 ObjectMapper 配置 */
        private String authoredAt;
    }
}
```

> 注意：domain 内嵌 `DoneCommit` **不引用 api 层** `DoneCommitVO`，避免反向依赖；Service 层在 DO ↔ VO 之间手动转换。

### 4.2 Service 关键方法

`FeatureScheduleServiceImpl`：
- `markDone`：去重 → 反查 → setDoneCommits + 同步首项到老字段 + 写流水
- `revert`：`LambdaUpdateWrapper.set(getDoneCommits, null)` 一并清空
- `toCardVO`：`buildDoneCommitsVO()` 优先用 DO 的 `doneCommits` 转换；为空时由老字段 fallback 构造单元素数组

### 4.3 前端

- `src/api/index.ts`：新增 `FeatScheduleDoneCommitVO`、`FeatScheduleMarkDoneVO`，`FeatScheduleMarkDoneReq.doneCommits` 改为数组
- `src/views/schedule/FeatureSchedule.vue`：抽屉的「完成 commit」改为多选，再点已选项可取消；切仓不清已选；保存时按集合差异判断是否触发 `markDone`

## 5. curl 端到端验证脚本

> 前置：后端启动后获取登录 Cookie / Token 写入 `$AUTH`；下文以 `${BASE}=http://localhost:8080` 为例。

```bash
BASE=http://localhost:8080
AUTH='Cookie: SESSION=xxxxxxxx'   # 或 Authorization: Bearer ...

# 1. 列研发仓
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/repos" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | jq

# 2. 取目标仓最近 commit
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/repos/commits" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"repo":"snackingdom-mall-web","limit":3}' | jq

curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/repos/commits" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"repo":"busyming-snackingdom","limit":3}' | jq

# 3. 多仓库标记完成（替换为真实的 cardNo 与 hash）
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/cards/mark-done" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{
    "cardNo": "MISC-20260507-01",
    "doneCommits": [
      { "repo": "snackingdom-mall-web", "commitHash": "<hashA>" },
      { "repo": "busyming-snackingdom",  "commitHash": "<hashB>" }
    ]
  }' | jq

# 4. 月视图复验：cards / backup 中目标卡片应有 doneCommits 数组（长度 2）
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/cards/month" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"month":"2026-05","includeBackup":true}' | jq '.data.backup[] | select(.cardNo=="MISC-20260507-01")'

# 5. 流水复验：MARKED_DONE 详情应列出全部 “{repo} / {shortHash}”
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/cards/logs" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"cardNo":"MISC-20260507-01"}' | jq '.data[] | select(.opType=="MARKED_DONE")'

# 6. 幂等：再发一次同样的集合 → 不写新流水；预期 logs 数量不变
# 7. 集合修改：仅留一项再次提交 → 写 EDITED 流水
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/cards/mark-done" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{
    "cardNo": "MISC-20260507-01",
    "doneCommits": [{ "repo": "snackingdom-mall-web", "commitHash": "<hashA>" }]
  }' | jq

# 8. 撤回：done_commits 与老字段一并清空
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/cards/revert" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"cardNo":"MISC-20260507-01"}' | jq

# 9. 异常：传不存在的 hash → 期望返回 FS_COMMIT_NOT_FOUND
curl -s -X POST "$BASE/api/v1/inner/snackingdom/schedule/cards/mark-done" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{
    "cardNo": "MISC-20260507-01",
    "doneCommits": [{ "repo": "snackingdom-mall-web", "commitHash": "deadbeef" }]
  }' | jq
```

## 6. 回归用例清单

| # | 用例 | 期望 |
|---|------|------|
| 1 | 新建卡片 → 抽屉切到「开发完成」→ 跨两个仓各选 1 条 → 保存 | `done_commits` 长度 2；老字段保存首项；流水 `MARKED_DONE` |
| 2 | 用例 1 后再次选中已选项 → 数组里被移除 | 抽屉左侧候选取消高亮，右侧已选区列表减少 |
| 3 | 历史 DONE 卡片（仅老字段）打开抽屉 | 已选区显示 1 条（由后端 fallback 构造） |
| 4 | DONE → PENDING 撤回 | 抽屉再次打开时已选区为空；DB `done_commits` IS NULL |
| 5 | 提交相同集合两次 | 第二次不写流水（集合未变） |
| 6 | 提交时数组中夹杂相同 (repo,hash) 重复项 | 后端去重，落库唯一 |
| 7 | 任一 commitHash 不存在 | 返回 `FS_COMMIT_NOT_FOUND`，DB 不变 |

## 7. 后续可能的进一步演进

- 候选列表区域显示已选 commit 的角标数量（避免来回切仓后用户不知已选了多少）
- markDone 响应除 `doneCommits` 外补充 `doneAt`，前端可省去 `loadMonth` 全量重拉
- 如卡片关联仓数量超过 5 个，把 `done_commits` 拆出独立表 `feat_schedule_card_done_commit`
