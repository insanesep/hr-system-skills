/**
 * 功能排期 · 会话内演示数据（Mock，可重置：刷新页面即恢复）
 * 真源：references/data.md（实体字段）/ field-rules.md（取值）/ business-rule.md §9（项目与配色）/ §11（需求澄清）
 * 两页共用：feature-schedule.html（研发排期工作台）/ feature-schedule-detail.html（卡片详情页）
 * 演示基准日 today = 2026-10-21（周三），演示「当前时间」now = 2026-10-21 10:30（等待时长、新发起澄清的发起时间）；
 * 当前登录人演示为「陈默」（PM，持有编辑 / 删除 / 标记完成 / 切换发版日全部权限）。
 * 项目标识色说明：business-rule §9 调色板为 蓝/青/紫/金/品红/橙红 六色；设计仓 PC Token 暂无
 * 青/紫/品红独立色值，原型以 busy-tag 语义色近似映射（cls 字段），色名以 colorName 如实标注。
 * 需求澄清演示数据（business-rule §11 / data.md §8）：
 *   clarifying       待澄清列表 5 张（非子卡；每条 = 卡片 + 当前澄清投影：问题 / 发起人 / 发起时间 / 渠道 PC·MCP /
 *                    澄清前状态 / 原排期）；2 张等待超过 2 天（警示），1 张由当前用户陈默发起，1 张负责人为陈默；
 *                    FS-20261014-003 澄清前为开发中、保留开发人刘洋，是详情页「待澄清卡」演示
 *   revisionCommits  完成澄清的修订 commit 候选（按 harness 工程仓区分）：含已出卡（标注编号，仍可选）、
 *                    卡片已删除（禁选）、本卡片源 commit（禁选），以及对应卡片已开发完成、提交时被服务端拒绝的一条
 *   clarifyRecords   澄清记录历史：已撤回（含理由）、已澄清（含修订 commit 与并入合并卡）；待澄清记录由 clarifying 投影
 *   clarifiedMerge   完成澄清生成的合并卡 FS-20261016-008（原卡 FS-20261013-004 + 2 张修订卡，恢复为开发中回到待排期池）
 *   stats.clarifying 指挥栏「待澄清 N」全量计数（不含子卡，不随月份 / 筛选 / 搜索 / 只看自己变化）
 */
