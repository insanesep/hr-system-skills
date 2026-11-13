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

源缺失、失败或未取得标「未取得」，不补零、不编造数字；成功返回明确空集合或零值须与未取得区分。卡片统计先按稳定卡片 ID 去重，跨域/项目和 `_all` 不叠加重复事实，排期卡片与流水仍由 [功能排期管理](../../../研发管理/功能排期管理/SKILL.md) 维护。项目进度两形态共用任务冻结的项目、仓映射与卡片事实；合并卡必须以冻结子卡及源仓边界核验全部子卡同属一个参与项目才归属该项目，否则为未归属项目，不用当前映射或标题猜测。完成、延期及非需求改动按统计截止时的流水恢复状态，不以期后当前状态替代，无法可靠恢复时标「未取得」并说明原因。人员识别只读采用 [项目管理 #identity](../../../研发管理/项目管理/references/business-rule.md#identity) 与 [#report-scope](../../../研发管理/项目管理/references/business-rule.md#report-scope)：FULL 使用有效配置成员，SIMPLE 使用同任务冻结的全部身份档案按映射仓有效提交挂靠，未知作者仅作审计与人数，不公开名单、不修改成员关系。基础范围与执行映射只读采用 [项目管理 #consumption](../../../研发管理/项目管理/references/business-rule.md#consumption)。外部配置只承载真源引用和快照，不维护平行人员或范围清单。

## 报告推送（旁路通道）

> 入库主通道为「服务端生成直接落库」；本推送契约仅用于外部生成会话产出的入库（如本地排障重跑）。

- 服务端按文件名解析报告类型、项目与日期，**文件名必须严格遵循**：
  - 周报：`weekly_dev_yyyyMMdd.md`（yyyyMMdd = 生成当天）
  - 一致性检查：`consistency_yyyyMMdd_<项目key>.md`
  - 产品文档健康度：`doc_health_yyyyMMdd_<项目key>.md`
  - 项目进度 FULL 完整版：`progress_yyyyMMdd__all.md`；SIMPLE 简化版：`progress_yyyyMMdd__all_simple.md`
  - 范围类项目 key 必须与「报告范围配置」生效数据一致（见 [business-rule.md §3](business-rule.md#3-报告项目配置)），未命中按无法识别处理；项目进度仅用 `_all`，域名称来自稳定项目引用对应的项目名称快照，不按名称或文件名猜仓
- 项目进度外部会话按一次任务成对推送 FULL 与 SIMPLE，携带同批次的统计周期、冻结范围、有效配置成员及全部身份档案依据；两份命名、形态、统计窗口、正文校验和渲染全部通过后才成对发布，任一失败则整个任务失败，不发布半份。文件与任务形态冲突时拒绝，不覆盖形态或转换内容；单形态修正只走手动补传，不伪造双产物批次
- 幂等：一般报告同类型、项目、发报日及内容指纹重复时复用版本；研发周报按统计自然周判重；项目进度按 `_all`、统计周期类型、统计区间及形态独立判重。两份内容都重复则复用两个已有版本，仅一形态变化仅该形态递增；新任务的独立批次引用两个实际产物版本，不要求编号相同，也不从版本号推定批次
- 鉴权失败：401（token 不匹配）/ 403（服务端未配置 token，fail-closed）
- 推送后回告报告标识、实际版本、版本总数及是否复用；项目进度分别回告两形态实际报告与版本引用、生成批次标识。失败保留本地两份文件并说明原因，不内嵌接口报文
