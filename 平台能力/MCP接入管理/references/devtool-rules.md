# MCP接入管理 · 观测应用与研发工具规则

> 本文件定义 SLS/ARMS 的应用真源、成员同步、动态范围与查询隔离。工具许可见 [权限规则](permission-rules.md)；执行契约见公共仓的 [SLS 技能](../../../../busyming-skills-common/agent/MCP/sls/SKILL.md)、[SLS 工具契约](../../../../busyming-skills-common/agent/MCP/sls/references/mcp-tools.md)、[ARMS 技能](../../../../busyming-skills-common/agent/MCP/arms/SKILL.md)与 [ARMS 工具契约](../../../../busyming-skills-common/agent/MCP/arms/references/mcp-tools.md)。

## 1. 应用与能力边界

- 完整应用名由云效代码仓名加环境后缀组成，后缀为 dev、test、pre、gray、prod。每个完整名字都是独立应用，预发与灰度不能替换目标查询。
- 一条应用记录同时承载 SLS 日志和 ARMS 观测能力，不按产品建立两条授权资源。SLS 的日志库名与 ARMS 的应用名均使用该完整名字。
- 权限管理员只显式分配 SLS、ARMS 两个工具族；用户令牌只勾选工具族。应用范围来自有效仓成员关系，不提供业务域、独立环境、日志库或应用的人工授权。
- 云侧调用使用服务器维护的只读凭据，不向个人下发云账号、密钥或端点。应用目录不是云账号级资源发现，也不是所有监控能力已就绪的证明。
- 不提供任意监控写入、拓扑管理或跨应用全链路查询能力；不能从云产品支持的接口反推本 MCP 已提供相同工具。

## 2. 项目归属与观测应用目录

### 2.1 业务域

数据库数据源的业务分类沿用商品、采购、营运、门店、客服、系统、库存、要货、产研、公共，仅供 [数据源规则](datasource-rules.md)中的数据库分类使用。它不参与观测应用归属、工具许可或成员范围计算，不能据此授权 SLS/ARMS。

### 2.2 项目与代码仓真源

- 应用仓来自启用项目的代码服务仓映射；harness 是需求文档工程，不因项目关联自动成为应用仓。没有代码服务仓的项目不派生应用。
- 仓 ID 和精确仓名由云效仓资料核验，不以本地目录名、Spring 服务名、制品名、业务分类或记忆替代。
- 项目观测分组是服务器选择观测凭据、SLS Project、地域和 Prometheus 实例的内部依据。它来自项目的 observabilityGroup，不从 Nacos config 或 discovery 分组推断，也不是客户端授权字段。
- 项目归属缺失、观测分组缺失、同仓关联冲突、仓名或完整应用名重名均默认拒绝，不选择首项、不按优先级掩盖冲突。
- 查询时复核项目仍启用、应用所属仓仍在项目代码服务仓中、应用记录的来源分组与当前项目观测分组一致。项目变化不能靠旧目录继续放行。

### 2.3 应用同步

- 每日东八区 02:00 同步观测应用和云效仓成员；持有同步权限的管理员可手动同步。
- 同步按项目代码服务仓读取云效仓资料，按项目观测分组读取指定 SLS Project 的日志库目录；仅接受去除末尾环境后缀后与仓名完全相等的完整名称。不跨账号枚举 Project，不做模糊前缀匹配。
- 对匹配的日志库通过 GetLogStore 定向验证，记录 SLS 就绪与日志保留期；SLS 验证失败只影响 SLS，不否定该应用的 ARMS 范围。
- ARMS 应用目录与 SLS 共用应用记录，不调用 ListTraceApps 发现账号全量应用，不为目录预先解析 PID。
- 应用没有手工开放、标签规则、资源组规则、名称归属规则或人工分配操作。满足当前有效应用和成员条件即可进入对应工具族的动态范围。
- 只有成功完整读取的相应目录或成员快照才能确认对象移除。同步失败保留相应旧内容与旧同步日期，不把失败、异常响应或未完整读取当作空目录，不误删、不延长旧快照有效期。
- 应用快照和成员快照分别以最近成功同步时间计，24 小时后失效。目录或成员不同步成功时分别保持各自日期；一项刷新不能替另一项续期。