window.FS_DATA = {
  today: '2026-10-21',
  now: '2026-10-21 10:30',
  month: '2026-10',
  user: '陈默',

  /* 只读项目演示投影（真源为项目管理；供排期标签、筛选与仓候选使用，不提供配置写操作） */
  projects: [
    { key: 'main',   name: '鸣鸣很忙主站', colorName: '蓝',   cls: '',                     harness: 'harness-main',   repos: ['busyming-web', 'busyming-server'], status: '启用' },
    { key: 'supply', name: '供应链中台',   colorName: '青',   cls: 'busy-tag--success',    harness: 'harness-supply', repos: ['supply-api'],                      status: '启用' },
    { key: 'pos',    name: '门店 POS',     colorName: '紫',   cls: 'busy-tag--danger',     harness: 'harness-pos',    repos: ['pos-client'],                      status: '启用' },
    { key: 'member', name: '会员中心',     colorName: '金',   cls: 'busy-tag--warning',    harness: 'harness-member', repos: ['member-service'],                  status: '启用' },
    { key: 'fran',   name: '加盟商服务',   colorName: '橙红', cls: 'busy-tag--danger is-plain', harness: 'harness-fran', repos: [],                              status: '停用' }
  ],
  unassigned: { key: 'none', name: '未归属项目', colorName: '灰', cls: 'busy-tag--info' },

  /* 待排期池：服务端分页，total 为当前筛选条件下池内全量；排序=创建时间倒序，同刻按编号倒序
     （items / page2 / page3 仅为演示数据分段，渲染时按页码与每页条数统一切片） */
  pool: {
    total: 24, pageSize: 10, page: 1,
    items: [
      { no: 'FS-20261020-001', title: '要货单增加批量导入入口', module: 'STORE',  project: 'main',   submitter: '王倩', created: '2026-10-20 09:12', ago: '1 天前' },
      { no: 'FS-20261020-002', title: '修复门店库存快照重复写入', module: 'STOCK', project: 'supply', submitter: '李强', created: '2026-10-20 08:40', ago: '1 天前' },
      { no: 'FS-20261019-008', title: '会员积分规则文案调整', module: 'MEMBER',   project: 'member', submitter: '张敏', created: '2026-10-19 17:05', ago: '2 天前' },
      { no: 'FS-20261019-006', title: '要货单交互走查修复打包', module: 'STORE',  project: 'main',   submitter: '陈默', created: '2026-10-19 18:02', ago: '2 天前', merged: true, childCount: 3 },
      { no: 'FS-20261019-007', title: 'POS 离线模式日志补录', module: 'POS',      project: 'pos',    submitter: '陈刚', created: '2026-10-19 15:48', ago: '2 天前' },
      { no: 'FS-20261017-001', title: '采购订单导出增加供应商编码', module: 'ORDER', project: 'supply', submitter: '刘洋', created: '2026-10-17 11:22', ago: '4 天前' },
      { no: 'FS-20261016-001', title: '要货审批流节点文案优化', module: 'STORE',  project: 'main',   submitter: '赵敏', created: '2026-10-16 14:50', ago: '5 天前' },
      /* 完成澄清生成的合并卡：恢复为澄清前的「开发中」，保留开发人，排期为空回到待排期池（business-rule §11.3） */
      { no: 'FS-20261016-008', title: '门店巡检任务支持拍照水印', module: 'STORE', project: 'main', submitter: '赵敏', created: '2026-10-16 14:05', ago: '5 天前', merged: true, childCount: 3, status: 'IN_PROGRESS', developer: '陈刚', takenAt: '2026-10-14 09:05', clarifiedFrom: 'FS-20261013-004' },
      { no: 'FS-20261015-002', title: '修复积分过期任务偶发漏跑', module: 'MEMBER', project: 'member', submitter: '孙浩', created: '2026-10-15 16:40', ago: '6 天前' },
      { no: 'FS-20261015-003', title: '门店档案新增批量停用', module: 'STORE',    project: 'main',   submitter: '李强', created: '2026-10-15 10:12', ago: '6 天前' }
    ],
    page2: [
      { no: 'FS-20261013-001', title: '采购对账报表字段补充', module: 'ORDER',    project: 'supply', submitter: '周洁', created: '2026-10-13 13:26', ago: '8 天前', stale: true },
      { no: 'FS-20261012-001', title: '更新部署文档与 changelog', module: 'MISC', project: 'none',   submitter: '王倩', created: '2026-10-12 09:31', ago: '9 天前', stale: true },
      { no: 'FS-20261012-004', title: '要货单打印模板字段对齐', module: 'STORE',  project: 'main',   submitter: '张敏', created: '2026-10-12 08:55', ago: '9 天前', stale: true },
      { no: 'FS-20261011-001', title: '库存预警阈值配置化', module: 'STOCK',      project: 'supply', submitter: '李强', created: '2026-10-11 16:20', ago: '10 天前', stale: true },
      { no: 'FS-20261011-002', title: '会员开卡礼发放补偿', module: 'MEMBER',     project: 'member', submitter: '孙浩', created: '2026-10-11 15:02', ago: '10 天前', stale: true },
      { no: 'FS-20261010-002', title: 'POS 会员卡识别提速', module: 'POS',        project: 'pos',    submitter: '吴迪', created: '2026-10-10 14:47', ago: '11 天前', stale: true },
      { no: 'FS-20261010-003', title: '要货建议算法参数调优', module: 'STORE',    project: 'main',   submitter: '陈默', created: '2026-10-10 11:36', ago: '11 天前', stale: true },
      { no: 'FS-20261009-003', title: '采购合同附件预览修复', module: 'ORDER',    project: 'supply', submitter: '周洁', created: '2026-10-09 17:18', ago: '12 天前', stale: true },
      { no: 'FS-20261009-004', title: '门店档案导出脱敏', module: 'STORE',        project: 'main',   submitter: '赵敏', created: '2026-10-09 10:05', ago: '12 天前', stale: true },
      { no: 'FS-20261008-001', title: '积分商城 SKU 排序修复', module: 'MEMBER',  project: 'member', submitter: '张敏', created: '2026-10-08 15:44', ago: '13 天前', stale: true }
    ],
    page3: [
      { no: 'FS-20261008-002', title: 'POS 字体包瘦身', module: 'POS',            project: 'pos',    submitter: '陈刚', created: '2026-10-08 09:26', ago: '13 天前', stale: true },
      { no: 'FS-20261007-001', title: '要货单历史数据归档脚本', module: 'STORE',  project: 'main',   submitter: '刘洋', created: '2026-10-07 18:02', ago: '14 天前', stale: true },
      { no: 'FS-20261007-002', title: '供应商评级口径对齐', module: 'ORDER',      project: 'supply', submitter: '王倩', created: '2026-10-07 14:31', ago: '14 天前', stale: true },
      { no: 'FS-20261006-001', title: '会员标签同步重试', module: 'MEMBER',       project: 'member', submitter: '孙浩', created: '2026-10-06 11:20', ago: '15 天前', stale: true }
    ]
  },

  /* 本月已排期卡片（status: PENDING/IN_PROGRESS/DONE；延期由 today 与截止日计算，不落库；
     月/周视图卡片仅落在排期截止日所在格/列，区间卡不逐日铺开） */
  scheduled: [
    { no: 'FS-20261009-002', title: '要货单导出性能优化', module: 'STORE',  project: 'main',   start: '2026-10-12', end: '2026-10-14', status: 'DONE',        developer: '刘洋', takenAt: '2026-10-12 09:20', doneAt: '2026-10-14 17:20', commits: 2, submitter: '王倩', nature: '技术支持' },
    { no: 'FS-20261013-002', title: '门店要货截止时间校验', module: 'STORE', project: 'main',  start: '2026-10-19', end: '2026-10-23', status: 'IN_PROGRESS', developer: '陈刚', takenAt: '2026-10-19 09:40', submitter: '王倩', nature: '业务功能', bizContact: '', linkedReq: 'REQ-20261012-018', reqSubmitter: '王倩' },
    { no: 'FS-20261014-001', title: '供应商档案导入模板更新', module: 'ORDER', project: 'supply', start: '2026-10-22', end: '2026-10-22', status: 'PENDING', submitter: '周洁', nature: '业务功能', bizContact: '刘洋' },
    { no: 'FS-20261010-001', title: '积分商城兑换页改版', module: 'MEMBER', project: 'member', start: '2026-10-15', end: '2026-10-16', status: 'IN_PROGRESS', developer: '孙浩', takenAt: '2026-10-15 09:02', submitter: '张敏', nature: '业务功能', bizContact: '张敏' },
    { no: 'FS-20261012-002', title: 'POS 小票打印乱码修复', module: 'POS',  project: 'pos',    start: '2026-10-19', end: '2026-10-19', status: 'PENDING',    submitter: '陈刚', nature: '业务功能', bizContact: '' },
    { no: 'FS-20261015-001', title: '门店档案地图选点升级', module: 'STORE', project: 'main',  start: '2026-10-15', end: '2026-10-16', status: 'DONE',        developer: '陈刚', takenAt: '2026-10-15 08:50', doneAt: '2026-10-16 18:40', commits: 1, submitter: '赵敏', nature: '业务功能', bizContact: '赵敏' },
    { no: 'FS-20261016-002', title: '采购价变更审批加签', module: 'ORDER',  project: 'supply', start: '2026-10-20', end: '2026-10-22', status: 'IN_PROGRESS', developer: '周洁', takenAt: '2026-10-20 10:05', submitter: '刘洋', nature: '业务功能', bizContact: '刘洋' },
    { no: 'FS-20261019-001', title: '会员标签批量打标', module: 'MEMBER',   project: 'member', start: '2026-10-21', end: '2026-10-21', status: 'PENDING',    submitter: '张敏', nature: '业务功能', bizContact: '张敏' },
    { no: 'FS-20261019-002', title: '要货单备注展示换行修复', module: 'STORE', project: 'main', start: '2026-10-21', end: '2026-10-21', status: 'PENDING',    submitter: '王倩', nature: '业务功能', bizContact: '' },
    { no: 'FS-20261019-003', title: '库存快照重试机制', module: 'STOCK',    project: 'supply', start: '2026-10-21', end: '2026-10-21', status: 'PENDING',    submitter: '李强', nature: '技术支持', bizContact: '' },
    { no: 'FS-20261019-004', title: 'POS 交班对账差异提示', module: 'POS',  project: 'pos',    start: '2026-10-21', end: '2026-10-21', status: 'IN_PROGRESS', developer: '吴迪', takenAt: '2026-10-21 09:30', submitter: '陈刚', nature: '业务功能', bizContact: '陈刚' },
    { no: 'FS-20261018-001', title: '门店要货体验问题打包', module: 'STORE', project: 'main',  start: '2026-10-22', end: '2026-10-23', status: 'IN_PROGRESS', developer: '李强', takenAt: '2026-10-19 09:15', submitter: '陈默', nature: '业务功能', bizContact: '', merged: true, childCount: 3, created: '2026-10-18 10:22' },
    { no: 'FS-20261020-003', title: '要货模板按组织隔离', module: 'STORE',  project: 'main',   start: '2026-10-26', end: '2026-10-26', status: 'PENDING',    submitter: '陈默', nature: '业务功能', bizContact: '' },
    { no: 'FS-20261020-004', title: '会员等级权益配置', module: 'MEMBER',   project: 'member', start: '2026-10-27', end: '2026-10-29', status: 'PENDING',    submitter: '张敏', nature: '业务功能', bizContact: '张敏' },
    { no: 'FS-20261020-005', title: '采购退货单状态机重构', module: 'ORDER', project: 'supply', start: '2026-10-28', end: '2026-10-28', status: 'PENDING',   submitter: '周洁', nature: '业务功能', bizContact: '周洁' },
    { no: 'FS-20261021-001', title: '门店要货看板刷新优化', module: 'STORE', project: 'main',  start: '2026-10-30', end: '2026-10-30', status: 'PENDING',   submitter: '王倩', nature: '技术支持', bizContact: '' },
    /* 周视图「未指定」负责人行演示：无开发人且无提交人（编号避开合并/新建演示生成的 -002/-003） */
    { no: 'FS-20261021-010', title: '要货单导入模板示例更新', module: 'STORE', project: 'none', start: '2026-10-24', end: '2026-10-24', status: 'PENDING', submitter: '', nature: '业务功能', bizContact: '' }
  ],

  /* 非需求改动列表（服务端分页，total 取全量；不参与搜索与只看自己） */
  nonFeature: {
    total: 4,
    items: [
      { no: 'FS-20261016-003', title: '修正 README 排版', module: 'MISC',  project: 'none',   submitter: '王倩', created: '2026-10-16 09:40' },
      { no: 'FS-20261015-004', title: '调整 CI 缓存键', module: 'MISC',    project: 'none',   submitter: '李强', created: '2026-10-15 18:22' },
      { no: 'FS-20261013-003', title: '补充接口注释', module: 'STORE',     project: 'main',   submitter: '张敏', created: '2026-10-13 16:07' },
      { no: 'FS-20261012-003', title: '升级依赖补丁版本', module: 'MISC',  project: 'member', submitter: '孙浩', created: '2026-10-12 10:51' }
    ]
  },

  /* 待澄清列表（business-rule §11.6）：收纳状态为待澄清的非子卡；服务端分页，默认每页 10 条（10 / 20 / 50）；
     排序=发起时间正序（等待最久在前），同刻按编号倒序；不受工作台筛选、搜索与只看自己影响。
     每条 = 卡片字段（负责人=submitter，界面以「提交人」呈现）+ 当前澄清（OPEN 记录投影）；
     preStatus/preStart/preEnd = 澄清前状态与原排期（原本未排期为空，仅展示不用于恢复）；srcHash = 卡片源 commit */
  clarifying: {
    total: 5,
    items: [
      {
        no: 'FS-20261014-003', title: '要货单支持临期商品自动拦截', module: 'STORE', project: 'main', submitter: '王倩',
        developer: '刘洋', takenAt: '2026-10-15 09:40', nature: '业务功能', bizContact: '王倩', created: '2026-10-14 10:31', srcHash: 'd4e7a10',
        content: 'feat(store): 要货单支持临期商品自动拦截\n\n- 门店提交要货单时按临期规则校验 SKU\n- 命中临期规则时提示门店并拦截提交',
        round: 2, raiser: '刘洋', raisedAt: '2026-10-16 15:20', channel: 'MCP',
        preStatus: 'IN_PROGRESS', preStart: '2026-10-16', preEnd: '2026-10-17',
        question: '1. 需求文档「要货单 › 临期拦截」2.3 节写「整单拦截」，第 4 节验收用例却要求「剔除临期 SKU 后继续提交」，两处矛盾。\n2. 被剔除的临期 SKU 是否回写「门店要货建议」并扣减建议量，文档未说明，影响建议量接口的改造范围。\n3. 期望：明确拦截交互（整单阻断 / 剔除并提示）与建议量联动规则，并补充对应验收用例。'
      },
      {
        no: 'FS-20261016-005', title: '会员积分抵扣门店收银', module: 'MEMBER', project: 'member', submitter: '张敏',
        nature: '业务功能', bizContact: '张敏', created: '2026-10-16 09:30', srcHash: 'a91c0e4',
        content: 'feat(member): 会员积分抵扣门店收银\n\n- 收银台支持会员积分抵扣现金\n- 小票打印抵扣明细',
        round: 1, raiser: '孙浩', raisedAt: '2026-10-17 11:05', channel: 'PC',
        preStatus: 'PENDING', preStart: '', preEnd: '',
        question: '1. 积分抵扣规则前后矛盾：第 3 节写「100 积分抵 1 元，单笔最多抵扣 50%」，第 5 节示例按「最多 30%」计算。\n2. 部分退货时已抵扣积分按比例原路退回还是折现退款，文档未说明，影响退款对账口径。\n3. 期望：统一抵扣比例与上限，并补充退货场景的积分处理规则。'
      },
      {
        no: 'FS-20261018-002', title: '加盟商月结对账单导出', module: 'ORDER', project: 'supply', submitter: '陈默',
        nature: '业务功能', bizContact: '周洁', created: '2026-10-18 15:10', srcHash: '61fa3c5',
        content: 'feat(order): 加盟商月结对账单导出\n\n- 按加盟商导出月度结算对账单（Excel）',
        round: 1, raiser: '周洁', raisedAt: '2026-10-19 16:40', channel: 'PC',
        preStatus: 'PENDING', preStart: '2026-10-23', preEnd: '2026-10-24',
        question: '1. 对账单字段清单缺少「物流费分摊」「促销补贴」两列的取数口径，研发无法确定来源表与计算方式。\n2. 导出范围按结算周期还是自然月未说明，跨月要货单的归属不明确。\n3. 期望：补充两列字段口径与导出范围定义，并给出一份对账样例。'
      },
      {
        no: 'FS-20261019-005', title: '门店盘点差异自动生成调整单', module: 'STOCK', project: 'supply', submitter: '李强',
        developer: '吴迪', takenAt: '2026-10-20 09:30', nature: '业务功能', bizContact: '', created: '2026-10-19 11:20', srcHash: '9d04b7e',
        content: 'feat(stock): 门店盘点差异自动生成调整单\n\n- 盘点提交后按差异自动生成库存调整单',
        round: 1, raiser: '陈默', raisedAt: '2026-10-20 10:15', channel: 'PC',
        preStatus: 'IN_PROGRESS', preStart: '2026-10-21', preEnd: '2026-10-22',
        question: '1. 盘点差异「超过阈值需店长复核」，但阈值按金额还是按数量、具体数值均未给出。\n2. 自动生成的库存调整单是否需要区域经理审批、是否复用现有「库存调整审批流」未说明。\n3. 店长复核超时（如 24 小时未处理）的处理方式缺失，请补充。'
      },
      {
        no: 'FS-20261020-006', title: 'POS 交班单增加电子价签同步状态', module: 'POS', project: 'pos', submitter: '陈刚',
        nature: '业务功能', bizContact: '', created: '2026-10-20 16:45', srcHash: '4b6e1d3',
        content: 'feat(pos): 交班单增加电子价签同步状态\n\n- 交班单展示当班价签同步成功 / 失败条目',
        round: 1, raiser: '吴迪', raisedAt: '2026-10-21 08:50', channel: 'MCP',
        preStatus: 'PENDING', preStart: '', preEnd: '',
        question: '1. 「价签同步失败」的判定来源两处描述不一致：2.1 节为价签网关回执，3.4 节为 POS 本地同步日志。\n2. 交班单展示失败条目后，收银员可执行的补救操作（重推 / 忽略）及所需权限未定义。'
      }
    ]
  },

  /* 完成澄清 · 修订 commit 候选（field-rules §11：候选仓=卡片的 harness 工程；只能点选，不提供 hash 手输）
     card：已出卡编号（列表标注，仍可选）/ 'DELETED'（卡片已删除，禁选）/ ''（尚未出卡，完成时当场出卡）；
     与待澄清卡 srcHash 相同者为本卡片源 commit（禁选）；7c2e4b8 对应卡片已开发完成，提交时被服务端拒绝（演示 AcAlert） */
  revisionCommits: [
    { repo: 'harness-main',   hash: '5be2c91', msg: 'docs(store): 要货单临期拦截改为剔除临期 SKU 并提示门店', author: '王倩', time: '2026-10-21 09:48', card: '' },
    { repo: 'harness-main',   hash: '0f3a7d6', msg: 'docs(store): 补充临期拦截与要货建议量联动的验收用例', author: '王倩', time: '2026-10-20 18:30', card: 'FS-20261020-008' },
    { repo: 'harness-main',   hash: 'b5c39d1', msg: 'docs: 更新部署文档与 changelog', author: '王倩', time: '2026-10-20 08:02', card: 'DELETED' },
    { repo: 'harness-main',   hash: 'd4e7a10', msg: 'feat(store): 要货单支持临期商品自动拦截', author: '王倩', time: '2026-10-14 10:26', card: 'FS-20261014-003' },
    { repo: 'harness-main',   hash: '7c2e4b8', msg: 'perf(store): 要货单导出性能优化方案', author: '刘洋', time: '2026-10-09 15:10', card: 'FS-20261009-002' },
    { repo: 'harness-member', hash: 'c6e09b2', msg: 'docs(member): 补充部分退货时积分原路退回规则', author: '张敏', time: '2026-10-21 09:20', card: '' },
    { repo: 'harness-member', hash: '3d8f2a1', msg: 'docs(member): 统一积分抵扣比例与单笔上限', author: '张敏', time: '2026-10-20 17:12', card: 'FS-20261020-009' },
    { repo: 'harness-member', hash: 'a91c0e4', msg: 'feat(member): 会员积分抵扣门店收银', author: '张敏', time: '2026-10-16 09:28', card: 'FS-20261016-005' },
    { repo: 'harness-supply', hash: 'e2b7d90', msg: 'docs(order): 补充加盟商对账单物流费与促销补贴口径', author: '周洁', time: '2026-10-21 08:40', card: '' },
    { repo: 'harness-supply', hash: 'c3a58f2', msg: 'docs(stock): 明确盘点差异复核阈值与超时处理', author: '周洁', time: '2026-10-20 19:05', card: '' },
    { repo: 'harness-supply', hash: '61fa3c5', msg: 'feat(order): 加盟商月结对账单导出', author: '陈默', time: '2026-10-18 15:06', card: 'FS-20261018-002' },
    { repo: 'harness-supply', hash: '9d04b7e', msg: 'feat(stock): 门店盘点差异自动生成调整单', author: '李强', time: '2026-10-19 11:16', card: 'FS-20261019-005' },
    { repo: 'harness-pos',    hash: '8e1c7a4', msg: 'docs(pos): 明确价签同步失败判定来源与补救操作', author: '陈刚', time: '2026-10-21 10:02', card: '' },
    { repo: 'harness-pos',    hash: '4b6e1d3', msg: 'feat(pos): 交班单增加电子价签同步状态', author: '陈刚', time: '2026-10-20 16:41', card: 'FS-20261020-006' }
  ],
  /* 修订 commit 选择器的分支候选（默认取仓在云效登记的默认分支 master） */
  revisionBranches: ['master', 'docs/2026-10-revise', 'release/2026.10'],

  /* 澄清记录历史（data.md §8；状态 OPEN 待澄清 / RESOLVED 已澄清 / WITHDRAWN 已撤回；渠道 PC / MCP）。
     待澄清（OPEN）记录由 clarifying 列表投影，此处只放已处理的记录 */
  clarifyRecords: [
    {
      cardNo: 'FS-20261014-003', round: 1, status: 'WITHDRAWN',
      question: '1. 「临期商品」判定口径未写明：按剩余保质期天数还是剩余比例？\n2. 拦截规则是否区分短保烘焙与常温零食？',
      raiser: '刘洋', raisedAt: '2026-10-15 11:02', channel: 'PC', preStatus: 'IN_PROGRESS', preStart: '2026-10-15', preEnd: '2026-10-16',
      handler: '王倩', handledAt: '2026-10-15 17:36', handleChannel: 'PC',
      reason: '沿用《门店商品临期管理规范》第 2 条：短保 ≤3 天、常温 ≤30 天，需求文档无需修订'
    },
    /* 两轮澄清：原卡 FS-20261013-004 第 1 次澄清完成后并入中间合并卡 FS-20261014-009；
       该合并卡再次澄清并完成后并入 FS-20261016-008，中间合并卡编号打开时跳转到最新合并卡 */
    {
      cardNo: 'FS-20261013-004', round: 1, status: 'RESOLVED',
      question: '1. 巡检拍照水印需展示哪些字段（门店编码 / 巡检人 / 拍摄时间 / 定位）未定义，水印位置与字号缺少示意。\n2. 期望：补充水印字段清单与样式示意。',
      raiser: '陈刚', raisedAt: '2026-10-14 10:20', channel: 'PC', preStatus: 'IN_PROGRESS', preStart: '2026-10-14', preEnd: '2026-10-15',
      handler: '赵敏', handledAt: '2026-10-14 16:40', handleChannel: 'PC',
      revisions: [
        { hash: '4c1d2e9', msg: 'docs(store): 补充巡检拍照水印字段与位置', author: '赵敏', time: '2026-10-14 16:12', card: 'FS-20261014-006' }
      ],
      mergedInto: 'FS-20261014-009'
    },
    {
      cardNo: 'FS-20261014-009', round: 1, status: 'RESOLVED',
      question: '1. 门店弱网离线拍照时，拍摄时间以手机本地时间还是服务器回传时间为准？涉及防作弊口径。\n2. 期望：明确时间口径。',
      raiser: '陈刚', raisedAt: '2026-10-15 10:05', channel: 'MCP', preStatus: 'IN_PROGRESS', preStart: '2026-10-15', preEnd: '2026-10-15',
      handler: '赵敏', handledAt: '2026-10-16 14:05', handleChannel: 'MCP',
      revisions: [
        { hash: '2a7f5b0', msg: 'docs(store): 明确离线拍照以服务器回传时间为准', author: '赵敏', time: '2026-10-16 13:48', card: 'FS-20261016-007' }
      ],
      mergedInto: 'FS-20261016-008'
    }
  ],

  /* 已在后续完成澄清中并入新合并卡的中间合并卡：编号 → 并入的卡片编号（打开时跳转到最新合并卡） */
  mergedAway: { 'FS-20261014-009': 'FS-20261016-008' },

  /* 完成澄清生成的合并卡（标题 / 负责人 / 需求性质 / 业务对接人取原卡；状态与开发人恢复为澄清前「开发中」；
     排期为空进入待排期池，由 PM 重新排期；原卡的合并前快照记录澄清前状态、空排期与开发人信息） */
  clarifiedMerge: {
    no: 'FS-20261016-008', title: '门店巡检任务支持拍照水印', module: 'STORE', project: 'main',
    status: 'IN_PROGRESS', developer: '陈刚', takenAt: '2026-10-14 09:05', submitter: '赵敏',
    nature: '业务功能', bizContact: '赵敏', created: '2026-10-16 14:05', merged: true, childCount: 3,
    clarifiedFrom: ['FS-20261013-004', 'FS-20261014-009'],
    content: '合并自 3 张子卡：\n- FS-20261013-004 门店巡检任务支持拍照水印\n- FS-20261014-006 补充巡检拍照水印字段与位置\n- FS-20261016-007 明确离线拍照以服务器回传时间为准',
    children: [
      { no: 'FS-20261016-007', title: '明确离线拍照以服务器回传时间为准', module: 'STORE', submitter: '赵敏', preStatus: '待开发', preDate: '—', mergedAt: '2026-10-16 14:05', created: '2026-10-16 13:52', srcHash: '2a7f5b0' },
      { no: 'FS-20261014-006', title: '补充巡检拍照水印字段与位置', module: 'STORE', submitter: '赵敏', preStatus: '待开发', preDate: '—', mergedAt: '2026-10-14 16:40', created: '2026-10-14 16:15', srcHash: '4c1d2e9' },
      { no: 'FS-20261013-004', title: '门店巡检任务支持拍照水印', module: 'STORE', submitter: '赵敏', preStatus: '开发中', preDate: '—', mergedAt: '2026-10-16 14:05', created: '2026-10-13 15:42', srcHash: 'e91b6c4', clarifyOrigin: true }
    ],
    logs: [
      { time: '2026-10-16 14:05', type: '创建卡片', op: '赵敏', desc: '澄清完成，合并自 3 张：FS-20261013-004, FS-20261014-006, FS-20261016-007' }
    ]
  },

  /* 合并卡 FS-20261018-001 的子卡明细（按并入时间倒序） */
  children: [
    { no: 'FS-20261015-005', title: '要货数量输入框失焦抖动', module: 'STORE', submitter: '周洁', preStatus: '待开发', preDate: '2026-10-19', mergedAt: '2026-10-18 10:22' },
    { no: 'FS-20261016-004', title: '要货单列表分页闪烁', module: 'STORE',   submitter: '王倩', preStatus: '开发中', preDate: '2026-10-20', mergedAt: '2026-10-18 10:22' },
    { no: 'FS-20261017-002', title: '要货单打印缺少门店编码', module: 'STORE', submitter: '李强', preStatus: '待开发', preDate: '—',        mergedAt: '2026-10-18 10:22' }
  ],

  /* 操作日志（合并卡 FS-20261018-001，倒序） */
  logs: [
    { time: '2026-10-19 09:15', type: '领取开发',  op: '李强', desc: '领取开发：李强（扩散至 3 张子卡）' },
    { time: '2026-10-19 09:10', type: '调整排期',  op: '陈默', desc: '排期：2026-10-19 → 2026-10-22 ~ 2026-10-23（扩散至 3 张子卡）' },
    { time: '2026-10-18 10:22', type: '创建卡片',  op: '陈默', desc: '合并自 3 张：FS-20261015-005, FS-20261016-004, FS-20261017-002' }
  ],

  /* 完成 commit 回执（完成卡 FS-20261009-002） */
  doneCommits: [
    { hash: 'a3f91c2', msg: 'perf(store): 要货单导出改流式写入', repo: 'busyming-server', author: '刘洋', time: '2026-10-14 16:58', url: 'https://codeup.aliyun.com/busyming/busyming-server/commit/a3f91c2' },
    { hash: '7d20e8b', msg: 'fix(store): 导出任务取消时释放连接', repo: 'busyming-server', author: '刘洋', time: '2026-10-14 17:15', url: 'https://codeup.aliyun.com/busyming/busyming-server/commit/7d20e8b' }
  ],

  /* 只读云效研发仓演示候选（新建卡片选仓与完成 commit 使用；映射维护归项目管理） */
  repos: [
    { name: 'harness-main',   id: 'repo-1024', owner: '鸣鸣很忙主站' },
    { name: 'harness-supply', id: 'repo-2048', owner: '供应链中台' },
    { name: 'harness-pos',    id: 'repo-3072', owner: '门店 POS' },
    { name: 'harness-member', id: 'repo-4096', owner: '会员中心' },
    { name: 'harness-fran',   id: 'repo-5120', owner: '', stale: true, note: '云效侧已失效' },
    { name: 'busyming-web',    id: 'repo-6144', owner: '鸣鸣很忙主站' },
    { name: 'busyming-server', id: 'repo-7168', owner: '鸣鸣很忙主站' },
    { name: 'supply-api',      id: 'repo-8192', owner: '供应链中台' },
    { name: 'pos-client',      id: 'repo-9216', owner: '门店 POS' },
    { name: 'member-service',  id: 'repo-10240', owner: '会员中心' }
  ],

  /* 新建卡片弹窗的 commit 检索结果（harness-main 仓；含已出卡与已删除标注） */
  repoCommits: [
    { hash: 'e81ac07', msg: 'feat(store): 要货单增加批量导入入口', author: '王倩', time: '2026-10-20 09:12', card: 'FS-20261020-001' },
    { hash: 'b5c39d1', msg: 'docs: 更新部署文档与 changelog', author: '王倩', time: '2026-10-20 08:02', card: 'DELETED' },
    { hash: 'c77f0a2', msg: 'feat(store): 要货单支持按商品分类汇总行', author: '赵敏', time: '2026-10-19 19:44', card: '' },
    { hash: '9a04d66', msg: 'fix(store): 要货建议数量四舍五入口径', author: '刘洋', time: '2026-10-19 14:08', card: '' },
    { hash: 'f2e8813', msg: 'refactor(store): 拆分要货单查询服务', author: '陈刚', time: '2026-10-18 17:33', card: '' }
  ],

  /* 完成 commit 选择器候选（卡片归属项目的代码服务仓 busyming-server，分支 master） */
  doneCandidates: [
    { hash: 'a3f91c2', msg: 'perf(store): 要货单导出改流式写入', repo: 'busyming-server', author: '刘洋', time: '2026-10-14 16:58', url: 'https://codeup.aliyun.com/busyming/busyming-server/commit/a3f91c2' },
    { hash: '7d20e8b', msg: 'fix(store): 导出任务取消时释放连接', repo: 'busyming-server', author: '刘洋', time: '2026-10-14 17:15', url: 'https://codeup.aliyun.com/busyming/busyming-server/commit/7d20e8b' },
    { hash: '51bb9f0', msg: 'test(store): 导出大数据量回归用例', repo: 'busyming-server', author: '刘洋', time: '2026-10-14 18:02', url: 'https://codeup.aliyun.com/busyming/busyming-server/commit/51bb9f0' }
  ],

  /* 发版日标记（仅视觉标记，不参与状态与延期判定） */
  releaseDays: ['2026-10-30'],

  /* 筛选项全集（status 为筛选抽屉选项口径：「已完成」对应卡片徽标「开发完成」；「延期」为前端派生；
     不含待澄清与非需求改动——二者不进月历与待排期池，分别在待澄清列表与非需求改动列表呈现） */
  filterOptions: {
    status: ['待开发', '开发中', '已完成', '延期'],
    owners: ['陈默', '王倩', '李强', '张敏', '陈刚', '刘洋', '周洁', '孙浩', '赵敏', '吴迪'],
    repos: ['harness-main', 'harness-supply', 'harness-pos', 'harness-member'],
    projects: ['鸣鸣很忙主站', '供应链中台', '门店 POS', '会员中心', '未归属项目'],
    modules: ['STORE', 'ORDER', 'STOCK', 'MEMBER', 'POS', 'MISC']
  },

  /* 本月进度（口径见 business-rule §4：延期单列；待排期取池内全量）；clarifying=待澄清全量（指挥栏入口计数，不属于本月进度） */
  stats: { pool: 24, pending: 8, doing: 4, done: 2, delayed: 2, clarifying: 5 }
};

