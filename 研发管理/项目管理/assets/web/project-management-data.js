/* 独立于 DOM 的浏览器 Mock；项目与报告原型共用，不连接生产服务。 */
(function (root) {
  'use strict';
  var KEY = 'devhub-project-management-prototype-v1';
  var DISABLE_KEY = 'devhub-report-project-disable-events-prototype-v1';
  var memory, disabledMemory = [];
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function initial() {
    return {
      projects: [
        { id: 1, name: '产研平台', harnessRepo: 'Codeup:101', codeRepos: ['Codeup:102', 'git:1'], status: 'ENABLED', color: 'blue', remark: '排期与报告共用的项目范围', environment: { deployment: '集成测试', revision: 2, updatedAt: '2026-11-02 10:30', content: '本环境入口：产研平台集成测试入口。\n应用：排期、研发报告。\n测试库定位：产研集成测试库，使用隔离的演练数据。\n可复用数据：样例需求和示例项目。\n数据规则：演练数据不回流生产。\n外部依赖：代码托管测试目录。\n人工配合：报告生成前请值班同学核验来源。' } },
        { id: 2, name: '门店系统', harnessRepo: 'Codeup:201', codeRepos: ['Codeup:202'], status: 'ENABLED', color: 'cyan', remark: '门店业务演练项目', environment: { deployment: '集成测试', revision: 1, updatedAt: '2026-11-02 09:00', content: '本环境入口：门店系统集成测试入口。\n应用：门店管理。\n测试库定位：独立门店演练库。\n可复用数据：虚构门店和测试商品。\n数据规则：仅用于业务验收。\n外部依赖：模拟商品目录。\n人工配合：验收前同步测试数据范围。' } },
        { id: 3, name: '仓配演练', harnessRepo: 'git:2', codeRepos: [], status: 'DISABLED', color: 'purple', remark: '停用保留映射与原成员关系', environment: { deployment: '集成测试', revision: 0, updatedAt: '', content: '' } }
      ],
      repos: [
        { id: 'Codeup:101', name: 'platform-harness', url: 'https://codeup.example.test/team/platform-harness.git', username: '', defaultBranch: 'main', status: 'ENABLED', passwordConfigured: false, source: 'CODEUP' },
        { id: 'Codeup:102', name: 'platform-service', url: 'https://codeup.example.test/team/platform-service.git', username: '', defaultBranch: 'main', status: 'ENABLED', passwordConfigured: false, source: 'CODEUP' },
        { id: 'Codeup:201', name: 'store-harness', url: 'https://codeup.example.test/team/store-harness.git', username: '', defaultBranch: 'main', status: 'ENABLED', passwordConfigured: false, source: 'CODEUP' },
        { id: 'Codeup:202', name: 'store-service', url: 'https://codeup.example.test/team/store-service.git', username: '', defaultBranch: 'develop', status: 'ENABLED', passwordConfigured: false, source: 'CODEUP' },
        { id: 'Codeup:301', name: 'sandbox-harness', url: 'https://codeup.example.test/team/sandbox-harness.git', username: '', defaultBranch: 'main', status: 'ENABLED', passwordConfigured: false, source: 'CODEUP' },
        { id: 'git:1', name: '平台前端演练仓', url: 'https://git.example.test/demo/platform-web.git', username: 'git', defaultBranch: 'main', status: 'ENABLED', passwordConfigured: true },
        { id: 'git:2', name: '仓配公共文档仓', url: 'https://git.example.test/demo/logistics-harness.git', username: 'git', defaultBranch: '', status: 'ENABLED', passwordConfigured: true },
        { id: 'git:3', name: '可删除的验收仓', url: 'https://git.example.test/demo/sandbox.git', username: 'git', defaultBranch: 'main', status: 'DISABLED', passwordConfigured: true }
      ],
      members: [
        { id: 1, name: '林知夏', roles: ['PRODUCT', 'ARCHITECT'], aliases: ['lin.zhixia', 'zhixia@example.test'], status: 'ENABLED' },
        { id: 2, name: '周星河', roles: ['DEVELOPER'], aliases: ['zhou.xinghe', 'xinghe@example.test'], status: 'ENABLED' },
        { id: 3, name: '顾云舟', roles: ['DESIGN'], aliases: ['gu.yunzhou'], status: 'DISABLED' },
        { id: 4, name: '沈安宁', roles: ['DEVELOPER', 'ARCHITECT'], aliases: ['shen.anning'], status: 'ENABLED' }
      ],
      memberships: [
        { projectId: 1, memberId: 1, status: 'ENABLED' },
        { projectId: 2, memberId: 1, status: 'ENABLED' },
        { projectId: 1, memberId: 2, status: 'ENABLED' },
        { projectId: 1, memberId: 3, status: 'ENABLED' },
        { projectId: 2, memberId: 4, status: 'DISABLED' },
        { projectId: 3, memberId: 2, status: 'ENABLED' }
      ]
    };
  }
  // 采用字段白名单，任何调用方传入的密码、令牌及其它敏感字段都不会被存储。
  function sanitize(value) {
    if (!value || !['projects', 'repos', 'members', 'memberships'].every(function (key) { return Array.isArray(value[key]); })) throw new Error('Mock 数据不完整，请重置示例数据');
    return {
      projects: value.projects.map(function (p) {
        var env = p.environment || {};
        return { id: Number(p.id), name: String(p.name), harnessRepo: p.harnessRepo, codeRepos: (p.codeRepos || []).slice(), status: p.status, color: p.color, remark: p.remark || '', environment: { deployment: env.deployment || '', revision: Number(env.revision) || 0, updatedAt: env.updatedAt || '', content: env.content || '' } };
      }),
      repos: value.repos.map(function (r) {
        var item = { id: String(r.id), name: String(r.name), url: String(r.url), username: r.username || '', defaultBranch: r.defaultBranch || '', status: r.status, passwordConfigured: !!r.passwordConfigured };
        if (r.source === 'CODEUP') item.source = 'CODEUP';
        return item;
      }),
      members: value.members.map(function (m) { return { id: Number(m.id), name: String(m.name), roles: m.roles.slice(), aliases: m.aliases.slice(), status: m.status }; }),
      memberships: value.memberships.map(function (m) { return { projectId: Number(m.projectId), memberId: Number(m.memberId), status: m.status }; })
    };
  }
  function read() {
    try {
      var saved = root.localStorage.getItem(KEY);
      if (saved) { memory = sanitize(JSON.parse(saved)); return copy(memory); }
    } catch (ignored) { /* file:// 或浏览器禁用存储时保留会话 Mock，不影响查看。 */ }
    if (!memory) memory = initial();
    return copy(memory);
  }
  function disabledProjects() {
    try {
      var saved = JSON.parse(root.localStorage.getItem(DISABLE_KEY) || '[]');
      if (!Array.isArray(saved)) throw new Error('项目停用事件不完整');
      disabledMemory = Array.from(new Set(saved.map(Number).filter(function (id) { return Number.isSafeInteger(id) && id > 0; })));
    } catch (ignored) { /* 无存储权限时使用当前会话的停用事件。 */ }
    return disabledMemory.slice();
  }
  function save(value) {
    var previous = read(), next = sanitize(copy(value));
    var stopped = next.projects.filter(function (p) { return p.status === 'DISABLED' && previous.projects.some(function (old) { return old.id === p.id && old.status === 'ENABLED'; }); }).map(function (p) { return p.id; });
    disabledMemory = Array.from(new Set(disabledProjects().concat(stopped)));
    try {
      // 先落停用事件再落当前状态；报告页关闭期间的停用/恢复也不能自动恢复报告开关。
      if (stopped.length) root.localStorage.setItem(DISABLE_KEY, JSON.stringify(disabledMemory));
      root.localStorage.setItem(KEY, JSON.stringify(next));
    } catch (ignored) { /* 无存储权限时仅保留当前会话，不单独落下缺少停用事件的状态。 */ }
    memory = next;
    return copy(next);
  }
  // 同步回调须先持久化扩展和项目触发；回调失败时不消费事件。无回调只读待处理标识。
  function consumeDisabledProjects(apply) {
    var ids = disabledProjects();
    if (typeof apply !== 'function') return ids;
    apply(ids.slice());
    if (ids.length) {
      var remaining = disabledProjects().filter(function (id) { return !ids.includes(id); });
      root.localStorage.setItem(DISABLE_KEY, JSON.stringify(remaining));
      disabledMemory = remaining;
    }
    return ids;
  }
  function reset() {
    var next = sanitize(initial());
    try { root.localStorage.setItem(DISABLE_KEY, '[]'); root.localStorage.setItem(KEY, JSON.stringify(next)); } catch (ignored) { /* 无存储权限时重置会话。 */ }
    disabledMemory = []; memory = next;
    return copy(next);
  }
  root.ProjectPrototypeStore = { read: read, save: save, reset: reset, consumeDisabledProjects: consumeDisabledProjects };
})(window);