### 2.4 云效成员与门户身份

- 同步代码仓直接成员和代码组继承成员的有效访问事实，按云效字符串用户身份合并；存在有效直接或继承路径时，按有效角色与到期事实判断。
- 云效用户身份不是门户数字用户 ID。先读取该身份的组织成员资料邮箱，再以规范化邮箱唯一匹配启用的门户用户，不按姓名、昵称或字符串强转匹配。
- 邮箱缺失、门户匹配缺失或重复匹配不获得应用范围；资料读取失败或成员状态、身份、到期信息无法完整解析时，不刷新受影响成员快照。
- 有效成员须状态有效、角色至少为浏览者且未超过成员到期时间；成员状态被禁用、角色不足或映射无效不获范围。
- 下一次成功完整同步确认云端成员移除后，标记成员移除并清空门户映射，后续目录和查询立即失效。云端移除并非实时推送，本模块不承诺尚未同步时立即获知；等待期间仍受 24 小时快照上限约束。
- 查询逐次检查账号启用状态、工具 grant、成员状态、角色与到期时间、应用状态及快照新鲜度。账号停用、工具撤销或已知到期即时拒绝，不等待同步或定时清理。

## 3. SLS 日志检索规则

- 三个工具为 sls_list_logstores、sls_trace_logs、sls_query_logs。目录工具可不指定应用名，但只列当前连接允许的环境类、当前工具与令牌许可以及成员范围内的已就绪应用。
- 两个日志查询必须指定一个精确完整 appName，只查对应日志库；不隐式遍历目录、跨仓、跨应用或跨环境，即使 TraceId 相同也不扩大范围。
- GetLogStore 用于同步时定向验证。每次查询重新检查工具许可、成员范围、应用快照中的 SLS 就绪状态与来源坐标，再执行日志检索；目录浏览不是查询前置，旧目录不能代替授权，云侧实际读权限或目标不可用时直接报错。
- 支持字面关键字、TraceId、日志级别与时间范围，不接受自定义查询分析语句。时间使用秒，区间含起点不含终点，单次最多 24 小时且不允许未来结束时间；保留期外无日志不能解释为请求未发生。
- 普通日志查询每页最多 100 条、偏移不超过 10000；时间线查询最多 500 条，TraceId 与关键字只能选一个。时间线按时间正序返回，默认 TraceId 查最近 120 分钟 ERROR，关键字查最近 15 分钟全部级别；完整执行过程须明确选择全部级别。
- 结果经过敏感凭据脱敏与大小限制，单条正文超过 16000 字符或响应超过 120KB时截断，并标明不完整。失败不能返回空成功；空样本、截断或未读完分页不能证明没有错误。
- 调查查询预算、字段与分页执行细节遵循公共 SLS 契约，不在本文件内嵌接口报文或检索表达式。

## 4. ARMS 应用监控查询规则

