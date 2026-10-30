(function () {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const key = 'mmhm-pm-people-domains-prototype-v1';
  const timestamp = '2026-10-29 09:30';
  const roles = ['研发', '产品', '架构', '设计'];
  const users = [
    { id: 'u1', name: '王晨', code: 'DEMO-001', department: '数字化中心', active: true },
    { id: 'u2', name: '林宁', code: 'DEMO-002', department: '数字化中心', active: true },
    { id: 'u3', name: '周逸', code: 'DEMO-003', department: '数字化中心', active: true },
    { id: 'u4', name: '顾然', code: 'DEMO-004', department: '创新业务部', active: true },
    { id: 'u5', name: '赵禾', code: 'DEMO-005', department: '数字化中心', active: true },
    { id: 'u6', name: '陈悦', code: 'DEMO-006', department: '创新业务部', active: true },
    { id: 'u7', name: '王晨', code: 'DEMO-007', department: '创新业务部', active: true },
    { id: 'u8', name: '许言', code: 'DEMO-008', department: '数字化中心', active: false }
  ];
  function seed() {
    return {
      revision: 1,
      users: users,
      members: [
        { id: 'm1', user: 'u1', display: '王晨', roles: ['架构'], state: '启用', identities: { aliyun: 'demo-cloud-1', qoder: 'demo-qoder-1', wecom: 'demo-wecom-1' }, scopes: ['d1', 'p1'], scopeRoles: { d1: '架构', p1: '架构' }, updated: timestamp, logs: [] },
        { id: 'm2', user: 'u2', display: '林宁', roles: ['产品'], state: '启用', identities: { aliyun: 'demo-cloud-2', qoder: 'demo-qoder-2', wecom: 'demo-wecom-2' }, scopes: ['p3', 'p4'], scopeRoles: { p3: '产品', p4: '产品' }, updated: timestamp, logs: [] },
        { id: 'm3', user: 'u3', display: '周逸', roles: ['研发'], state: '启用', identities: { aliyun: 'demo-cloud-3', qoder: 'demo-qoder-3', wecom: 'demo-wecom-3' }, scopes: ['p3', 'p7'], scopeRoles: { p3: '研发', p7: '研发' }, updated: timestamp, logs: [] },
        { id: 'm4', user: 'u4', display: '顾然', roles: ['研发', '设计'], state: '启用', identities: { aliyun: 'demo-cloud-4', qoder: 'demo-qoder-4', wecom: 'demo-wecom-4' }, scopes: ['d2', 'p2'], scopeRoles: { d2: '研发', p2: '设计' }, updated: timestamp, logs: [] },
        { id: 'm5', user: 'u5', display: '赵禾', roles: ['产品'], state: '禁用', identities: { aliyun: 'demo-cloud-5', qoder: '', wecom: 'demo-wecom-5' }, scopes: ['p5'], scopeRoles: { p5: '产品' }, updated: timestamp, logs: [] },
        { id: 'm6', user: 'u6', display: '陈悦', roles: ['设计'], state: '已删除', identities: { aliyun: '', qoder: '', wecom: '' }, scopes: [], scopeRoles: {}, updated: timestamp, logs: [] }
      ],
      domains: [
        { id: 'd1', name: '公共', repo: 'busyming-skills-common', owner: 'm1', special: '架构', state: '启用', source: '已存在', branch: 'master', updated: timestamp, note: '集团公共能力', logs: [] },
        { id: 'd2', name: '设计', repo: 'busyming-skills-design', owner: 'm4', special: '研发或设计', state: '启用', source: '已存在', branch: 'master', updated: timestamp, note: '双端设计系统', logs: [] },
        { id: 'd3', name: '产研', repo: 'busyming-skills-devops', owner: 'm1', state: '启用', source: '已存在', branch: 'master', updated: timestamp, note: '产研流程与报告', logs: [] },
        { id: 'd4', name: '营运', repo: 'busyming-skills-operations', owner: 'm3', state: '启用', source: '已存在', branch: 'master', updated: timestamp, note: '', logs: [] },
        { id: 'd5', name: '门店', repo: 'busyming-skills-store', owner: '', state: '停用', source: '未核验', branch: 'master', updated: timestamp, note: '保留上一份结构，等待完整读取', logs: [] }
      ],
      projects: [
        { id: 'p1', domain: 'd1', name: 'api', owners: [{ member: 'm1', role: '架构' }], state: '启用', source: '已存在', updated: timestamp, mappings: [], note: '', logs: [] },
        { id: 'p2', domain: 'd2', name: 'components', owners: [{ member: 'm4', role: '设计' }], state: '启用', source: '已存在', updated: timestamp, mappings: [], note: '', logs: [] },
        { id: 'p3', domain: 'd3', name: '研发管理', owners: [{ member: 'm2', role: '产品' }, { member: 'm3', role: '研发' }], state: '启用', source: '已存在', updated: timestamp, mappings: [{ domain: 'd3', path: '研发管理' }], note: '多负责人按各自职责协同', logs: [] },
        { id: 'p4', domain: 'd3', name: '研发报告', owners: [{ member: 'm2', role: '产品' }], state: '启用', source: '已存在', updated: timestamp, mappings: [{ domain: 'd3', path: '研发报告' }], note: '', logs: [] },
        { id: 'p5', domain: 'd4', name: '营运', owners: [{ member: 'm3', role: '研发' }], state: '启用', source: '已存在', updated: timestamp, mappings: [], note: '', logs: [] },
        { id: 'p6', domain: 'd5', name: '库存', owners: [], state: '停用', source: '未核验', updated: timestamp, mappings: [], note: '', logs: [] },
        { id: 'p7', domain: 'd3', name: '需求管理', owners: [{ member: 'm3', role: '研发' }], state: '启用', source: '已存在', updated: timestamp, mappings: [], note: '', logs: [] }
      ],
      grants: [
        { member: 'm2', domain: 'd3', target: '普通分支读写', actual: '普通分支读写', source: '直接成员', state: '已达目标', detail: '直接成员已核验；无保护分支或发布授权', updated: timestamp },
        { member: 'm5', domain: 'd4', target: '全部访问关闭', actual: '只读', source: '代码组继承', state: '待管理员处理', detail: '直接成员已移除，但仍有代码组继承访问，关闭未完成', updated: timestamp }
      ],
      work: [{ member: 'm3', title: 'FS-DEMO-007 · 开发中卡片', state: '待交接' }],
      sync: { state: '部分失败', updated: timestamp, rows: [{ domain: 'd1', result: '全部成功' }, { domain: 'd2', result: '全部成功' }, { domain: 'd3', result: '全部成功' }, { domain: 'd4', result: '全部成功' }, { domain: 'd5', result: '失败', reason: '目录读取未完成，上一有效结构保留' }] }
    };
  }
  let data;
  try { data = JSON.parse(localStorage.getItem(key)); } catch (_) { data = null; }
  if (!data || data.revision !== 1) data = seed();
  data.members.forEach(m => {
    if (!m.identities) {
      m.identities = { aliyun: m.cloud || '', qoder: '', wecom: '' };
      delete m.cloud;
    }
    if (!m.scopeRoles) m.scopeRoles = Object.fromEntries(m.scopes.map(id => [id, m.roles[0] || '']));
  });
  function save() { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch (_) { return false; } }
  const member = id => data.members.find(x => x.id === id);
  const domain = id => data.domains.find(x => x.id === id);
  const project = id => data.projects.find(x => x.id === id);
  const user = m => data.users.find(x => x.id === m.user);
  const valid = m => m && m.state === '启用' && user(m)?.active;
  const effectiveDomain = d => d && d.state === '启用' && d.source === '已存在' && valid(member(d.owner));
  const effectiveProject = p => p && p.state === '启用' && p.source === '已存在' && effectiveDomain(domain(p.domain)) && p.owners.some(o => valid(member(o.member)));
  function scopes(m) {
    return [...new Set(m.scopes.concat(data.domains.filter(d => d.owner === m.id).map(d => d.id), data.projects.filter(p => p.owners.some(o => o.member === m.id)).map(p => p.id)))];
  }
  function targetDomains(m) {
    if (!valid(m) || !m.roles.includes('产品')) return [];
    return [...new Set(scopes(m).map(id => {
      const p = project(id);
      return p ? (effectiveProject(p) ? p.domain : null) : (effectiveDomain(domain(id)) ? id : null);
    }).filter(Boolean))];
  }
  function replan(m) {
    const targets = targetDomains(m);
    const all = [...new Set(targets.concat(data.grants.filter(g => g.member === m.id).map(g => g.domain)))];
    all.forEach(id => {
      let g = data.grants.find(x => x.member === m.id && x.domain === id);
      const target = targets.includes(id) ? '普通分支读写' : '全部访问关闭';
      if (!g) { g = { member: m.id, domain: id, actual: '未核验', source: '未核验', state: '待同步', updated: '未取得' }; data.grants.push(g); }
      if (g.target !== target) { g.state = '待同步'; g.detail = '资料已保存，实际权限仍待核验'; }
      g.target = target;
    });
  }
  const responsibilities = m => data.domains.filter(d => d.owner === m.id).map(d => ({ name: d.name + '域唯一负责人', url: domainUrl(d.id) }))
    .concat(data.projects.filter(p => p.owners.some(o => o.member === m.id)).map(p => ({ name: domain(p.domain).name + ' / ' + p.name + '项目负责人', url: projectUrl(p.id) })));
  function log(object, text) { object.updated = now(); object.logs.unshift({ text, time: object.updated, operator: '原型管理员' }); }
  const now = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0,16);
  function memberUrl(id, tab) { return new URL('member-detail.html?id=' + encodeURIComponent(id) + (tab ? '&tab=' + encodeURIComponent(tab) : ''), base).href; }
  function domainUrl(id, edit) { return new URL('../../../域及项目管理/assets/web/domain-detail.html?id=' + encodeURIComponent(id) + (edit ? '&edit=1' : ''), base).href; }
  function projectUrl(id, edit) { const p = project(id); return new URL('../../../域及项目管理/assets/web/project-detail.html?id=' + encodeURIComponent(id) + '&domain=' + encodeURIComponent(p?.domain || '') + (edit ? '&edit=1' : ''), base).href; }
  window.PMData = { data, users, roles, key, save, seed, base, member, domain, project, user, valid, effectiveDomain, effectiveProject, scopes, targetDomains, replan, responsibilities, log, now, memberUrl, domainUrl, projectUrl };
})();
