/* 功能排期原型共用演示数据：工作台与卡片详情页读写同一份虚构样例，按浏览器会话保存，关闭页签或「重置演示数据」后恢复初始样例 */
(function () {
  'use strict';
  const KEY = 'fs.demo.v1';
  const TODAY = '2026-10-17';
  const NOW = '2026-10-17 18:00';
  const ME = '张三';
  const USERS = ['张三', '李四', '王五', '赵六', '钱七', '孙八'];
  const LOG_LABEL = { CREATED: '创建卡片', EDITED: '编辑', SCHEDULED: '排期', UNSCHEDULED: '取消排期', RESCHEDULED: '调整排期', TAKEN: '领取开发', RELEASED: '释放开发', MARKED_DONE: '标记完成', REVERTED: '回退', DELETED: '删除' };

  const REPOS = [
    { repo: 'busyming-skills', name: '鸣鸣很忙 Skills', branch: 'master', source: true, branches: ['master', 'feature/schedule-board'] },
    { repo: 'busyming-skills-ydtj', name: '有点推荐 Skills', branch: 'master', source: true, branches: ['master'] },
    { repo: 'busyming-skills-common', name: '公共 Skills', branch: 'master', source: true, branches: ['master'] },
    { repo: 'busyming-snackingdom-web', name: '零食王国 Web 管理后台', branch: 'master', source: false, branches: ['master', 'release/2026-10', 'feature/feature-schedule'] },
    { repo: 'busyming-snackingdom-app', name: '零食王国 App', branch: 'master', source: false, branches: ['master', 'release/2026-10'] },
    { repo: 'busyming-snackingdom-devops', name: '零食王国 研发运维', branch: 'master', source: false, branches: ['master'] },
    { repo: 'ocss-mall-admin', name: 'OCSS 商城后台', branch: 'master', source: false, branches: ['master', 'dev'] },
  ];
  const COMMITS = {
    'busyming-skills': [
      { hash: '3f2a9c1d7e6b5a4f3e2d1c0b9a8f7e6d5c4b3a21', branch: 'master', msg: 'feat(storeorder): 要货单批量删除二次确认', author: '张三', at: '2026-10-17 16:40' },
      { hash: '8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c98', branch: 'master', msg: 'feat(purchase): 采购订单状态流水', author: '钱七', at: '2026-10-16 09:12' },
      { hash: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3', branch: 'feature/schedule-board', msg: 'docs(schedule): 排期看板交互说明补充', author: '孙八', at: '2026-10-16 21:05' },
    ],
    'busyming-skills-ydtj': [
      { hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', branch: 'master', msg: 'feat: OCSS 商城优惠券核销记录', author: '孙八', at: '2026-10-17 10:20' },
      { hash: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', branch: 'master', msg: 'fix(order): OCSS 订单导入提示文案', author: '外部协作者', at: '2026-10-15 15:48' },
    ],
    'busyming-skills-common': [
      { hash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f', branch: 'master', msg: 'chore(skills): skills 仓采集日志汇总', author: '张三', at: '2026-10-06 15:00' },
    ],
    'busyming-snackingdom-web': [
      { hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678', branch: 'master', msg: 'feat(schedule): 月历区间卡拖拽保持时长', author: '李四', at: '2026-10-16 20:12' },
      { hash: 'b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6', branch: 'master', msg: 'fix(schedule): 待排期池分页总数与筛选同口径', author: '王五', at: '2026-10-15 11:03' },
      { hash: 'c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8', branch: 'release/2026-10', msg: 'feat(storeorder): 要货单审核批量操作', author: '赵六', at: '2026-10-06 17:40' },
      { hash: 'e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0', branch: 'feature/feature-schedule', msg: 'feat(schedule): 合并卡解散按快照恢复', author: '李四', at: '2026-10-13 09:25' },
    ],
    'busyming-snackingdom-app': [
      { hash: 'f0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d', branch: 'master', msg: 'feat(scrm): 会员等级权益展示', author: '赵六', at: '2026-10-14 18:02' },
      { hash: '0f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6', branch: 'release/2026-10', msg: 'fix(ai-chat): 对话上下文裁剪边界', author: '赵六', at: '2026-10-12 10:16' },
    ],
    'busyming-snackingdom-devops': [
      { hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b', branch: 'master', msg: 'chore(devops): 采集任务汇总日志', author: '王五', at: '2026-10-10 14:30' },
    ],
    'ocss-mall-admin': [
      { hash: '7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c', branch: 'dev', msg: 'feat(order): 订单导入校验', author: '王五', at: '2026-10-08 16:45' },
      { hash: '6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b', branch: 'master', msg: 'fix(coupon): 核销记录分页', author: '王五', at: '2026-10-16 11:11' },
    ],
  };

  const pseudoHash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0').slice(0, 7); };
  const makeLog = (type, detail, by, at) => ({ type, label: LOG_LABEL[type], detail, by, at });
  const mk = (o) => Object.assign({ content: '', owner: ME, ownerUnmatched: false, status: 'PENDING', start: null, end: null, module: 'MISC', repo: 'busyming-skills', commit: '', nature: 'BIZ', contact: '', req: null, dev: null, takenAt: null, doneAt: null, done: [], merged: false, parent: null, children: [], snaps: {}, deleted: false, logs: [] }, o);

  function seed() {
    const pick = (repo, prefix) => { const x = COMMITS[repo].find((c) => c.hash.startsWith(prefix)); return { repo, hash: x.hash, short: x.hash.slice(0, 7), msg: x.msg, author: x.author, at: x.at }; };
    const cards = [
      mk({ no: 'FS-20260925-001', title: '门店档案营业时间校验', owner: '钱七', status: 'DONE', start: '2026-09-28', end: '2026-09-28', dev: '王五', takenAt: '2026-09-27 10:00', doneAt: '2026-09-28 18:20', contact: '营运·陈一', createdAt: '2026-09-25 09:30' }),
      mk({ no: 'FS-20261002-003', title: '要货单审核批量操作', owner: '钱七', status: 'DONE', start: '2026-10-06', end: '2026-10-06', module: 'storeorder', dev: '赵六', takenAt: '2026-10-05 09:10', doneAt: '2026-10-06 17:50', done: [pick('busyming-snackingdom-web', 'c9d0e1f')], contact: '门店运营·陈一', createdAt: '2026-10-02 10:12' }),
      mk({ no: 'FS-20261003-002', title: 'OCSS 订单导入校验', owner: '钱七', status: 'DONE', start: '2026-10-08', end: '2026-10-08', repo: 'busyming-skills-ydtj', dev: '王五', takenAt: '2026-10-07 14:00', doneAt: '2026-10-08 16:50', done: [pick('ocss-mall-admin', '7d6c5b4')], contact: '商城运营·吴二', createdAt: '2026-10-03 11:40' }),
      mk({ no: 'FS-20261005-001', title: '采购订单收货进度展示', owner: '孙八', status: 'DONE', start: '2026-10-09', end: '2026-10-09', module: 'purchase', dev: '王五', takenAt: '2026-10-08 09:30', doneAt: '2026-10-09 19:05', contact: '采购·吴二', createdAt: '2026-10-05 15:22' }),
      mk({ no: 'FS-20261008-002', title: '会员积分规则配置', owner: '钱七', status: 'IN_PROGRESS', start: '2026-10-13', end: '2026-10-15', module: 'scrm', dev: '李四', takenAt: '2026-10-13 09:05', contact: '会员中心·郑三', createdAt: '2026-10-08 10:18' }),
      mk({ no: 'FS-20261009-004', title: '门店报表下钻弹窗', owner: '孙八', start: '2026-10-15', end: '2026-10-15', module: 'report', contact: '营运·陈一', createdAt: '2026-10-09 16:44' }),
      mk({ no: 'FS-20261012-001', title: '月历区间卡拖拽保持时长', status: 'DONE', start: '2026-10-14', end: '2026-10-14', dev: '李四', takenAt: '2026-10-13 15:00', doneAt: '2026-10-14 20:30', done: [pick('busyming-snackingdom-web', 'a1b2c3d')], nature: 'TECH', createdAt: '2026-10-12 09:40' }),
      mk({ no: 'FS-20261013-002', title: '待排期池分页总数同口径', status: 'IN_PROGRESS', start: '2026-10-16', end: '2026-10-16', dev: '王五', takenAt: '2026-10-15 10:00', nature: 'TECH', createdAt: '2026-10-13 14:05' }),
      mk({ no: 'FS-20261014-001', title: 'AI 助手对话上下文裁剪', owner: '钱七', status: 'IN_PROGRESS', start: '2026-10-17', end: '2026-10-17', module: 'ai-chat', dev: '赵六', takenAt: '2026-10-16 11:20', contact: '客服·林五', createdAt: '2026-10-14 08:50' }),
      mk({ no: 'FS-20261014-003', title: '价签申请驳回原因必填', owner: '孙八', start: '2026-10-19', end: '2026-10-19', req: '周九', createdAt: '2026-10-14 17:32' }),
      mk({ no: 'FS-20261015-001', title: '要货单商品搜索联想', owner: '钱七', start: '2026-10-20', end: '2026-10-20', module: 'storeorder', contact: '门店运营·陈一', createdAt: '2026-10-15 09:03' }),
      mk({ no: 'FS-20261015-002', title: '要货单缺货提醒入口', owner: '孙八', start: '2026-10-20', end: '2026-10-20', module: 'storeorder', contact: '门店运营·陈一', createdAt: '2026-10-15 09:41' }),
      mk({ no: 'FS-20261015-004', title: '采购退货原因字典', owner: '钱七', status: 'IN_PROGRESS', start: '2026-10-20', end: '2026-10-20', module: 'purchase', dev: '李四', takenAt: '2026-10-16 14:10', contact: '采购·吴二', createdAt: '2026-10-15 13:27' }),
      mk({ no: 'FS-20261016-001', title: '会员等级权益展示', owner: '孙八', start: '2026-10-20', end: '2026-10-20', module: 'scrm', contact: '会员中心·郑三', createdAt: '2026-10-16 08:55' }),
      mk({ no: 'FS-20261016-002', title: '报表时效提示条', start: '2026-10-20', end: '2026-10-20', module: 'report', contact: '营运·陈一', createdAt: '2026-10-16 09:30' }),
      mk({ no: 'FS-20261016-005', title: '门店要货单打印模板', owner: '钱七', start: '2026-10-21', end: '2026-10-23', module: 'storeorder', contact: '门店运营·陈一', createdAt: '2026-10-16 11:02' }),
      mk({ no: 'FS-20261016-009', title: '要货单审核流优化', status: 'IN_PROGRESS', start: '2026-10-22', end: '2026-10-22', module: 'storeorder', repo: '_merge', commit: 'MERGE:FS-20261016-009', merged: true, dev: '李四', takenAt: '2026-10-17 09:20', contact: '门店运营·陈一', createdAt: '2026-10-16 19:40',
        children: ['FS-20261010-005', 'FS-20261011-002'],
        snaps: { 'FS-20261010-005': { status: 'PENDING', start: '2026-10-14', end: '2026-10-14', dev: null, takenAt: null, at: '2026-10-16 19:40' }, 'FS-20261011-002': { status: 'PENDING', start: '2026-10-24', end: '2026-10-24', dev: null, takenAt: null, at: '2026-10-16 19:40' } },
        content: '合并自 2 张子卡：\n- FS-20261010-005 要货单审核意见必填\n- FS-20261011-002 要货单审核记录展示' }),
      mk({ no: 'FS-20261010-005', title: '要货单审核意见必填', owner: '钱七', status: 'IN_PROGRESS', start: '2026-10-22', end: '2026-10-22', module: 'storeorder', parent: 'FS-20261016-009', dev: '李四', takenAt: '2026-10-17 09:20', createdAt: '2026-10-10 10:10' }),
      mk({ no: 'FS-20261011-002', title: '要货单审核记录展示', owner: '孙八', status: 'IN_PROGRESS', start: '2026-10-22', end: '2026-10-22', module: 'storeorder', parent: 'FS-20261016-009', dev: '李四', takenAt: '2026-10-17 09:20', createdAt: '2026-10-11 15:36' }),
      mk({ no: 'FS-20261017-001', title: 'OCSS 商城优惠券核销记录', owner: '孙八', start: '2026-10-26', end: '2026-10-26', repo: 'busyming-skills-ydtj', commit: '1a2b3c4', contact: '商城运营·吴二', createdAt: '2026-10-17 10:20' }),
      mk({ no: 'FS-20261017-002', title: '公共组件库按钮规范', owner: '孙八', start: '2026-10-28', end: '2026-10-28', repo: 'busyming-skills-common', nature: 'TECH', createdAt: '2026-10-17 11:05' }),
      mk({ no: 'FS-20261016-011', title: '月度报表口径复核', owner: '钱七', start: '2026-11-04', end: '2026-11-04', module: 'report', contact: '营运·陈一', createdAt: '2026-10-16 17:15' }),
      mk({ no: 'FS-20261017-003', title: '要货单批量删除二次确认', module: 'storeorder', commit: '3f2a9c1', createdAt: '2026-10-17 16:40' }),
      mk({ no: 'FS-20261016-006', title: '采购订单状态流水', owner: '钱七', module: 'purchase', commit: '8c7b6a5', createdAt: '2026-10-16 09:12' }),
      mk({ no: 'FS-20261015-006', title: '会员标签批量打标', owner: '孙八', module: 'scrm', contact: '会员中心·郑三', createdAt: '2026-10-15 14:20' }),
      mk({ no: 'FS-20261015-007', title: 'OCSS 订单导入提示文案', owner: '外部协作者', ownerUnmatched: true, repo: 'busyming-skills-ydtj', module: 'order', commit: '2b3c4d5', createdAt: '2026-10-15 15:48' }),
      mk({ no: 'FS-20261012-004', title: '报表口径说明折叠', owner: '孙八', status: 'IN_PROGRESS', module: 'report', dev: '王五', takenAt: '2026-10-14 09:00', contact: '营运·陈一', createdAt: '2026-10-12 10:05' }),
      mk({ no: 'FS-20261008-006', title: 'AI 助手提示词模板', owner: '钱七', module: 'ai-chat', req: '周九', createdAt: '2026-10-08 11:30' }),
      mk({ no: 'FS-20261006-002', title: 'skills 仓采集日志汇总', repo: 'busyming-skills-common', commit: '5e6f7a8', nature: 'TECH', createdAt: '2026-10-06 15:00' }),
      mk({ no: 'FS-20260920-003', title: '门店档案字段补录', owner: '孙八', createdAt: '2026-09-20 09:00' }),
      mk({ no: 'FS-20260918-001', title: '要货单默认仓库', owner: '钱七', module: 'storeorder', contact: '门店运营·陈一', createdAt: '2026-09-18 16:25' }),
      mk({ no: 'FS-20261016-028', title: '入库契约两处落地登记', owner: '孙八', status: 'NON_FEATURE', module: 'reference', createdAt: '2026-10-16 15:25' }),
      mk({ no: 'FS-20261016-029', title: '出库契约三处落地登记', owner: '孙八', status: 'NON_FEATURE', module: 'reference', createdAt: '2026-10-16 15:25' }),
      mk({ no: 'FS-20261011-007', title: 'changelog 补录', status: 'NON_FEATURE', createdAt: '2026-10-11 18:02' }),
    ];
    cards.forEach((c) => {
      if (!c.commit) c.commit = pseudoHash(c.no);
      if (!c.content) c.content = 'feat(' + (c.module === 'MISC' ? 'misc' : c.module) + '): ' + c.title;
      const L = [];
      if (c.merged) L.push(makeLog('CREATED', '合并自 ' + c.children.length + ' 张：' + c.children.join(', '), ME, c.createdAt));
      else L.push(makeLog('CREATED', 'commit 采集出卡', '系统', c.createdAt));
      if (c.start) L.push(makeLog('SCHEDULED', '排期：' + c.start + (c.end && c.end !== c.start ? ' ~ ' + c.end : ''), ME, c.createdAt.slice(0, 10) + ' 20:00'));
      if (c.dev && c.takenAt) L.push(makeLog('TAKEN', '领取开发：' + c.dev, c.dev, c.takenAt));
      if (c.status === 'DONE') L.push(makeLog('MARKED_DONE', c.done.length ? '标记完成，关联 ' + c.done.length + ' 个 commit' : '标记完成（未关联完成 commit）', c.dev || ME, c.doneAt));
      if (c.status === 'NON_FEATURE') L.push(makeLog('EDITED', '从『待开发』移入非需求改动', ME, c.createdAt.slice(0, 10) + ' 19:00'));
      c.logs = L.sort((a, b) => (a.at < b.at ? 1 : -1));
    });
    return {
      cards,
      projects: [
        { id: 'p1', name: '零食王国', harness: 'busyming-skills', repos: ['busyming-skills', 'busyming-snackingdom-web', 'busyming-snackingdom-app'], enabled: true, note: '门店 ERP 主线' },
        { id: 'p2', name: 'OCSS 商城', harness: 'busyming-skills-ydtj', repos: ['busyming-skills-ydtj', 'ocss-mall-admin'], enabled: true, note: '' },
        { id: 'p3', name: '研发运维工具', harness: 'busyming-skills-devops', repos: ['busyming-snackingdom-devops', 'busyming-legacy-tools'], enabled: false, note: '已并入零食王国' },
      ],
      release: ['2026-10-15', '2026-10-29'],
    };
  }

  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { return; } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { return; } },
  };
  function unstash(k) {
    const raw = session.get(k);
    session.del(k);
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function load() {
    const raw = session.get(KEY);
    if (raw) { try { return JSON.parse(raw); } catch (e) { session.del(KEY); } }
    return seed();
  }

  window.FS_DEMO = {
    TODAY, NOW, ME, USERS, LOG_LABEL, REPOS, COMMITS, makeLog, mk, load,
    save: (db) => session.set(KEY, JSON.stringify(db)),
    reset: () => session.del(KEY),
    stash: (k, v) => session.set(k, JSON.stringify(v)),
    unstash,
  };
})();
