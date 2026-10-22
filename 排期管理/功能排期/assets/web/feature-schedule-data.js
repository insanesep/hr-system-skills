/**
 * 功能排期 · 会话内演示数据（Mock，可重置：刷新页面即恢复）
 * 真源：references/data.md（实体字段）/ field-rules.md（取值）/ business-rule.md §9（项目与配色）
 * 两页共用：feature-schedule.html（研发排期工作台）/ feature-schedule-detail.html（卡片详情页）
 * 演示基准日 today = 2026-10-21（周三）；当前登录人演示为「陈默」（PM）。
 * 项目标识色说明：business-rule §9 调色板为 蓝/青/紫/金/品红/橙红 六色；设计仓 PC Token 暂无
 * 青/紫/品红独立色值，原型以 busy-tag 语义色近似映射（cls 字段），色名以 colorName 如实标注。
 */
window.FS_DATA = {
  today: '2026-10-21',
  month: '2026-10',
  user: '陈默',

  /* 项目台账（本模块为项目映射唯一真源；标识色按创建顺序循环分配） */
  projects: [
    { key: 'main',   name: '鸣鸣很忙主站', colorName: '蓝',   cls: '',                     harness: 'harness-main',   repos: ['busyming-web', 'busyming-server'], status: '启用' },
    { key: 'supply', name: '供应链中台',   colorName: '青',   cls: 'busy-tag--success',    harness: 'harness-supply', repos: ['supply-api'],                      status: '启用' },
    { key: 'pos',    name: '门店 POS',     colorName: '紫',   cls: 'busy-tag--danger',     harness: 'harness-pos',    repos: ['pos-client'],                      status: '启用' },
    { key: 'member', name: '会员中心',     colorName: '金',   cls: 'busy-tag--warning',    harness: 'harness-member', repos: ['member-service'],                  status: '启用' },
    { key: 'fran',   name: '加盟商服务',   colorName: '橙红', cls: 'busy-tag--danger is-plain', harness: 'harness-fran', repos: [],                              status: '停用' }
  ],
  unassigned: { key: 'none', name: '未归属项目', colorName: '灰', cls: 'busy-tag--info' },

  /* 待排期池：服务端分页，total 为当前筛选条件下池内全量；排序=创建时间倒序，同刻按编号倒序 */
  pool: {
    total: 23, pageSize: 10, page: 1,
    items: [
      { no: 'FS-20261020-001', title: '要货单增加批量导入入口', module: 'STORE',  project: 'main',   submitter: '王倩', created: '2026-10-20 09:12', ago: '1 天前' },
      { no: 'FS-20261020-002', title: '修复门店库存快照重复写入', module: 'STOCK', project: 'supply', submitter: '李强', created: '2026-10-20 08:40', ago: '1 天前' },
      { no: 'FS-20261019-003', title: '会员积分规则文案调整', module: 'MEMBER',   project: 'member', submitter: '张敏', created: '2026-10-19 17:05', ago: '2 天前' },
      { no: 'FS-20261019-006', title: '要货单交互走查修复打包', module: 'STORE',  project: 'main',   submitter: '陈默', created: '2026-10-19 18:02', ago: '2 天前', merged: true, childCount: 3 },
      { no: 'FS-20261019-004', title: 'POS 离线模式日志补录', module: 'POS',      project: 'pos',    submitter: '陈刚', created: '2026-10-19 15:48', ago: '2 天前' },
      { no: 'FS-20261017-001', title: '采购订单导出增加供应商编码', module: 'ORDER', project: 'supply', submitter: '刘洋', created: '2026-10-17 11:22', ago: '4 天前' },
      { no: 'FS-20261016-001', title: '要货审批流节点文案优化', module: 'STORE',  project: 'main',   submitter: '赵敏', created: '2026-10-16 14:50', ago: '5 天前' },
      { no: 'FS-20261015-002', title: '修复积分过期任务偶发漏跑', module: 'MEMBER', project: 'member', submitter: '孙浩', created: '2026-10-15 16:40', ago: '6 天前' },
      { no: 'FS-20261015-003', title: '门店档案新增批量停用', module: 'STORE',    project: 'main',   submitter: '李强', created: '2026-10-15 10:12', ago: '6 天前' },
      { no: 'FS-20261013-001', title: '采购对账报表字段补充', module: 'ORDER',    project: 'supply', submitter: '周洁', created: '2026-10-13 13:26', ago: '8 天前', stale: true }
    ],
    /* 第 2/3 页演示数据（分页切换时渲染） */
    page2: [
      { no: 'FS-20261012-001', title: '更新部署文档与 changelog', module: 'MISC', project: 'none',   submitter: '王倩', created: '2026-10-12 09:31', ago: '9 天前', stale: true },
      { no: 'FS-20261012-002', title: '要货单打印模板字段对齐', module: 'STORE',  project: 'main',   submitter: '张敏', created: '2026-10-12 08:55', ago: '9 天前', stale: true },
      { no: 'FS-20261011-001', title: '库存预警阈值配置化', module: 'STOCK',      project: 'supply', submitter: '李强', created: '2026-10-11 16:20', ago: '10 天前', stale: true },
      { no: 'FS-20261011-002', title: '会员开卡礼发放补偿', module: 'MEMBER',     project: 'member', submitter: '孙浩', created: '2026-10-11 15:02', ago: '10 天前', stale: true },
      { no: 'FS-20261010-002', title: 'POS 会员卡识别提速', module: 'POS',        project: 'pos',    submitter: '吴迪', created: '2026-10-10 14:47', ago: '11 天前', stale: true },
      { no: 'FS-20261010-003', title: '要货建议算法参数调优', module: 'STORE',    project: 'main',   submitter: '陈默', created: '2026-10-10 11:36', ago: '11 天前', stale: true },
      { no: 'FS-20261009-003', title: '采购合同附件预览修复', module: 'ORDER',    project: 'supply', submitter: '周洁', created: '2026-10-09 17:18', ago: '12 天前', stale: true },
      { no: 'FS-20261009-004', title: '门店档案导出脱敏', module: 'STORE',        project: 'main',   submitter: '赵敏', created: '2026-10-09 10:05', ago: '12 天前', stale: true },
      { no: 'FS-20261008-001', title: '积分商城 SKU 排序修复', module: 'MEMBER',  project: 'member', submitter: '张敏', created: '2026-10-08 15:44', ago: '13 天前', stale: true },
      { no: 'FS-20261008-002', title: 'POS 字体包瘦身', module: 'POS',            project: 'pos',    submitter: '陈刚', created: '2026-10-08 09:26', ago: '13 天前', stale: true }
    ],
    page3: [
      { no: 'FS-20261007-001', title: '要货单历史数据归档脚本', module: 'STORE',  project: 'main',   submitter: '刘洋', created: '2026-10-07 18:02', ago: '14 天前', stale: true },
      { no: 'FS-20261007-002', title: '供应商评级口径对齐', module: 'ORDER',      project: 'supply', submitter: '王倩', created: '2026-10-07 14:31', ago: '14 天前', stale: true },
      { no: 'FS-20261006-001', title: '会员标签同步重试', module: 'MEMBER',       project: 'member', submitter: '孙浩', created: '2026-10-06 11:20', ago: '15 天前', stale: true }
    ]
  },

  /* 本月已排期卡片（status: PENDING/IN_PROGRESS/DONE；延期由 today 与截止日计算，不落库） */
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
    { no: 'FS-20261021-001', title: '门店要货看板刷新优化', module: 'STORE', project: 'main',  start: '2026-10-30', end: '2026-10-30', status: 'PENDING',   submitter: '王倩', nature: '技术支持', bizContact: '' }
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

  /* 云效研发仓列表（新建卡片选仓、项目配置点选、完成 commit 候选仓的真源；occupied=被启用中项目占用） */
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

  /* 筛选项全集 */
  filterOptions: {
    status: ['待开发', '开发中', '开发完成', '延期'],
    owners: ['陈默', '王倩', '李强', '张敏', '陈刚', '刘洋', '周洁', '孙浩', '赵敏', '吴迪'],
    repos: ['harness-main', 'harness-supply', 'harness-pos', 'harness-member'],
    projects: ['鸣鸣很忙主站', '供应链中台', '门店 POS', '会员中心', '未归属项目'],
    modules: ['STORE', 'ORDER', 'STOCK', 'MEMBER', 'POS', 'MISC']
  },

  /* 本月进度（口径见 business-rule §4：延期单列；待排期取池内全量） */
  stats: { pool: 23, pending: 8, doing: 4, done: 2, delayed: 2 }
};