/* 补齐卡片默认字段与 OPEN 澄清记录；工作台列表 / 详情页读取同一组记录，演示基准时间固定。 */
(function (D) {
  D.clarifying.items.forEach(function (it) {
    it.status = 'CLARIFYING';
    it.waitingDays = Math.max(0, Math.floor((new Date(D.now.replace(' ', 'T')) - new Date(it.raisedAt.replace(' ', 'T'))) / 86400000));
    D.clarifyRecords.push({ cardNo: it.no, round: it.round, status: 'OPEN', question: it.question,
      raiser: it.raiser, raisedAt: it.raisedAt, channel: it.channel, raisedChannel: it.channel === 'PC' ? 'WEB' : 'MCP',
      preStatus: it.preStatus, preStart: it.preStart, preEnd: it.preEnd });
  });
})(window.FS_DATA);

/* ========== 两页共用的原型壳辅助（导航「原型页面」切换、全局提示、浮层、需求澄清弹窗） ========== */
window.FS_PROTO = (function () {
  var D = window.FS_DATA;

  /* ---------- Esc 分层关闭：栈顶优先；已关闭（隐藏 / 移除）的浮层自动跳过；关闭被拦截（如脏数据确认）时保留该层 ---------- */
  var escStack = [];
  var escFallback = null;
  function isLive(entry) { return !entry.el || (document.body.contains(entry.el) && !entry.el.hidden); }
  function pushEsc(el, fn) { escStack.push({ el: el || null, fn: fn }); }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var dropdown = Array.prototype.filter.call(document.querySelectorAll('.busy-select-dropdown[id]'), function (el) { return !el.hidden && el.getBoundingClientRect().height > 0; }).pop();
    if (dropdown) { dropdown.hidden = true; return; }
    while (escStack.length) {
      var top = escStack.pop();
      if (!isLive(top)) continue;
      var mark = escStack.length;
      try { top.fn(); } catch (err) {}
      if (top.el && isLive(top)) escStack.splice(mark, 0, top); /* 新开的确认框在其上，本层保持在下 */
      return;
    }
    if (escFallback) escFallback(); /* 无浮层时：交给页面（如退出多选态） */
  });
  function onEsc(fn, el) { pushEsc(el, fn); }
  function setEscFallback(fn) { escFallback = fn; }

  /* ---------- 浮层托管：busy-overlay-demo host + runtime.css 的 busy-overlay（EP 遮罩层：fixed 全屏、可滚动）；
     打开时 host 移至 body 末尾，同层级下后开的浮层叠在上方 ---------- */
  function ensureHost(id) {
    var host = document.getElementById(id);
    if (!host) {
      host = document.createElement('div');
      host.id = id;
      host.className = 'busy-overlay-demo busy-overlay';
      host.hidden = true;
      document.body.appendChild(host);
    }
    return host;
  }
  function openOverlay(id, onClose) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    document.body.appendChild(el);
    BusyNative.inputs(el);
    var close = onClose || function () { el.hidden = true; };
    el.onclick = function (e) { if (e.target === el) close(); };
    pushEsc(el, close);
  }
  function closeOverlay(id) {
    var el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  function isOverlayOpen() {
    return Array.prototype.some.call(document.querySelectorAll('.busy-overlay-demo'), function (el) { return !el.hidden; });
  }
  /* 浮层几何由原生浏览器布局效果承载，不注入 style 属性、style 块或私有样式表。
     固定列表高度内 body 独立滚动，header / footer 不随条数、分栏、页码变化。 */
  function layoutOverlay(id, width, height) {
    var host = document.getElementById(id), dialog = host && host.querySelector('.busy-dialog');
    if (!dialog) return;
    function geometry(el, props) {
      if (el._geometry) el._geometry.cancel();
      el._geometry = el.animate([props, props], { duration: 1, fill: 'forwards' });
    }
    geometry(dialog, {
      width: Math.min(width, window.innerWidth - 48) + 'px',
      height: Math.min(height, window.innerHeight - 48) + 'px',
      display: 'flex', flexDirection: 'column'
    });
    geometry(dialog.querySelector('.busy-dialog__header'), { flexShrink: '0' });
    geometry(dialog.querySelector('.busy-dialog__body'), { flex: '1 1 auto', minHeight: '0px', overflowY: 'auto' });
    geometry(dialog.querySelector('.busy-dialog__footer'), { flexShrink: '0' });
  }

  function renderNav(opts) {
    /* opts: { active: 'schedule'|'detail', switchers: [{label,current,currentKey,options:[{key,label,short}],onPick}] } */
    var nav = document.querySelector('.tpl-nav');
    if (!nav) return;
    var spacer = nav.querySelector('.tpl-nav__spacer');

    /* 原型页面切换：深色导航上使用 busy-button--ghost（反白场景按钮） */
    var box = document.createElement('span');
    box.className = 'tpl-nav__crumb';
    box.appendChild(document.createTextNode('原型页面 '));
    [
      { href: 'feature-schedule.html', label: '研发排期工作台', key: 'schedule' },
      { href: 'feature-schedule-detail.html', label: '卡片详情页', key: 'detail' }
    ].forEach(function (p) {
      var a = document.createElement('a');
      a.href = p.href;
      var cls = 'busy-button busy-button--small busy-button--ghost';
      if (p.key === opts.active) cls += ' is-active';
      a.innerHTML = '<button class="' + cls + '" type="button"><span>' + p.label + '</span></button>';
      box.appendChild(a);
      box.appendChild(document.createTextNode(' '));
    });
    nav.insertBefore(box, spacer);

    /* 演示切换器（详情页：演示卡片 / 整页状态）：ghost 按钮 + 居中 busy-dialog 选项菜单；选中后按钮文案同步 */
    (opts.switchers || []).forEach(function (sw) {
      var holder = document.createElement('span');
      holder.innerHTML = '<button class="busy-button busy-button--small busy-button--ghost" type="button"><span></span></button>';
      var btn = holder.firstChild;
      function syncLabel() { btn.querySelector('span').textContent = sw.label + '：' + sw.current + ' ▾'; }
      sw.sync = function (key) {
        var o = sw.options.filter(function (x) { return x.key === key; })[0];
        if (o) { sw.currentKey = key; sw.current = o.short || o.label; }
        syncLabel();
      };
      syncLabel();
      btn.addEventListener('click', function () {
        var host = ensureHost('fsSwitcher');
        host.innerHTML =
          '<div class="busy-dialog">' +
            '<div class="busy-dialog__header"><span class="busy-dialog__title">' + sw.label + '</span>' +
            '<button class="busy-dialog__close" type="button" data-x="close">✕</button></div>' +
            '<div class="busy-dialog__body"><div class="busy-select-dropdown">' +
              sw.options.map(function (o) {
                return '<div class="busy-select-dropdown__item' + (o.key === sw.currentKey ? ' is-selected' : '') + '" data-key="' + o.key + '">' + o.label + '</div>';
              }).join('') +
            '</div></div>' +
          '</div>';
        openOverlay('fsSwitcher');
        host.querySelector('[data-x="close"]').onclick = function () { host.hidden = true; };
        host.querySelectorAll('.busy-select-dropdown__item').forEach(function (item) {
          item.onclick = function () {
            host.hidden = true;
            sw.sync(item.getAttribute('data-key'));
            sw.onPick(item.getAttribute('data-key'));
          };
        });
      });
      nav.insertBefore(holder, spacer);
    });
  }

  /* ---------- 全局提示（G12 / M6）：runtime.css 的 busy-notification（fixed、z-index 9999，浮于遮罩之上），
     host 紧随导航，提示出现在页面顶部右侧 ---------- */
  function toast(msg, type) {
    var t = type || 'success';
    var host = document.getElementById('fsToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fsToastHost';
      var nav = document.querySelector('.tpl-nav');
      if (nav && nav.parentNode === document.body) document.body.insertBefore(host, nav.nextSibling);
      else document.body.insertBefore(host, document.body.firstChild);
    }
    var icon = { success: '✓', error: '✕', warning: '!', info: 'i' }[t] || 'i';
    host.innerHTML = '<div class="busy-notification right" role="status" data-type="' + t + '">' +
      '<span class="busy-notification__icon busy-notification--' + t + '">' + icon + '</span>' +
      '<div class="busy-notification__group"><div class="busy-notification__content">' + msg + '</div></div></div>';
    clearTimeout(host._t);
    host._t = setTimeout(function () { host.innerHTML = ''; }, 2600);
  }

  /* 二次确认（BusyMessageBox 语义；以 busy-dialog 呈现于独立遮罩层，叠在当前弹窗之上） */
  function confirmBox(opts) {
    var host = ensureHost('fsConfirm');
    host.innerHTML =
      '<div class="busy-dialog" role="alertdialog">' +
        '<div class="busy-dialog__header"><span class="busy-dialog__title">' + (opts.title || '操作确认') + '</span></div>' +
        '<div class="busy-dialog__body">' + opts.message + '</div>' +
        '<div class="busy-dialog__footer">' +
          '<button class="busy-button" type="button" data-x="cancel"><span>取 消</span></button>' +
          '<button class="busy-button busy-button--primary" type="button" data-x="ok"><span>' + (opts.okText || '确 定') + '</span></button>' +
        '</div>' +
      '</div>';
    openOverlay('fsConfirm');
    host.querySelector('[data-x="cancel"]').onclick = function () { host.hidden = true; if (opts.onCancel) opts.onCancel(); };
    host.querySelector('[data-x="ok"]').onclick = function () {
      var btn = this;
      if (btn.dataset.loading) return;
      btn.dataset.loading = '1';
      btn.innerHTML = '<span class="busy-button__loading"></span><span>' + (opts.okText || '确 定') + '</span>';
      setTimeout(function () { host.hidden = true; if (opts.onOk) opts.onOk(); }, 500);
    };
  }

  /* 按钮 loading 演示：0.6s 后恢复并回调（loading 期间重复点击忽略） */
  function btnLoading(btn, done) {
    if (btn.dataset.loading) return;
    btn.dataset.loading = '1';
    var old = btn.innerHTML;
    btn.innerHTML = '<span class="busy-button__loading"></span>' + old;
    setTimeout(function () { btn.innerHTML = old; delete btn.dataset.loading; if (done) done(); }, 600);
  }

  /* 业务提示 / 弹窗顶部提示（AcAlert = busy-alert，文档流内呈现） */
  function alertHtml(type, title, desc, id, hidden) {
    return '<div class="busy-alert busy-alert--' + type + ' is-light" role="alert"' + (id ? ' id="' + id + '"' : '') + (hidden ? ' hidden' : '') + '>' +
      '<div class="busy-alert__content"><span class="busy-alert__title">' + (title || '') + '</span>' +
      (desc ? '<p class="busy-alert__description">' + desc + '</p>' : '') + '</div></div>';
  }
  function setAlert(el, msg) {
    if (!el) return;
    el.querySelector('.busy-alert__title').innerHTML = msg || '';
    el.hidden = !msg;
  }

  function projectOf(key) {
    if (key === 'none') return D.unassigned;
    return D.projects.filter(function (p) { return p.key === key; })[0] || D.unassigned;
  }
  /* 项目标签：项目名前置标签图标（◆），颜色取项目标识色（近似映射见文件头注释） */
  function projectTag(key, small) {
    var p = projectOf(key);
    return '<span class="busy-tag ' + p.cls + (small ? ' busy-tag--small' : '') + '" title="标识色：' + p.colorName + '">◆ ' + p.name + '</span>';
  }
  var STATUS_LABEL = { PENDING: '待开发', IN_PROGRESS: '开发中', DONE: '开发完成', CLARIFYING: '待澄清', NON_FEATURE: '非需求改动' };
  function statusLabel(code) { return STATUS_LABEL[code || 'PENDING'] || code; }
  function statusMeta(card) {
    var delayed = (card.status === 'PENDING' || card.status === 'IN_PROGRESS') && card.end && card.end < D.today;
    if (delayed) return { label: '延期', cls: 'is-warning' };
    if (card.status === 'DONE') return { label: '开发完成', cls: 'is-success' };
    if (card.status === 'IN_PROGRESS') return { label: '开发中', cls: 'is-processing' };
    if (card.status === 'CLARIFYING') return { label: '待澄清', cls: 'is-warning' };
    if (card.status === 'NON_FEATURE') return { label: '非需求改动', cls: '' };
    return { label: '待开发', cls: '' };
  }
  function statusCell(card) {
    var m = statusMeta(card);
    return '<span class="tpl-cell-status ' + m.cls + '">' + m.label + '</span>';
  }
  function mmdd(d) { return d ? d.slice(5) : ''; }
  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
  }

  /* ---------- 文本与时间工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function multiline(s) { return esc(s).replace(/\n/g, '<br>'); }
  function textLen(s) { return Array.from(String(s || '').trim()).length; } /* 首尾空白不计入字数 */
  /* 问题摘要：取前 50 字，超出以「…」省略（field-rules §10）；换行折叠为空格 */
  function summary(q, n) {
    var arr = Array.from(String(q || '').replace(/\s+/g, ' ').trim());
    n = n || 50;
    return arr.length > n ? arr.slice(0, n).join('') + '…' : arr.join('');
  }
  function toDate(s) { return new Date(s.replace(' ', 'T') + (s.length <= 10 ? 'T00:00:00' : ':00')); }
  /* 等待时长：发起至今；超过 2 天为警示（business-rule §11.6） */
  function waitInfo(raisedAt) {
    var mins = Math.max(0, Math.round((toDate(D.now) - toDate(raisedAt)) / 60000));
    var d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    var short = d ? d + ' 天' : h ? h + ' 小时' : m ? m + ' 分钟' : '刚刚';
    var long = d ? d + ' 天' + (h ? ' ' + h + ' 小时' : '') : h ? h + ' 小时' + (m ? ' ' + m + ' 分钟' : '') : short;
    return { short: short, long: long, over2d: mins > 2 * 1440 };
  }
  /* 池卡片相对时间标签（刚刚 / X 分钟前 / X 小时前 / X 天前），超过 7 天未排期为警示 */
  function agoInfo(created) {
    var mins = Math.max(0, Math.round((toDate(D.now) - toDate(created)) / 60000));
    var d = Math.floor(mins / 1440);
    var text = mins < 1 ? '刚刚' : mins < 60 ? mins + ' 分钟前' : mins < 1440 ? Math.floor(mins / 60) + ' 小时前' : d + ' 天前';
    return { text: text, stale: d > 7 };
  }
  function rangeText(start, end) {
    if (!start) return '';
    return start + (end && end !== start ? ' ~ ' + end : '');
  }
  /* 卡片的 harness 工程（修订 commit 候选仓）：普通卡为其源仓；未归属项目的卡片源仓演示为已停用项目的 harness-fran */
  function harnessOf(card) { return card.repo || projectOf(card.project).harness || 'harness-fran'; }
  function pseudoHash(no) {
    var n = 7;
    Array.from(no).forEach(function (ch) { n = (n * 31 + ch.charCodeAt(0)) >>> 0; });
    return ('0000000' + n.toString(16)).slice(-7);
  }
  /* 编号生成（field-rules §1：FS-{YYYYMMDD}-{NNN}，同日递增；演示从当日 004 起，跳过已占用编号） */
  var seq = 3;
  function nextCardNo(isUsed) {
    var no;
    do { seq++; no = 'FS-' + D.today.replace(/-/g, '') + '-' + ('00' + seq).slice(-3); } while (isUsed && isUsed(no));
    return no;
  }
  /* 卡片当前状态查询（完成澄清的服务端校验演示）；页面可通过 opts.lookup 覆盖 */
  /* 澄清记录只新增与推进，不删除；PC 操作记录渠道枚举 WEB，展示渠道 PC。 */
  function saveClarification(no, info, status, extra) {
    var r = D.clarifyRecords.filter(function (x) { return x.cardNo === no && x.round === info.round; })[0];
    if (!r) { r = { cardNo: no }; D.clarifyRecords.push(r); }
    ['round', 'question', 'raiser', 'raisedAt', 'channel', 'preStatus', 'preStart', 'preEnd'].forEach(function (k) { r[k] = info[k]; });
    r.status = status;
    r.raisedChannel = r.channel === 'PC' ? 'WEB' : 'MCP';
    if (status !== 'OPEN') { r.handler = D.user; r.handledAt = D.now; r.handleChannel = 'PC'; r.handledChannel = 'WEB'; }
    Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
    return r;
  }
  /* 一次性页面交接：导航保留刚操作的 Mock 卡片与澄清记录；详情页消费后移除，刷新仍恢复演示数据。 */
  /* 澄清来源：由早到晚的前序卡片编号（兼容单个编号） */
  function lineageOf(card) {
    var from = card && card.clarifiedFrom;
    return !from ? [] : Array.isArray(from) ? from.slice() : [from];
  }
  /* 已并入新合并卡的中间合并卡编号 → 最新的卡片编号；未并入时原样返回 */
  function liveNo(no) {
    var cur = no;
    for (var i = 0; i < 10 && D.mergedAway && D.mergedAway[cur]; i++) cur = D.mergedAway[cur];
    return cur;
  }
  function openDetail(card) {
    var ids = [card.no].concat(lineageOf(card));
    (card.children || []).forEach(function (c) { ids.push(c.no); });
    sessionStorage.setItem('fs_card_handoff', JSON.stringify({ card: card, records: D.clarifyRecords.filter(function (r) { return ids.indexOf(r.cardNo) >= 0 || r.mergedInto === card.no; }) }));
    location.href = 'feature-schedule-detail.html?no=' + encodeURIComponent(card.no);
  }
  function findAnyCard(no) {
    var lists = [D.scheduled, D.pool.items, D.pool.page2, D.pool.page3, D.nonFeature.items];
    for (var i = 0; i < lists.length; i++) {
      var hit = lists[i].filter(function (c) { return c.no === no; })[0];
      if (hit) return hit;
    }
    var merges = D.scheduled.concat(D.pool.items, D.pool.page2, D.pool.page3, [D.clarifiedMerge]).filter(function (c) { return c.merged; });
    var parent = merges.filter(function (m) { return (m.sourceCommits || []).some(function (s) { return s.no === no; }); })[0];
    if (parent) return { no: no, status: parent.status, child: true, parent: parent.no };
    var clr = D.clarifying.items.filter(function (c) { return c.no === no; })[0];
    if (clr) return { no: clr.no, status: 'CLARIFYING' };
    return null;
  }
  /* JS 两行截断（无 line-clamp 私有 CSS）：超出两行时按字缩短并补「…」，title 保留全文 */
  function clampLines(el, lines) {
    var full = el.getAttribute('data-full');
    if (full == null) { full = el.textContent; el.setAttribute('data-full', full); }
    el.textContent = '字';
    var lineH = el.offsetHeight || 18;
    var max = lineH * (lines || 2) + 2;
    el.textContent = full;
    if (el.offsetHeight <= max) return;
    var chars = Array.from(full), lo = 0, hi = chars.length;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      el.textContent = chars.slice(0, mid).join('') + '…';
      if (el.offsetHeight <= max) lo = mid; else hi = mid - 1;
    }
    el.textContent = chars.slice(0, lo).join('') + '…';
    el.title = full;
  }

  /* ====================== 需求澄清弹窗（工作台 G14 与详情页 M7–M9 同一实现） ====================== */
  var Q_MAX = 2000, REASON_MAX = 200, PICK_MAX = 20;
  function clarifyOf(card) { return card.clarify || card; } /* 详情页卡片挂 clarify；工作台列表条目字段平铺 */
  function dialogShell(title, body, okText) {
    return '<div class="busy-dialog" role="dialog" aria-label="' + title + '">' +
      '<div class="busy-dialog__header"><span class="busy-dialog__title">' + title + '</span>' +
      '<button class="busy-dialog__close" type="button" data-x="close" aria-label="关闭">✕</button></div>' +
      '<div class="busy-dialog__body"><div class="tpl-section">' + body + '</div></div>' +
      '<div class="busy-dialog__footer">' +
        '<button class="busy-button" type="button" data-x="cancel"><span>取 消</span></button>' +
        '<button class="busy-button busy-button--primary" type="button" data-x="ok"><span>' + okText + '</span></button>' +
      '</div></div>';
  }
  function cardLine(card, status) {
    var shown = status ? { status: status } : card; /* 完成 / 撤回弹窗中卡片为待澄清 */
    return '<div class="chip-group"><span class="u-mono u-sub">' + card.no + '</span><b>' + esc(card.title) + '</b>' +
      statusCell(shown) + projectTag(card.project, true) +
      (card.merged ? '<span class="busy-tag busy-tag--small is-plain">⊕ 合并 · ' + card.childCount + ' 项</span>' : '') + '</div>';
  }
  function bindClose(host, tryClose) {
    host.querySelector('[data-x="close"]').onclick = tryClose;
    host.querySelector('[data-x="cancel"]').onclick = tryClose;
  }

  /* M7 / G14 转待澄清：澄清问题必填 1–2000 字（首尾空白不计）；已输入问题时关闭需确认放弃 */
  function openRaise(hostId, card, opts) {
    opts = opts || {};
    var host = ensureHost(hostId);
    var owner = card.submitter || '';
    var notice = !owner || card.ownerUnmatched ? '负责人未匹配系统用户，不发送通知'
      : owner === D.user ? '负责人为你本人，不发送通知' : '负责人 ' + owner + ' 将收到通知';
    var tips = ['转待澄清后卡片移出排期，开发人保留，' + notice];
    if (card.start) tips.push('原排期 ' + rangeText(card.start, card.end) + ' 将被清空');
    if (card.merged) tips.push('状态与排期变化扩散至 ' + card.childCount + ' 张子卡');
    var body =
      alertHtml('error', '', '', 'clrRaiseAlert', true) +
      alertHtml('info', tips.join('；')) +
      cardLine(card) +
      '<div class="busy-form-item"><div class="busy-form-item__label is-required">澄清问题</div>' +
      '<div class="busy-form-item__content">' +
        '<textarea class="busy-textarea" id="clrQuestion" rows="7" placeholder="写明问题所在的需求文档位置或功能点、当前描述的缺失或矛盾、对开发的影响与期望的澄清结果；多个问题逐条编号，例如：&#10;1. 《要货单》2.3 节「整单拦截」与第 4 节验收用例矛盾…&#10;2. …"></textarea>' +
        '<div class="u-sub"><span id="clrQCnt">0</span>/' + Q_MAX + ' · 提交后不可修改，需补充时撤回后重新发起</div>' +
        '<div class="busy-form-item__error" id="clrQErr" hidden></div>' +
      '</div></div>';
    host.innerHTML = dialogShell('转待澄清', body, '提 交');
    var ta = host.querySelector('#clrQuestion'), err = host.querySelector('#clrQErr'), cnt = host.querySelector('#clrQCnt');
    function close() { host.hidden = true; }
    function tryClose() {
      if (textLen(ta.value) > 0) {
        confirmBox({ title: '放弃提交', message: '澄清问题尚未提交，确认放弃？', onOk: close });
      } else close();
    }
    function check(onSubmit) {
      var n = textLen(ta.value);
      cnt.textContent = n;
      cnt.classList.toggle('u-danger', n > Q_MAX);
      var msg = n === 0 ? '请填写澄清问题' : n > Q_MAX ? '澄清问题最长 ' + Q_MAX + ' 字' : '';
      err.textContent = msg; err.hidden = !msg;
      if (msg && onSubmit) ta.focus();
      return !msg;
    }
    openOverlay(hostId, tryClose);
    ta.addEventListener('input', function () { check(false); });
    bindClose(host, tryClose);
    host.querySelector('[data-x="ok"]').onclick = function () {
      if (!check(true)) return;
      var q = ta.value.trim();
      btnLoading(this, function () {
        close();
        if (opts.onSuccess) opts.onSuccess(q);
      });
    };
    setTimeout(function () { ta.focus(); }, 0);
  }

  /* M8 / G14 完成澄清：修订 commit 1–20 条，只能点选；已出卡标注编号、卡片已删除禁选、本卡片源 commit 禁选；
     已选 commit 时关闭需确认放弃；服务端拒绝（修订卡已开发完成 / 待澄清 / 已是其他合并卡子卡）以弹窗顶部 AcAlert 呈现 */
  function candidateRepos(card) {
    if (card.merged && card.sourceCommits && card.sourceCommits.length) return card.sourceCommits.map(function (s) { return s.repo; }).filter(function (r, i, a) { return a.indexOf(r) === i; });
    if (card.merged && card.childRepos && card.childRepos.length) return card.childRepos.slice();
    return [harnessOf(card)];
  }
  function candidatesOf(card, repo) {
    var list = D.revisionCommits.filter(function (c) { return c.repo === repo; });
    var sources = card.sourceCommits || [];
    sources.filter(function (s) { return s.repo === repo; }).forEach(function (s) {
      if (!list.some(function (c) { return c.hash === s.hash; })) list.push({ repo: repo, hash: s.hash, card: s.no, msg: '原子卡需求：' + s.title, author: s.author, time: s.time });
    });
    var src = card.srcHash || (card.merged ? '' : pseudoHash(card.no));
    if (src && !list.some(function (c) { return c.hash === src; }) && repo === harnessOf(card)) {
      list = list.concat([{ repo: repo, hash: src, msg: 'feat(' + String(card.module || 'misc').toLowerCase() + '): ' + card.title, author: card.submitter || '—', time: card.created || '—', card: card.no }]);
    }
    return list.map(function (c) {
      var own = c.hash === src || c.card === card.no || sources.some(function (s) { return s.repo === repo && s.hash === c.hash; });
      return { c: c, own: own, deleted: c.card === 'DELETED' };
    });
  }
  function openResolve(hostId, card, opts) {
    opts = opts || {};
    var host = ensureHost(hostId);
    var info = clarifyOf(card);
    var repos = candidateRepos(card);
    var st = { repo: repos.length === 1 ? repos[0] : '', branch: D.revisionBranches[0], kw: '', picks: [], expanded: false, pickErr: '' };
    var lookup = opts.lookup || findAnyCard;

    function rowTags(x) {
      if (x.own) return '<span class="busy-tag busy-tag--small busy-tag--info">本卡片源 commit</span>';
      if (x.deleted) return '<span class="busy-tag busy-tag--small busy-tag--info">卡片已删除</span>';
      return x.c.card ? '<span class="busy-tag busy-tag--small is-plain">已出卡 ' + x.c.card + '</span>' : '<span class="busy-tag busy-tag--small busy-tag--info is-plain">未出卡</span>';
    }
    function render() {
      var cands = st.repo ? candidatesOf(card, st.repo) : [];
      var kw = st.kw.toLowerCase();
      var shown = cands.filter(function (x) { return !kw || (x.c.hash + ' ' + x.c.msg + ' ' + x.c.author).toLowerCase().indexOf(kw) >= 0; });
      var qBlock = st.expanded
        ? '<div>' + multiline(info.question) + '</div><div><button class="busy-button is-link" type="button" data-x="fold"><span>收起</span></button></div>'
        : '<div class="chip-group"><span>' + esc(summary(info.question)) + '</span><button class="busy-button is-link" type="button" data-x="unfold"><span>展开全文</span></button></div>';
      var body =
        alertHtml('error', '', '', 'clrResolveAlert', true) +
        alertHtml('info', '请先修订需求文档并提交，再选择修订 commit；完成后原卡与修订卡自动合并为新合并卡，恢复为「' + statusLabel(info.preStatus) + '」并回到待排期池') +
        cardLine(card, 'CLARIFYING') +
        '<div class="tpl-section"><div class="tpl-section__head">当前澄清问题 <span class="u-sub">第 ' + (info.round || 1) + ' 次 · ' + esc(info.raiser) + ' 发起于 ' + info.raisedAt + '（' + info.channel + '）</span></div>' + qBlock + '</div>' +
        '<div class="tpl-section"><div class="tpl-section__head">已选修订 commit（' + st.picks.length + '/' + PICK_MAX + '）</div>' +
          (st.picks.length ? st.picks.map(function (c) {
            return '<div class="chip-group"><span class="u-mono">' + c.hash + '</span><span>' + esc(c.msg) + '</span>' +
              (c.card ? '<span class="busy-tag busy-tag--small is-plain">已出卡 ' + c.card + '</span>' : '<span class="busy-tag busy-tag--small busy-tag--info is-plain">完成时当场出卡</span>') +
              '<button class="busy-button is-link" type="button" data-unpick="' + c.hash + '"><span>移除</span></button></div>';
          }).join('') : '<div class="u-sub">暂无，请从下方 commit 列表点选（至少 1 条）</div>') +
        '</div>' +
        '<div class="busy-form-item"><div class="busy-form-item__label is-required">代码仓</div><div class="busy-form-item__content">' +
          (repos.length === 1
            ? '<div class="busy-input is-disabled"><input readonly disabled value="' + st.repo + '"></div><div class="u-sub">候选为卡片的 harness 工程，仅一个时已自动选中</div>'
            : '<div class="busy-select" data-x="repo"><div class="busy-input"><input readonly placeholder="请选择 harness 工程" value="' + st.repo + '"></div><span class="busy-select__caret">▾</span></div>' +
              '<div class="busy-select-dropdown" id="clrRepoDd" hidden>' + repos.map(function (r) {
                return '<div class="busy-select-dropdown__item' + (r === st.repo ? ' is-selected' : '') + '" data-repo="' + r + '">' + r + '</div>';
              }).join('') + '</div>') +
        '</div></div>' +
        '<div class="busy-form-item"><div class="busy-form-item__label">分支</div><div class="busy-form-item__content">' +
          '<div class="busy-select"><div class="busy-input"><input id="clrBranch" value="' + esc(st.branch) + '" placeholder="输入或点选分支"></div><span class="busy-select__caret" data-x="branch">▾</span></div>' +
          '<div class="busy-select-dropdown" id="clrBranchDd" hidden>' + D.revisionBranches.map(function (b) {
            return '<div class="busy-select-dropdown__item' + (b === st.branch ? ' is-selected' : '') + '" data-branch="' + b + '">' + b + '</div>';
          }).join('') + '</div>' +
        '</div></div>' +
        '<div class="busy-form-item"><div class="busy-form-item__label">commit 搜索</div><div class="busy-form-item__content">' +
          '<div class="busy-input"><input id="clrKw" placeholder="按 hash / 提交说明 / 作者检索" value="' + esc(st.kw) + '"></div>' +
        '</div></div>' +
        '<div class="tpl-section" id="clrCommitList">' +
          (!st.repo ? '<div class="u-sub">请先选择代码仓</div>'
            : shown.length ? shown.map(function (x) {
              var picked = st.picks.some(function (p) { return p.hash === x.c.hash; });
              var dis = x.own || x.deleted;
              return '<div class="chip-group" data-row="' + x.c.hash + '"><span class="u-mono' + (dis ? ' u-muted' : '') + '">' + x.c.hash + '</span>' +
                '<span class="' + (dis ? 'u-muted' : '') + '">' + esc(x.c.msg) + '</span>' +
                '<span class="u-sub">' + esc(x.c.author) + ' · ' + x.c.time + '</span>' + rowTags(x) +
                (picked ? '<span class="busy-tag busy-tag--small busy-tag--success">已选</span>' : '') +
                '<button class="busy-button is-link' + (dis ? ' is-disabled' : '') + '" type="button" data-pick="' + x.c.hash + '"' + (dis ? ' disabled aria-disabled="true" title="' + (x.own ? '不能选择本卡片的源 commit' : '该 commit 的卡片已删除，不可选择') + '"' : '') + '><span>选择</span></button></div>';
            }).join('') : '<div class="u-sub">没有匹配的 commit</div>') +
        '</div>' +
        '<div class="u-sub u-danger" id="clrPickErr"' + (st.pickErr ? '' : ' hidden') + '>' + st.pickErr + '</div>';
      var keepAlert = host.querySelector('#clrResolveAlert');
      var alertMsg = keepAlert && !keepAlert.hidden ? keepAlert.querySelector('.busy-alert__title').innerHTML : '';
      host.innerHTML = dialogShell('完成澄清', body, '确认完成');
      if (alertMsg) setAlert(host.querySelector('#clrResolveAlert'), alertMsg);
      bind();
      layoutOverlay(hostId, 720, 640);
    }
    function close() { host.hidden = true; }
    function tryClose() {
      if (st.picks.length) confirmBox({ title: '放弃提交', message: '已选的修订 commit 尚未提交，确认放弃？', onOk: close });
      else close();
    }
    function setPickErr(msg) { st.pickErr = msg || ''; var e = host.querySelector('#clrPickErr'); e.textContent = st.pickErr; e.hidden = !st.pickErr; }
    function bind() {
      bindClose(host, tryClose);
      var f = host.querySelector('[data-x="fold"]'), u = host.querySelector('[data-x="unfold"]');
      if (f) f.onclick = function () { st.expanded = false; render(); };
      if (u) u.onclick = function () { st.expanded = true; render(); };
      var rs = host.querySelector('[data-x="repo"]');
      if (rs) rs.onclick = function () { var dd = host.querySelector('#clrRepoDd'); dd.hidden = !dd.hidden; };
      host.querySelectorAll('[data-repo]').forEach(function (it) {
        it.onclick = function () { st.repo = it.getAttribute('data-repo'); st.pickErr = ''; render(); };
      });
      var bi = host.querySelector('#clrBranch');
      bi.addEventListener('input', function () { st.branch = bi.value; });
      host.querySelector('[data-x="branch"]').onclick = function () { var dd = host.querySelector('#clrBranchDd'); dd.hidden = !dd.hidden; };
      host.querySelectorAll('[data-branch]').forEach(function (it) {
        it.onclick = function () { st.branch = it.getAttribute('data-branch'); render(); };
      });
      var kw = host.querySelector('#clrKw');
      kw.addEventListener('input', function () {
        st.kw = kw.value.trim();
        var k = st.kw.toLowerCase();
        host.querySelectorAll('#clrCommitList [data-row]').forEach(function (row) { row.hidden = !!k && row.textContent.toLowerCase().indexOf(k) < 0; });
      });
      host.querySelectorAll('[data-pick]').forEach(function (b) {
        b.onclick = function () {
          var hash = b.getAttribute('data-pick');
          var x = candidatesOf(card, st.repo).filter(function (y) { return y.c.hash === hash; })[0];
          if (!x) return;
          if (x.own) { setPickErr('不能选择本卡片的源 commit'); return; }
          if (x.deleted) { setPickErr('该 commit 的卡片已删除，不可选择'); return; }
          if (st.picks.some(function (p) { return p.hash === hash; })) { setPickErr('该 commit 已选中'); return; }
          if (st.picks.length >= PICK_MAX) { setPickErr('最多选择 ' + PICK_MAX + ' 条修订 commit'); return; }
          st.picks.push(x.c); st.pickErr = ''; render();
        };
      });
      host.querySelectorAll('[data-unpick]').forEach(function (b) {
        b.onclick = function () {
          var h = b.getAttribute('data-unpick');
          st.picks = st.picks.filter(function (p) { return p.hash !== h; }); render();
        };
      });
      host.querySelector('[data-x="ok"]').onclick = function () {
        if (!st.picks.length) { setPickErr('请至少选择 1 条修订 commit'); return; }
        if (st.picks.length > PICK_MAX) { setPickErr('最多选择 ' + PICK_MAX + ' 条修订 commit'); return; }
        setPickErr('');
        var alertEl = host.querySelector('#clrResolveAlert');
        btnLoading(this, function () {
          /* 服务端校验（business-rule §11.3）：修订卡已删除、已是其他合并卡的子卡、开发完成或待澄清时拒绝 */
          var bad = null;
          st.picks.some(function (c) {
            if (!c.card) return false;
            var rc = lookup(c.card);
            if (!rc) return false;
            if (rc.status === 'DONE') bad = '修订卡 ' + c.card + '（commit ' + c.hash + '）已开发完成，不能并入合并卡；请先回退该卡片或更换修订 commit';
            else if (rc.status === 'CLARIFYING') bad = '修订卡 ' + c.card + '（commit ' + c.hash + '）正处于待澄清，不能并入合并卡；请更换修订 commit';
            else if (rc.child) bad = '修订卡 ' + c.card + '（commit ' + c.hash + '）已是合并卡 ' + rc.parent + ' 的子卡，不能并入；请更换修订 commit';
            return !!bad;
          });
          if (bad) { setAlert(alertEl, bad); return; } /* 保留已选，按钮恢复 */
          close();
          if (opts.onSuccess) opts.onSuccess(st.picks.slice(), st.repo);
        });
      };
    }
    host.innerHTML = ''; /* 新开弹窗不沿用上一次的失败提示 */
    render();
    openOverlay(hostId, tryClose);
  }

  /* M9 / G14 撤回澄清：撤回理由选填，最长 200 字；取消即放弃 */
  function openWithdraw(hostId, card, opts) {
    opts = opts || {};
    var host = ensureHost(hostId);
    var info = clarifyOf(card);
    var body =
      alertHtml('error', '', '', 'clrWithdrawAlert', true) +
      alertHtml('warning', '撤回后卡片恢复为「' + statusLabel(info.preStatus) + '」并回到待排期池，不合并任何卡片') +
      cardLine(card, 'CLARIFYING') +
      '<div class="u-sub">当前澄清：第 ' + (info.round || 1) + ' 次 · ' + esc(info.raiser) + ' 发起于 ' + info.raisedAt + ' · ' + esc(summary(info.question)) + '</div>' +
      '<div class="busy-form-item"><div class="busy-form-item__label">撤回理由</div>' +
      '<div class="busy-form-item__content">' +
        '<textarea class="busy-textarea" id="clrReason" rows="4" placeholder="选填：说明无需修订需求文档的原因，将通知发起人或负责人"></textarea>' +
        '<div class="u-sub"><span id="clrRCnt">0</span>/' + REASON_MAX + '</div>' +
        '<div class="busy-form-item__error" id="clrRErr" hidden>撤回理由最长 ' + REASON_MAX + ' 字</div>' +
      '</div></div>';
    host.innerHTML = dialogShell('撤回澄清', body, '确认撤回');
    var ta = host.querySelector('#clrReason'), err = host.querySelector('#clrRErr'), cnt = host.querySelector('#clrRCnt');
    function close() { host.hidden = true; }
    function check() {
      var n = Array.from(ta.value).length;
      cnt.textContent = n;
      cnt.classList.toggle('u-danger', n > REASON_MAX);
      err.hidden = n <= REASON_MAX;
      return n <= REASON_MAX;
    }
    openOverlay(hostId, close);
    ta.addEventListener('input', check);
    bindClose(host, close);
    host.querySelector('[data-x="ok"]').onclick = function () {
      if (!check()) { ta.focus(); return; }
      var reason = ta.value.trim();
      btnLoading(this, function () {
        close();
        if (opts.onSuccess) opts.onSuccess(reason);
      });
    };
  }

  /* Mock 默认状态与源 commit（普通卡源码来源唯一，合并卡候选取全部子卡源仓 / 源 commit）。 */
  D.scheduled.concat(D.pool.items, D.pool.page2, D.pool.page3, D.nonFeature.items, D.clarifying.items, [D.clarifiedMerge]).forEach(function (c) {
    if (!c.status) c.status = 'PENDING';
    if (!c.srcHash && !c.merged) c.srcHash = pseudoHash(c.no);
    if (c.merged) {
      var children = c.children || D.children;
      c.sourceCommits = children.map(function (s) { return { repo: s.repo || harnessOf(c), hash: s.srcHash || pseudoHash(s.no), no: s.no, title: s.title, author: s.submitter, time: s.created || s.mergedAt }; });
    }
  });
  D.nonFeature.items.forEach(function (c) { c.status = 'NON_FEATURE'; });

  return {
    renderNav: renderNav, toast: toast, openOverlay: openOverlay, closeOverlay: closeOverlay, isOverlayOpen: isOverlayOpen, layoutOverlay: layoutOverlay,
    onEsc: onEsc, setEscFallback: setEscFallback, confirmBox: confirmBox, btnLoading: btnLoading,
    alertHtml: alertHtml, setAlert: setAlert,
    projectOf: projectOf, projectTag: projectTag, statusMeta: statusMeta, statusCell: statusCell, statusLabel: statusLabel,
    mmdd: mmdd, daysBetween: daysBetween,
    esc: esc, multiline: multiline, textLen: textLen, summary: summary, waitInfo: waitInfo, agoInfo: agoInfo,
    rangeText: rangeText, harnessOf: harnessOf, nextCardNo: nextCardNo, findAnyCard: findAnyCard, clampLines: clampLines, saveClarification: saveClarification, openDetail: openDetail,
    lineageOf: lineageOf, liveNo: liveNo,
    clarify: { openRaise: openRaise, openResolve: openResolve, openWithdraw: openWithdraw }
  };
})();
