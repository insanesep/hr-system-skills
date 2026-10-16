# dev-cost-statistics 数据模型

> 产品侧数据模型：定义实体、核心字段语义与实体间关系，不含 DDL / 索引等研发细节。建表 DDL 归属平台主库，登记于 `依赖文档/数据库/DDL_user_center_lshm.sql`。

## 实体关系

```text
研发费用单 (dev_cost_bill) 1 ─── N 品牌分摊明细 (dev_cost_share_detail)
```

- 品牌分摊明细从属于费用单，随单据级联保存 / 删除，无独立生命周期
- 报表不建实体，按上述两表实时聚合（口径见 business-rule.md §5）

## 实体 1：研发费用单

| 字段名 | 业务含义 | 类型（产品语义） | 必填 | 取值规则 |
|--------|---------|----------------|------|---------|
| 流水号 | 单据唯一编号 | 文本 | 是（系统生成） | `FY` + yyyyMMdd + 4 位日内序号，生成后不可改 |
| 费用科目 | 费用归属科目 | 枚举（单选） | 是 | 人员 / Token / 系统采购 / 弱电 / 硬件 / 差旅 / 福利 |
| 费用金额 | 单据总金额 | 金额 | 是 | > 0，两位小数（精确到分） |
| 费用开始年月 | 费用归属期间起点 | 年月 | 是 | 粒度到月 `yyyy-MM`；≤ 费用结束年月 |
| 费用结束年月 | 费用归属期间终点 | 年月 | 是 | 粒度到月 `yyyy-MM`；≥ 费用开始年月；与开始相等即单月费用 |
| 单据状态 | 流转状态 | 枚举 | 是（系统维护） | 待审核 / 已审核 / 已作废；状态机见 business-rule.md §1 |
| 制单人 | 创建人 | 人员 | 是（系统写入） | 取当前登录人 |
| 制单时间 | 创建时间 | 时间 | 是（系统写入） | 精确到秒 |
| 审核人 | 审核操作人 | 人员 | 否 | 审核时写入，此后不再变化 |
| 审核时间 | 审核操作时间 | 时间 | 否 | 审核时写入，此后不再变化 |

## 实体 2：品牌分摊明细

| 字段名 | 业务含义 | 类型（产品语义） | 必填 | 取值规则 |
|--------|---------|----------------|------|---------|
| 所属流水号 | 关联费用单 | 文本 | 是 | 外键指向费用单流水号 |
| 行号 | 明细顺序 | 序号 | 是 | 从 1 递增；末行 = 行号最大者，承担倒算（规则见 business-rule.md §3） |
| 品牌 | 分摊主体 | 枚举（单选） | 是 | 零食王国 / 有点推荐 / 满气食品 / 数字化中心；同单内唯一 |
| 分摊比例 | 分摊占比 | 百分比 | 是 | > 0% 且 ≤ 100%，两位小数；单行合计 = 100% |
| 分摊金额 | 该品牌承担金额 | 金额 | 是（系统计算） | 前行 = 费用金额 × 比例（四舍五入到分）；末行 = 费用金额 − 前行之和 |

## 枚举清单汇总

| 枚举 | 取值 |
|------|------|
| 单据状态 | 待审核、已审核、已作废 |
| 费用科目 | 人员、Token、系统采购、弱电、硬件、差旅、福利 |
| 品牌 | 零食王国、有点推荐、满气食品、数字化中心 |

## 落地口径（2026-09-15 研发实现，commit-sync 评审确认）

> 本节为研发实现侧登记，与上方产品语义模型一一对应；DDL 真源脚本见 `busyming-snackingdom-devops/docs/20260915/liucao/dev-cost-statistics/01_ddl.sql`。

- **建表归属**：`mall_common`（snackingdom 数据源；dev 库 mall_dev）——归属服务 busyming-snackingdom-devops，与研发域同类表（feat_schedule_card / impl_schedule_card）同库。**与原 Prerequisites「平台主库 user_center_lshm」不同**：devops 数据源矩阵仅 pos（只读）+ snackingdom，无 user_center_lshm 可写通道，评审修正。
- **表名**：研发费用单 `dev_cost_bill`；品牌分摊明细 `dev_cost_share_detail`（`bill_id` 关联，随单据级联软删）。
- **枚举存储值**（代码值落库，中文名映射在 `DevCostConstants`）：
  - 单据状态：`PENDING` 待审核 / `AUDITED` 已审核 / `VOID` 已作废
  - 费用科目：`PERSONNEL` 人员 / `TOKEN` / `SYSTEM_PURCHASE` 系统采购 / `WEAK_CURRENT` 弱电 / `HARDWARE` 硬件 / `TRAVEL` 差旅 / `WELFARE` 福利
  - 品牌：`SNACK` 零食王国 / `YDTJ` 有点推荐 / `MQ` 满气食品 / `DC` 数字化中心
- **起止年月**：`CHAR(7)` 存 `yyyy-MM`，字典序即时间序，直接比较大小。
- **审计字段**：BaseEntity 惯例五字段（created_by / updated_by / created_at / updated_at / deleted_flag）；制单人 `creator_id` + `creator_name` 取登录态显式写入；审核人 `auditor_id` / `auditor_name` / `audited_at` 审核时写入。
- **唯一性**：不加 DB 唯一索引（软删红线：任何场景禁止 `UNIQUE KEY`）；流水号唯一与不复用由应用层保证——`SELECT MAX(bill_no) WHERE bill_no LIKE 'FY{yyyyMMdd}%' FOR UPDATE` 同事务执行，普通索引 `idx_bill_no` 承载间隙锁使同日生成串行化，软删行参与 MAX 计算故号码不回收；分摊明细同品牌唯一 + 比例合计=100% 由应用层校验。
- **报表**：不建快照实体，按两表实时聚合（口径见 business-rule.md §5）。
