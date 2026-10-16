# 系统功能排期 — 云效 Codeup 对接

> 本文档记录系统功能排期模块与阿里云云效代码管理（Codeup）OpenAPI 的对接实现细节。
> 所在模块：`busyming-snackingdom/busyming-snackingdom-service`
> API 文档：[依赖文档/API/yunxiao-api.md](../../../../依赖文档/API/yunxiao-api.md)

---

## 1. 对接目标

系统功能排期模块需要从云效代码管理拉取 commit 用于：

| 场景 | 使用的 OpenAPI | 功能入口 |
| ---- | -------------- | -------- |
| 卡片标记完成时选择完成 commit | `GET /oapi/v1/codeup/repositories/{repoId}/commits` | 前端抽屉 `commit 选择器` |
| 回查 / 校验卡片已关联 commit | `GET /oapi/v1/codeup/repositories/{repoId}/commits/{sha}` | 后端 `FeatScheduleCommitFetcher#findCommit` |
| 自动采集 commit 生成卡片（Job） | 同列表接口 + `refName`/`since` 参数 | 后续 Job 复用 `listCommits` |

---

## 2. 实现总览

| 类 / 文件 | 路径 | 说明 |
| --- | --- | --- |
| `FeatScheduleCommitFetcher` | `service/schedule/FeatScheduleCommitFetcher.java` | 抽象接口：`listRepos` / `listCommits` / `findCommit` |
| `MockFeatScheduleCommitFetcher` | `service/schedule/MockFeatScheduleCommitFetcher.java` | 本地联调默认生效（`codeup.mock-enabled` 缺省或 `true`） |
| `CodeupFeatScheduleCommitFetcher` | `service/schedule/CodeupFeatScheduleCommitFetcher.java` | 真实对接实现（`codeup.mock-enabled=false` 时生效） |

开关通过 `@ConditionalOnProperty` 控制，两个 Bean 互斥：

```java
// Mock 默认 matchIfMissing=true
@ConditionalOnProperty(name = "codeup.mock-enabled",
        havingValue = "true", matchIfMissing = true)

// 真实实现仅当显式 false 时启用
@ConditionalOnProperty(name = "codeup.mock-enabled",
        havingValue = "false")
```

---

## 3. 配置项（busyming-snackingdom.yml / Nacos）

```yaml
codeup:
  mock-enabled: true                          # true=Mock；false=真实；生产用 Nacos 置为 false
  base-url: https://openapi-rdc.aliyuncs.com  # 服务接入点，参考云效「获取服务接入点」文档
  organization-id: ""                         # 中心版必填；Region 版留空
  token: ""                                   # 个人访问令牌（x-yunxiao-token）；敏感字段仅在 Nacos 配置
  default-branch: master                      # 仓未指定 defaultBranch 时的全局默认
  collect-ignore-authors: []                  # 采集 Job 跳过的作者名单（全匹配 commit.author）
  repos:                                      # 允许被选为 source_repo 的白名单仓库
    - repoName: snackingdom-mall-web          # 业务侧仓标识（写入 feat_schedule_card.source_repo）
      displayName: 零食王国 Web 前端
      repoId: "2813489"                       # 云效仓库 ID 或 URL-Encoded 全路径
      defaultBranch: main
      cardPoolSource: true                    # 是否为卡片池采集源（全局仅允许 1 个 true）
      collectBranch: main                     # 采集 Job 拉取的分支，缺省同 defaultBranch
```

绑定方式：`@ConfigurationProperties(prefix = "codeup")`，支持 Nacos 宽松绑定。

### 配置项清单

| 配置键 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `codeup.mock-enabled` | bool | 否 | `true` | 生产需在 Nacos 显式置 `false` |
| `codeup.base-url` | string | 真实模式必填 | — | 如 `https://openapi-rdc.aliyuncs.com`（中心版）或区域域名 |
| `codeup.organization-id` | string | 中心版必填 | 空 | Region 版留空 |
| `codeup.token` | string | 真实模式必填 | 空 | 代码管理 > 提交 > 只读权限的 PAT |
| `codeup.default-branch` | string | 否 | `master` | 回退分支 |
| `codeup.collect-ignore-authors` | string[] | 否 | `[]` | 采集 Job 跳过名单（完全匹配 `commit.author`）；仅 [job-schedule.md](job-schedule.md) 读取 |
| `codeup.repos[].repoName` | string | 是 | — | 写入 DB 的 `source_repo` 值 |
| `codeup.repos[].displayName` | string | 否 | = repoName | 前端下拉展示 |
| `codeup.repos[].repoId` | string | 是 | — | 云效仓库 ID 或 URL-Encoded 全路径 |
| `codeup.repos[].defaultBranch` | string | 否 | = 全局 | 单仓默认分支（供 markDone 候选下拉使用） |
| `codeup.repos[].cardPoolSource` | bool | 否 | `false` | 是否为卡片池采集源；**全局仅允许 1 个 `true`**；仅 [job-schedule.md](job-schedule.md) 读取 |
| `codeup.repos[].collectBranch` | string | 否 | = 该仓 `defaultBranch` | 采集 Job 拉取的分支，与 markDone 候选的 `defaultBranch` 解耦 |

---

## 4. 请求构造

### 4.1 URL 规则

```
{base-url}/oapi/v1/codeup[/organizations/{organizationId}]/repositories/{repoId}/commits[/{sha}]
```

