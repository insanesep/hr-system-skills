---
name: dev-report
description: "生成研发周报（人员产出维度，由模型直接执行，不依赖 ai-checker python 流水线）。统计窗口为上周一~上周日（周日触发时含当天）。服务端生成会话由服务端注入工作区与配置；外部会话默认读取生成环境约定的 config.yaml。服务端会话产出回传服务端直接落库；外部会话产出推送至 devops 研发报告模块（旁路）。Use when 用户要求生成/跑 研发周报、周报、weekly report、推送报告到后台系统；触发词：周报、生成报告、推送报告、研发报告。"
---

# dev-report / 研发周报生成

> 一句话定位：采集 Git 提交 + 业务 API 数据，由模型直接生成研发周报，写入报告文件。服务端生成会话的产出回传服务端直接落库归档；外部会话产出推送至 devops 研发报告模块（旁路通道）。无企微推送。

## When to Use

- 用户说「生成周报 / 跑研发周报」
- 每周一或周日复盘上一周研发产出
- 用户说「推送报告到后台」（外部会话旁路）

## When Not to Use

- 需要定时自动跑 → 由报告配置模块「报告触发配置」页承担定时调度，本 skill 只描述单次生成会话的执行
- 需要企微群通知 → 无此能力
- 一致性检查 / 项目进度报告 → 分别由文档一致性报告、项目进度报告模块的生成 skill 承载

## 参数解析

| 参数 | 取值 | 默认 |
|------|------|------|
| 代码工作区 | 绝对路径 | 服务端会话由服务端注入；外部会话读取 config.yaml 的 `workspace_dir` 并解析为绝对路径 |
| 推送 | 服务端会话固定「不推送，产出回传服务端」；外部会话默认生成后推送，用户说「仅生成」则跳过 | 按会话类型 |

**配置来源**：

- **服务端生成会话**：工作区、API 基址与令牌等配置全部由服务端注入会话上下文，不读本机文件
- **外部会话**：用 Read 读取生成环境约定的 `config.yaml` 并提取：`workspace_dir`、`output.dir`、`projects`（各项目 SKILL 仓库 / skill_roots / 代码仓库清单 / code_branch_policy）、`api.devops_base_url`、`api.foundation_base_url`、`dev_report.ingest_token`、`codeup`（clone 凭证，仅仓库缺失时使用）

**统计窗口（周报与 API 拉数共用）**：最近一个以周日收尾的周一~周日。

- 今天是周日 → 窗口含今天（本周一 ~ 今天）
- 否则（周一~周六触发）→ 上周一 ~ 上周日，不含今天（当天数据不完整，Qoder/MCP 用量当天未入库）

## 执行流程

### Step 1 读配置、定工作区

按会话类型取配置（服务端注入 / 外部会话读 config.yaml），确定：工作区绝对路径 `WS`、输出目录、项目清单。

🚨 **工作区硬约束（违反将产出错误结论）**：一切文件操作只能以 `WS` 为基准，目标仓库都是其子目录（`$WS/<repo>/`）。机器上其它位置存在同名仓库的**开发者副本**（过时、分支不同、缺最新提交），严禁用于搜索、读取或作为结论依据。Glob / Grep / Read / Bash 的路径参数必须落在 `WS` 内；工具结果中出现 `WS` 之外的路径一律忽略并重查。

### Step 2 同步仓库

对 `WS` 下每个参与仓库：仓库缺失时按会话配置 `codeup` 凭证浅克隆（命令不内嵌，按生成环境约定执行）。

### Step 3 采集数据

- 脚本输出为权威计数（含 0 提交仓库），直接引用，**严禁自己再跑 git log 重新计数**
- repo 列表 = 各项目 SKILL 仓库 + 代码仓库 + extra 仓库（会话配置 `projects` / `extra`）
- 排期双卡（功能排期 / 实施排期）走 MCP 工具，调用口径、字段与容错见共享契约 [`../../报告配置/references/data-source-api.md`](../../报告配置/references/data-source-api.md)（大响应自动落盘后读取分析）
- 其余 4 个用量数据源（Qoder 成员用量、Qoder 模型用量、功能使用量、MCP 工具用量）走 HTTP 接口调用，见 [`api-endpoints.md`](api-endpoints.md)（响应较大时先落盘再读取分析）

### Step 4 生成报告

- 按 [`weekly-report.md`](weekly-report.md) 的章节规范与模板生成
- 全文中文；报告标题与日期格式见 weekly-report.md

### Step 5 写文件 + 落库 / 推送

- 写入输出目录，文件名严格遵循：`weekly_dev_yyyyMMdd.md`（服务端按文件名解析类型与日期）
- **服务端生成会话**：产出文件回传服务端，由服务端校验、渲染并直接落库（版本递增、周索引），本 skill 不调用推送接口
- **外部会话（旁路）**：推送契约（multipart 表单 + 鉴权头，幂等）见 [`../../报告配置/references/data-source-api.md`](../../报告配置/references/data-source-api.md)；推送后把 `reportId / versionNo / duplicated` 回告用户；推送失败不删本地文件，把错误信息告知用户

## 硬约束汇总

1. 工作区硬约束：只操作 `WS` 内路径（见 Step 1）
2. 计数纪律：提交数以约定计数脚本输出为唯一权威（脚本由生成环境提供，不随仓维护）
3. 数据容错：任一 API 失败写一行说明，严禁编造数字
4. token 只从会话配置（服务端注入或 config.yaml）读取使用，禁止写进报告或 skill 文件

## Resources

- [`weekly-report.md`](weekly-report.md) —— 周报章节规范与输出模板
- [`api-endpoints.md`](api-endpoints.md) —— 周报专属用量数据接口
- [`../../报告配置/references/data-source-api.md`](../../报告配置/references/data-source-api.md) —— 排期双卡 MCP 调用 + 报告推送契约（旁路，共享）
