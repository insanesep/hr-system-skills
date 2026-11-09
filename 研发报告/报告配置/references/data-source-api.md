# 研发报告 数据源与推送契约（共享）

> 本文件为生成式报告的共享契约真源：功能排期卡片 MCP 调用口径、容错口径、报告推送旁路契约。研发报告共用的用量类数据源见 [`../人员产出报告/references/api-endpoints.md`](../../人员产出报告/references/api-endpoints.md)。
>
> 配置来源按会话类型区分：
>
> - **服务端生成会话**：基址与令牌全部由服务端注入会话上下文
> - **外部会话**：统一从生成环境约定的 `config.yaml` 读取（用 Read 工具读文件后提取 YAML 键值，不要用 yq 等外部依赖）
>
> | 键 | 用途 |
> |----|------|
> | `api.devops_base_url` | devops 微服务基址（排期 / 用量 / 报告推送） |
> | `api.foundation_base_url` | foundation 微服务基址（MCP 工具用量） |
> | `dev_report.ingest_token` | 推送鉴权令牌（X-Report-Token，仅外部会话旁路上报使用） |
>
> 🚨 令牌只从会话配置读取使用，禁止把 token 值写进任何报告、日志输出或 skill 文件。
> 接口调用统一设置 30s 超时。响应统一取 `data` 字段（无 `data` 时整体即数据）。
> 响应可能较大：先将响应落盘为临时文件，再读取分析。

## 功能排期卡片（MCP 工具，不走 HTTP）

统计区间记为 START ~ END，格式 YYYY-MM-DD。

调用 MCP 工具 `mcp__busyming__busyming_feature_schedule`：

- 按区间跨越的**每个月**各调一次（跨月要调两个月），按卡片 `cardNo` 去重
- 只保留 `scheduledDate` 落在 [START, END] 内的卡片（未排期卡片不计入）
- 数据字段：`cards[]` → `cardNo / title / status(DONE|IN_PROGRESS|PENDING) / scheduledDate / ownerName(创建人) / devUserName / devTakenAt / doneAt / createdAt`；`backupTotal` 为 Backup 池存量
- ⚠️ 响应很大（单月可达 500KB+），MCP 会自动截断并把完整结果落盘到 tool-results 文件，**直接 Read 落盘文件分析**，不要试图在一次调用里读全量
- 辅助视图（按需）：`view=logs card_no=FS-xxx`（卡片操作时间线）、`view=non-feature`（非需求改动）、`view=release-days`（月内发版日）

### 容错口径

源缺失、失败或未取得标「未取得」，不补零、不编造数字；成功返回明确空集合或零值须与未取得区分。卡片统计先按稳定卡片 ID 去重，跨域/项目和 `_all` 不叠加重复事实，排期卡片与流水仍由 [功能排期管理](../../../研发管理/功能排期管理/SKILL.md) 维护。人员归属只读采用 [项目管理 #identity](../../../研发管理/项目管理/references/business-rule.md#identity) 与 [#report-scope](../../../研发管理/项目管理/references/business-rule.md#report-scope) 的生成名单快照；基础范围与执行映射只读采用 [项目管理 #consumption](../../../研发管理/项目管理/references/business-rule.md#consumption)。外部配置只承载真源引用和快照，不维护平行人员或范围清单。

## 报告推送（旁路通道）

> 入库主通道为「服务端生成直接落库」；本推送契约仅用于外部生成会话产出的入库（如本地排障重跑）。

- 服务端按文件名解析报告类型、项目与日期，**文件名必须严格遵循**：
  - 周报：`weekly_dev_yyyyMMdd.md`（yyyyMMdd = 生成当天）
  - 一致性检查：`consistency_yyyyMMdd_<项目key>.md`
  - 产品文档健康度：`doc_health_yyyyMMdd_<项目key>.md`
  - 项目进度报告：`progress_yyyyMMdd_<项目key>.md`
  - 项目 key 必须与「报告范围配置」生效数据一致（见 [business-rule.md §3](business-rule.md#3-报告项目配置)），未命中按无法识别处理
- 幂等：同报告项（类型 + 项目）+ 同发报日 + 同内容 hash 不产新版本，响应 `duplicated=true`
- 鉴权失败：401（token 不匹配）/ 403（服务端未配置 token，fail-closed）
- 成功响应（取 `.data`）：`{reportId, duplicated, versionNo, versionCount}`，推送后把这几个值回告用户