- 五个工具为 arms_list_apps、arms_diagnose、arms_search_traces、arms_get_trace、arms_query_metrics。目录可省略应用名，其余四个查询均须完整 appName；连同两个 SLS 查询，共六个查询必须单应用定位。
- Trace 搜索和 slow_api 慢接口诊断直接按完整 appName 限定服务名，不依赖 PID 发现。慢接口结果是有界采样聚合，不当作全量接口调用统计。
- GetTrace 结果按当前授权目标完整 appName 和 TraceId 过滤 Span，只返回该应用子集，不暴露其他应用的 Span、数量或占位详情。最多 1000 个 Span，树层级与截断仅描述授权子集，不宣称完整全链路或拓扑。
- 容器与 JVM 的 Prometheus UID、分组实例、地域和凭据由服务器维护。namespace 由完整名字后缀与项目观测分组按部署约定推导，Pod 按代码仓名和 Deployment 命名约定精确限定；用户不能传 namespace、Pod、UID、实例或任意 PromQL。
- JVM 诊断优先使用同实例的 Pod 维度 Prometheus 指标，再使用精确完整应用名的指标；只有应用的 appstat.vm 兜底或原始 JVM 指标查询才按完整名称通过 SearchTraceAppByName 解析唯一 PID。
- PID 必须精确匹配完整名称与地域；未找到或多项冲突只影响依赖 PID 的能力。缓存须有限时与容量，按实际凭据、地域与应用上下文隔离；命中缓存仍逐次校验工具、令牌与当前成员范围。
- slow_api、Trace、告警、容器及 JVM Prometheus 指标不做统一 PID 前检。缺少 SLS 就绪、Prometheus 配置或 PID，均只影响依赖该条件的能力，不连带否定其他能力。
- 告警仅返回能由精确应用标签或项目映射中的 namespace 与 Pod 确认归属的条目；标题包含服务名不算归属证据，不公开账号级原始告警。
- 查询时间使用毫秒；诊断、搜索与原始指标最多 24 小时，Trace 详情默认且最多最近 3 天。查询预算、指标白名单与来源粒度遵循公共 ARMS 契约。
- 未知字段、缺失指标、异常采样或无法识别的状态不能补零或解释为健康。堆外是估算，缺 committed 或 max 不编造；部分失败保留已有证据并注明缺项、来源、粒度与覆盖限制。

## 5. 连接路由与异常场景

- 全部八个工具仅接受完整 appName 作为应用定位，不接独立 group、service、env、物理资源、端点、凭据或调用者 PID；其他查询条件只限已注册工具契约，未知字段拒绝。
- MCP 保留生产与非生产身份声明。生产只路由 prod 后缀，非生产路由 dev、test、pre、gray；身份不明、缺失、多激活环境或与目标不符时在云调用前拒绝，不据连接昵称猜测，不默选生产。
- 路由只约束当前连接，不构成用户独立环境授权；预发与灰度的服务器内部兼容处理不能改写完整应用名或把一个应用当作另一个。

| 场景 | 处理 |
| ---- | ---- |
| 同步失败或快照读取不完整 | 保留对应旧内容与旧日期；到 24 小时上限后拒绝，不误判云端移除 |
| 成功完整同步确认成员移除或应用消失 | 移除事实生效，后续查询不再放行；不自动授予其他仓或应用 |
| 项目停用、仓映射改变或观测分组不一致 | 逐次复核拒绝目标，不依赖旧目录继续访问 |
| 身份邮箱缺失、重复映射或成员角色不足 | 不产生有效门户成员范围，不转人工分配应用 |
| 应用重名、归属冲突、来源坐标不一致 | 拒绝相关目标，不选首项、不降级到模糊名称 |
| 工具许可撤销、账号停用或已知到期 | 当前调用拒绝，缓存与定时任务不能延迟生效 |
| SLS、Prometheus 或 PID 的单项能力失败 | 只停止依赖它的能力，保留其他证据，报告原因而不是零值健康 |

## 6. 实现依据

- [应用与成员同步](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/mcp/impl/McpDevtoolServiceImpl.java)、[每日同步任务](../../../../code/02-devops/busyming-devhub/busyming-devhub-job/src/main/java/io/busyming/basic/devhub/job/McpDevtoolSyncJob.java)。
- [动态应用访问](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/mcp/support/McpApplicationAccess.java)、[云效仓与成员读取](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/schedule/adapter/CodeupCommitFetcher.java)、[门户邮箱唯一映射](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/support/UserSearchSupport.java)。
- [项目真源](../../../../code/02-devops/busyming-devhub/busyming-devhub-domain/src/main/java/io/busyming/basic/devhub/domain/entity/schedule/ProjectEntity.java)、[项目映射维护](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/schedule/impl/ProjectServiceImpl.java)。
- [八个观测工具与单应用执行](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/mcp/support/McpObservabilityTools.java)、[观测客户端](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/mcp/adapter/McpObservabilityClient.java)、[ARMS 诊断](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/mcp/support/McpArmsDiagnosis.java)、[服务器观测映射](../../../../code/02-devops/busyming-devhub/busyming-devhub-service/src/main/java/io/busyming/basic/devhub/service/config/McpObservabilityProperties.java)。