中心版拼接 `organizations/{organizationId}`，Region 版不拼接。`repoId` 允许为 URL-Encoded 全路径（含 `%2F`），代码中使用 `HttpUrl.Builder#addEncodedPathSegment` 避免二次转义。

### 4.2 请求头

| Header | 值 | 说明 |
| --- | --- | --- |
| `x-yunxiao-token` | `${codeup.token}` | 个人访问令牌 |
| `Content-Type` | `application/json` | 云效要求 |

### 4.3 查询参数（`listCommits`）

| Query | 值 | 来源 |
| --- | --- | --- |
| `refName` | `branch` 入参，缺省用 `defaultBranch` | 前端分支输入（v2.7.1：默认仓配置，手改按仓 localStorage 记忆） |
| `search` | `keyword` 入参（非空才带） | 搜索框 |
| `page` | `1` | 当前实现仅首页，后续分页扩展 |
| `perPage` | `limit`（1-100；默认 100） | Controller 透传 |

`findCommit` 只追加 pathSegment `/{sha}`，无 query 参数。

### 4.4 查询参数（`listBranches`，v2.7.2）

`GET {base}/oapi/v1/codeup/organizations/{orgId}/repositories/{repoId}/branches`

| Query | 值 | 说明 |
| --- | --- | --- |
| `page` | `1..3` | 翻页上限 3（updated_desc 下有用分支可能被 CI 分支挤出首页） |
| `perPage` | `100` | 单页条数 |
| `sort` | `updated_desc` | 最近活跃优先 |

实现侧过滤云效 CI 一次性 release 分支（`^release/\d{8}-\d+_release_\d+_\d+$`，实测按活跃倒序淹没 feature/master），仓配置 `defaultBranch` 置顶，封顶 50 返回。响应数组每项取 `name` 字段。

---

## 5. 响应映射

云效返回字段 → 业务 VO（`FeatScheduleCommitVO`）：

| 云效字段 | VO 字段 | 处理 |
| --- | --- | --- |
| `id` | `hash` | 完整 SHA |
| `shortId` | `shortHash` | 缺失时回退 `id.substring(0,7)` |
| `authorName` | `author` | — |
| `authoredDate` | `authoredAt` | `OffsetDateTime.parse` 容错：先 ISO_OFFSET，再默认解析 |
| `message` | `message` | 原样 |
| `webUrl` | `url` | 缺失时回退 `{base}/{orgId}/{encodedRepoId}/commit/{sha}` |

`parentIds` / `committedDate` / `authorEmail` 等字段本期暂不使用。

---

## 6. 异常处理

所有失败场景返回「软失败」（空列表 / null），不抛异常，避免前端抽屉渲染阻塞：

| 场景 | 行为 |
| --- | --- |
| `codeup.token` 未配置 | 记 ERROR 日志，返回空 |
| 仓库 `repo` 不在 `codeup.repos` 白名单 | 记 WARN 日志，返回空 |
| HTTP 非 2xx / IO 异常 | 记 WARN/ERROR 日志，返回空 |
| JSON 解析失败 | 记 ERROR 日志，返回空 |
| `findCommit` 响应缺 `id` | 返回 null（Service 层转成 `ErrorCodeEnum.FS_COMMIT_NOT_FOUND`） |

日志 tag：`[codeup]` 统一前缀，便于 SLS / ELK 过滤。

---

## 7. 切换步骤（从 Mock 切到真实）

1. 在 Nacos `busyming-snackingdom.yml` 中：
   ```yaml
   codeup:
     mock-enabled: false
     base-url: https://openapi-rdc.aliyuncs.com
     organization-id: 60xxxxxxxxxxxxxxxxx
     token: pt-xxxxxxxxxxxxxxxx
     repos:
       - { repoName: snackingdom-mall-web, displayName: "零食王国 Web 前端", repoId: "2813489", defaultBranch: main }
       - { repoName: snackingdom-mall-server, displayName: "零食王国后端", repoId: "2813490", defaultBranch: main }
       - { repoName: snackingdom-portal, displayName: "Portal 框架", repoId: "2813491", defaultBranch: main }
       - { repoName: snackingdom-app, displayName: "门店 PDA App", repoId: "2813492", defaultBranch: main }
   ```
2. 确保 `codeup.token` 对应的 PAT 拥有「代码管理 > 提交 > 只读」权限。
3. 触发 Nacos 刷新（`busyming-snackingdom` 服务支持配置热更新）。
4. 前端抽屉切换状态为「开发完成」验证 commit 下拉可加载。

---

## 8. 后续扩展

- **Commit 采集 Job**（已落地方案）：在 `busyming-snackingdom-job` 新增 `FeatScheduleCommitCollectJob`，按 `codeup.repos` 循环调用 `listCommits(repo, branch, null, 100)`，复用 `FeatureScheduleService#createFromCommit` 幂等入库。详见 [job-schedule.md](job-schedule.md)。
- **分页完善**：当前 `listCommits` 仅取首页（最大 100 条）。如需历史数据回灌，可直接通过 `CollectReq.since/until`（格式 `yyyy-MM-dd HH:mm:ss`，按系统默认时区解读，Codeup 实现自动转 UTC `Z` 拼 query）指定时间窗口，幂等由 `uk_source_commit` 兜底。
- **Webhook 推送**：云效支持 push / commit 事件回调，未来可替代轮询 Job，减少 API 配额消耗。