/* ========== 两页共用的原型壳辅助（导航「原型页面」切换、toast、浮层） ========== */
window.FS_PROTO = (function () {
  var escStack = [];

  function renderNav(opts) {
    /* opts: { active: 'schedule'|'detail', switchers: [{label,currentKey,options:[{key,label}],onPick}] } */
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

    /* 演示切换器（详情页：演示卡片 / 整页状态）：ghost 按钮 + 居中 busy-dialog 选项菜单 */
    (opts.switchers || []).forEach(function (sw) {
      var holder = document.createElement('span');
      holder.innerHTML = '<button class="busy-button busy-button--small busy-button--ghost" type="button"><span>' + sw.label + '：' + sw.current + ' ▾</span></button>';
      var btn = holder.firstChild;
      btn.addEventListener('click', function () {
        var host = document.getElementById('fsSwitcher');
        if (!host) {
          host = document.createElement('div');
          host.id = 'fsSwitcher';
          host.className = 'busy-overlay-demo';
          document.body.insertBefore(host, document.body.firstChild);
        }
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
        host.hidden = false;
        window.scrollTo(0, 0);
        escStack.push(function () { host.hidden = true; });
        host.querySelector('[data-x="close"]').onclick = function () { host.hidden = true; };
        host.querySelectorAll('.busy-select-dropdown__item').forEach(function (item) {
          item.onclick = function () { host.hidden = true; sw.onPick(item.getAttribute('data-key')); };
        });
      });
      nav.insertBefore(holder, spacer);
    });
  }

  /* 顶部全局提示（busy-message 静态类；G12/M6 全局提示位） */
  function toast(msg, type) {
    var host = document.getElementById('fsToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fsToastHost';
      host.className = 'tpl-toolbar';
      document.body.insertBefore(host, document.body.firstChild);
    }
    host.innerHTML = '<span class="busy-message busy-message--' + (type || 'success') + '">' + msg + '</span>';
    clearTimeout(host._t);
    host._t = setTimeout(function () { host.innerHTML = ''; }, 2600);
  }

  /* 浮层托管：overlay host 位于 body 起始处（busy-overlay-demo 提供遮罩视觉），Esc 分层关闭 */
  function openOverlay(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    escStack.push(function () { el.hidden = true; });
    window.scrollTo(0, 0);
  }
  function closeOverlay(id) {
    var el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  function onEsc(fn) { escStack.push(fn); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && escStack.length) {
      var f = escStack.pop();
      try { f(); } catch (err) {}
    }
  });

  /* 二次确认（BusyMessageBox 语义；原型以 busy-dialog 静态结构呈现于 overlay host） */
  function confirmBox(opts) {
    var host = document.getElementById('fsConfirm');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fsConfirm';
      host.className = 'busy-overlay-demo';
      document.body.insertBefore(host, document.body.firstChild);
    }
    host.innerHTML =
      '<div class="busy-dialog">' +
        '<div class="busy-dialog__header"><span class="busy-dialog__title">' + (opts.title || '操作确认') + '</span></div>' +
        '<div class="busy-dialog__body">' + opts.message + '</div>' +
        '<div class="busy-dialog__footer">' +
          '<button class="busy-button" type="button" data-x="cancel"><span>取 消</span></button>' +
          '<button class="busy-button busy-button--primary" type="button" data-x="ok"><span>确 定</span></button>' +
        '</div>' +
      '</div>';
    host.hidden = false;
    window.scrollTo(0, 0);
    escStack.push(function () { host.hidden = true; });
    host.querySelector('[data-x="cancel"]').onclick = function () { host.hidden = true; if (opts.onCancel) opts.onCancel(); };
    host.querySelector('[data-x="ok"]').onclick = function () {
      var btn = this;
      btn.innerHTML = '<span class="busy-button__loading"></span><span>' + (opts.okText || '确 定') + '</span>';
      setTimeout(function () { host.hidden = true; if (opts.onOk) opts.onOk(); }, 500);
    };
  }

  /* 按钮 loading 演示：0.6s 后恢复并回调成功 */
  function btnLoading(btn, done) {
    if (btn.dataset.loading) return;
    btn.dataset.loading = '1';
    var old = btn.innerHTML;
    btn.innerHTML = '<span class="busy-button__loading"></span>' + old;
    setTimeout(function () { btn.innerHTML = old; delete btn.dataset.loading; if (done) done(); }, 600);
  }

  function projectOf(key) {
    if (key === 'none') return FS_DATA.unassigned;
    return FS_DATA.projects.filter(function (p) { return p.key === key; })[0] || FS_DATA.unassigned;
  }
  /* 项目标签：项目名前置标签图标（◆），颜色取项目标识色（近似映射见文件头注释） */
  function projectTag(key, small) {
    var p = projectOf(key);
    return '<span class="busy-tag ' + p.cls + (small ? ' busy-tag--small' : '') + '" title="标识色：' + p.colorName + '">◆ ' + p.name + '</span>';
  }
  function statusMeta(card) {
    var delayed = (card.status === 'PENDING' || card.status === 'IN_PROGRESS') && card.end && card.end < FS_DATA.today;
    if (delayed) return { label: '延期', cls: 'is-warning' };
    if (card.status === 'DONE') return { label: '开发完成', cls: 'is-success' };
    if (card.status === 'IN_PROGRESS') return { label: '开发中', cls: 'is-processing' };
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

  return {
    renderNav: renderNav, toast: toast, openOverlay: openOverlay, closeOverlay: closeOverlay,
    onEsc: onEsc, confirmBox: confirmBox, btnLoading: btnLoading,
    projectOf: projectOf, projectTag: projectTag, statusMeta: statusMeta, statusCell: statusCell,
    mmdd: mmdd, daysBetween: daysBetween
  };
})();
