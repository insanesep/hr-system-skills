/* 项目管理专用经典脚本：业务 Mock 与公共控件适配分离，动态业务值只使用 textContent。 */
(function () {
  'use strict';
  var Store = window.ProjectPrototypeStore;
  var state = Store.read(), tab = 'projects', mode = 'normal', readonly = false;
  var selectedProject = null, memberOpener = null, editor = null, projectDraft = null, editorTransition = false, editorClosing = false, busy = false;
  var roles = { PRODUCT: '产品', DEVELOPER: '研发', DESIGN: 'UI', ARCHITECT: '架构' };
  var palette = ['blue', 'cyan', 'purple', 'gold', 'magenta', 'volcano'];
  var colors = ['蓝', '青', '紫', '金', '品红', '橙红'];
  var projectFilter = { keyword: '', status: '' }, memberFilter = {};
  var pagination = {}, rows = { projects: [], repos: [], members: [] };
  var overlay = document.getElementById('editorOverlay');
  var form = document.getElementById('editorForm');
  var notice = document.getElementById('pageNotice');
  function $(id) { return document.getElementById(id); }
  function node(tag, cls, text) { return BusyNative.node(tag, cls, text); }
  function statusName(value) { return value === 'ENABLED' ? '启用' : '停用'; }
  function isGit(repo) { return repo.id.indexOf('git:') === 0 && repo.source !== 'CODEUP'; }
  function project(id, source) { return (source || state).projects.find(function (p) { return p.id === Number(id); }); }
  function member(id, source) { return (source || state).members.find(function (m) { return m.id === Number(id); }); }
  function repo(id, source) { return (source || state).repos.find(function (r) { return r.id === id; }); }
  function relation(pid, mid, source) { return (source || state).memberships.find(function (r) { return r.projectId === pid && r.memberId === mid; }); }
  function repoIds(p) { return Array.from(new Set([p.harnessRepo].concat(p.codeRepos))); }
  function affected(mid, source) {
    var s = source || state;
    return s.projects.filter(function (p) { return !!relation(p.id, mid, s); });
  }
  function references(rid, source) { return (source || state).projects.filter(function (p) { return repoIds(p).includes(rid); }); }
  function projectNames(list) { return list.map(function (p) { return p.name + '（' + statusName(p.status) + '）'; }).join('、') || '无'; }
  function rowButton(attribute, id, label) { var row = document.querySelector('tr[' + attribute + '="' + id + '"]'); return row && Array.from(row.querySelectorAll('button')).find(function (b) { return b.textContent.trim() === label; }); }
  function effective(p, m, r) { return p.status === 'ENABLED' && m.status === 'ENABLED' && r.status === 'ENABLED'; }
  function effectiveCount(p) { return state.memberships.filter(function (r) { return r.projectId === p.id && member(r.memberId) && effective(p, member(r.memberId), r); }).length; }
  function result(text, error) {
    notice.textContent = text;
    notice.className = error ? 'u-danger' : 'u-muted';
    if (!error) ProjectPublic.message(text);
    if (selectedProject) { $('memberNotice').textContent = text; $('memberNotice').className = error ? 'u-danger' : 'u-muted'; }
  }
  function tag(value) { var t = node('span', 'busy-tag busy-tag--default busy-tag--square busy-tag--solid busy-tag--' + (value === 'ENABLED' ? 'success' : 'info')); t.append(node('span', 'busy-tag__text', statusName(value))); return t; }
  function button(label, action, link, danger) { return BusyNative.button(label, (link ? 'is-link ' : '') + (danger ? 'busy-button--danger' : ''), action); }
  function cell(row, content, cls) { var c = node('td', cls); if (content instanceof Node) c.append(content); else c.textContent = content == null || content === '' ? '—' : content; row.append(c); return c; }
  function lines(values) { var wrap = node('div', 'tpl-table-cell'); values.forEach(function (v) { wrap.append(node('div', 'tpl-table-cell__line', v)); }); return wrap; }
  function colorLabel(p) {
    var index = Math.max(0, palette.indexOf(p.color)), wrap = node('span', 'tpl-page-head__tags');
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('width', '16'); svg.setAttribute('height', '16'); svg.setAttribute('aria-hidden', 'true');
    var defs = document.createElementNS(ns, 'defs'), filter = document.createElementNS(ns, 'filter'), matrix = document.createElementNS(ns, 'feColorMatrix');
    // 标识色只用于项目归属；以公共蓝 Token 为基底，不定义页面色板或覆盖组件。
    filter.id = 'project-color-' + p.id + '-' + Math.random().toString(36).slice(2, 7);
    matrix.setAttribute('type', 'hueRotate'); matrix.setAttribute('values', [0, -45, 40, 165, 80, 140][index]);
    filter.append(matrix); defs.append(filter); svg.append(defs);
    var circle = document.createElementNS(ns, 'circle'); circle.setAttribute('cx', '8'); circle.setAttribute('cy', '8'); circle.setAttribute('r', '6'); circle.setAttribute('fill', 'var(--busy-color-primary)'); circle.setAttribute('filter', 'url(#' + filter.id + ')'); svg.append(circle);
    wrap.append(svg, node('span', '', colors[index])); return wrap;
  }
  function repositoryLabel(id) { var r = repo(id); return r ? r.name + (r.status === 'DISABLED' ? '（不可用）' : '') : id + '（来源未取得）'; }
  function actionGroup(actions) {
    var wrap = node('div', 'pro-table__row-actions tpl-row-actions');
    var inline = actions.length <= 4 ? actions : actions.slice(0, 3);
    inline.forEach(function (a) { wrap.append(button(a.label, a.run, true, a.danger)); });
    if (actions.length > 4) {
      var more = button('更多', function (event) {
        event.stopPropagation();
        if (more.getAttribute('aria-expanded') === 'true') { BusyNative.closePopup(); return; }
        var menu = node('ul', 'busy-dropdown-menu'); menu.setAttribute('role', 'menu');
        actions.slice(3).forEach(function (a) {
          var item = node('li', 'busy-dropdown-menu__item', a.label); item.tabIndex = 0; item.setAttribute('role', 'menuitem');
          item.addEventListener('click', function () { BusyNative.closePopup(); a.run(); });
          item.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); } }); menu.append(item);
        });
        more.setAttribute('aria-expanded', 'true');
        BusyNative.popup(more, menu, 'busy-dropdown__popper', function () { more.setAttribute('aria-expanded', 'false'); more.focus(); });
        menu.firstChild.focus();
        menu.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var items = Array.from(menu.children), i = items.indexOf(document.activeElement); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); } });
      }, true);
      more.classList.add('pro-table__more-btn'); more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false'); wrap.append(more);
    }
    return wrap;
  }
  function displayState(bodyId, columns, kind) {
    var body = $(bodyId); body.replaceChildren();
    if (mode === 'normal') return false;
    var tr = node('tr'), td = node('td'), block = node('div', 'tpl-native-state'); td.colSpan = columns;
    if (mode === 'loading') { block.setAttribute('aria-busy', 'true'); block.setAttribute('role', 'status'); block.append(node('p', '', '正在加载，请稍候…'), button('结束加载演示', normal)); }
    if (mode === 'failed') { block.setAttribute('role', 'alert'); block.append(node('p', 'u-danger', '项目来源暂未取得，请重新加载。失败不代表没有配置或 0 人。'), button('重新加载', normal)); }
    if (mode === 'empty') { block.append(node('p', 'u-muted', kind === 'projects' ? (readonly ? '暂无项目' : '暂无项目，请新建项目') : kind === 'repos' ? '暂无通用 Git 仓库' : '该项目暂无成员')); if (kind === 'projects' && !readonly) block.append(button('新建项目', function () { openProject(); })); }
    td.append(block); tr.append(td); body.append(tr); return true;
  }
  function paintProjects(page, size) {
    if (displayState('projectRows', 8, 'projects')) return;
    var body = $('projectRows'); body.replaceChildren();
    rows.projects.slice((page - 1) * size, page * size).forEach(function (p) {
      var tr = node('tr'); tr.dataset.projectId = p.id;
      cell(tr, lines([p.name, '项目 #' + p.id])); cell(tr, colorLabel(p)); cell(tr, repositoryLabel(p.harnessRepo)); cell(tr, lines(p.codeRepos.length ? p.codeRepos.map(repositoryLabel) : ['—']));
      var count = node('span', 'u-mono', effectiveCount(p)); count.append(document.createTextNode(' '), button('查看', function () { openMembers(p.id); }, true)); cell(tr, count, 'u-right'); cell(tr, tag(p.status)); cell(tr, p.remark);
      var actions = [];
      if (!readonly) actions.push({ label: '编辑', run: function () { openProject(p.id); } });
      actions.push({ label: '成员管理', run: function () { openMembers(p.id); } });
      if (!readonly) actions.push({ label: p.status === 'ENABLED' ? '停用' : '启用', danger: p.status === 'ENABLED', run: function () { toggleProject(p.id); } });
      actions.push({ label: '环境信息', run: function () { openEnvironment(p.id); } });
      cell(tr, actionGroup(actions), 'tpl-table-sticky tpl-table-sticky--right'); body.append(tr);
    });
    if (!rows.projects.length) emptyRow(body, 8, readonly ? '暂无项目' : '暂无项目，请新建项目');
    BusyNative.enhance(body);
  }
  function paintRepos(page, size) {
    if (displayState('repoRows', 8, 'repos')) return;
    var body = $('repoRows'); body.replaceChildren();
    rows.repos.slice((page - 1) * size, page * size).forEach(function (r) {
      var tr = node('tr'); tr.dataset.repoId = r.id;
      cell(tr, r.name); cell(tr, r.url); cell(tr, r.username); cell(tr, r.defaultBranch || '自动发现'); cell(tr, r.passwordConfigured ? '已配置' : '未配置'); cell(tr, tag(r.status));
      var refs = node('div', 'tpl-table-cell'); references(r.id).forEach(function (p) { refs.append(button(p.name + '（' + statusName(p.status) + '）', function () { openProject(p.id); }, true)); }); cell(tr, refs.childNodes.length ? refs : '未引用');
      cell(tr, actionGroup([{ label: '编辑', run: function () { openRepo(r.id); } }, { label: r.status === 'ENABLED' ? '停用' : '启用', danger: r.status === 'ENABLED', run: function () { toggleRepo(r.id); } }, { label: '删除', danger: true, run: function () { deleteRepo(r.id); } }]), 'tpl-table-sticky tpl-table-sticky--right'); body.append(tr);
    });
    if (!rows.repos.length) emptyRow(body, 8, '暂无通用 Git 仓库');
    BusyNative.enhance(body);
  }
  function paintMembers(page, size) {
    if (!selectedProject) { $('memberRows').replaceChildren(); emptyRow($('memberRows'), 7, '请先从项目行打开成员管理'); BusyNative.enhance($('memberRows')); return; }
    if (displayState('memberRows', 7, 'members')) return;
    var p = project(selectedProject), body = $('memberRows'); body.replaceChildren();
    rows.members.slice((page - 1) * size, page * size).forEach(function (r) {
      var m = member(r.memberId), tr = node('tr'); tr.dataset.memberId = m.id;
      cell(tr, lines([m.name, effective(p, m, r) ? '有效成员' : '不在有效范围'])); cell(tr, m.roles.map(function (v) { return roles[v]; }).join(' / ')); cell(tr, lines(m.aliases.length ? m.aliases : ['—'])); cell(tr, tag(m.status)); cell(tr, tag(r.status)); cell(tr, projectNames(affected(m.id).filter(function (a) { return a.id !== p.id; })));
      cell(tr, readonly ? '只读' : actionGroup([{ label: '编辑共享资料', run: function () { openMember(m.id); } }, { label: r.status === 'ENABLED' ? '停用本项目关系' : '恢复本项目关系', danger: r.status === 'ENABLED', run: function () { toggleRelation(m.id); } }, { label: m.status === 'ENABLED' ? '停用人员' : '启用人员', danger: m.status === 'ENABLED', run: function () { toggleMember(m.id); } }]), 'tpl-table-sticky tpl-table-sticky--right'); body.append(tr);
    });
    if (!rows.members.length) emptyRow(body, 7, '该项目暂无成员');
    BusyNative.enhance(body);
  }
  function emptyRow(body, cols, text) { var tr = node('tr'), td = node('td'); td.colSpan = cols; td.append(node('div', 'tpl-native-state', text)); tr.append(td); body.append(tr); }
  function filterRows() {
    rows.projects = state.projects.filter(function (p) { return (!projectFilter.keyword || p.name.toLowerCase().includes(projectFilter.keyword)) && (!projectFilter.status || p.status === projectFilter.status); });
    rows.repos = state.repos.filter(isGit);
    rows.members = selectedProject ? state.memberships.filter(function (r) {
      var m = member(r.memberId), f = memberFilter;
      return r.projectId === selectedProject && m && (!f.keyword || [m.name].concat(m.aliases).join(' ').toLowerCase().includes(f.keyword)) && (!f.role || m.roles.includes(f.role)) && (!f.status || f.status === m.status) && (!f.relation || f.relation === r.status);
    }) : [];
  }
  function render(reset) {
    filterRows();
    ['projects', 'repos', 'members'].forEach(function (key) { if (pagination[key]) { if (reset) pagination[key].reset(); else pagination[key].refresh(); } });
    if (selectedProject) {
      var p = project(selectedProject); if (!p) { closeMembers(); result('项目不存在，请返回项目列表', true); return; }
      $('memberTitle').textContent = '成员管理 · ' + p.name;
      $('memberContext').textContent = '当前项目：' + p.name + ' / 项目 #' + p.id + ' / ' + statusName(p.status) + '。有效范围须同时满足项目、人员和本项目关系启用。' + (p.status === 'DISABLED' ? '启用项目后可新增或关联成员；原共享资料、人员及关系状态仍可维护。' : '同一人员可参与多个项目，共享资料变更影响所有参与项目。');
      ['memberNew', 'memberLink'].forEach(function (id) { $(id).hidden = readonly; $(id).disabled = p.status !== 'ENABLED'; $(id).title = p.status !== 'ENABLED' ? '启用项目后可新增或关联成员' : ''; });
    }
    $('projectNew').hidden = readonly; $('repoTab').hidden = readonly;
    window.dispatchEvent(new Event('scroll'));
  }
  function normal() { mode = 'normal'; state = Store.read(); render(); }
  function switchTab(next) {
    if (next === 'repos' && readonly) { result('当前只有查看权限，Git 仓库维护入口不可用', true); return; }
    tab = next; BusyNative.closePopup();
    $('projectList').hidden = tab !== 'projects'; $('repoList').hidden = tab !== 'repos';
    document.querySelectorAll('#moduleTabs [data-tab]').forEach(function (item) { item.classList.toggle('is-active', item.dataset.tab === tab); item.setAttribute('aria-selected', String(item.dataset.tab === tab)); });
    render(true); window.dispatchEvent(new Event('resize'));
  }
  function beginLoad(scope) {
    mode = 'loading'; render();
    setTimeout(function () { mode = 'normal'; state = Store.read(); render(true); if (scope) result(scope + '已重新加载'); }, 320);
  }
  async function confirm(text, title) {
    BusyNative.closePopup();
    var opener = document.activeElement;
    var yes = await ProjectPublic.confirm(text, title);
    if (opener && opener.isConnected) opener.focus();
    return yes;
  }
  function writePermission(kind) {
    if (readonly) throw new Error('当前为只读权限，不能保存配置');
    if ((kind === 'new-member' || kind === 'link') && (!project(selectedProject) || project(selectedProject).status !== 'ENABLED')) throw new Error('项目已停用，请刷新；不得新增或关联成员');
  }
  async function transact(mutate, success, baseline, saveButton) {
    if (busy) return false;
    busy = true;
    if (saveButton) { saveButton.dataset.originalLabel = saveButton.firstChild.textContent; saveButton.disabled = true; saveButton.classList.add('is-loading'); saveButton.firstChild.textContent = '处理中…'; }
    try {
      await new Promise(function (resolve) { setTimeout(resolve, 420); });
      if (readonly) throw new Error('当前为只读权限，操作未保存');
      var next = Store.read();
      if (baseline && JSON.stringify(next) !== baseline) throw new Error('配置已被其它页面更新，请刷新后重新编辑；原草稿保留，未覆盖新配置');
      if ($('mockWriteFail').classList.contains('is-checked') || editor && form.querySelector('[data-mock-fail].is-checked')) throw new Error('保存失败（Mock），原草稿保留，请取消失败演示后重试');
      mutate(next);
      state = Store.save(next); mode = 'normal'; render(); result(success); return true;
    } catch (error) {
      if (editor) feedback(error.message, true); else result(error.message, true);
      return false;
    } finally {
      busy = false;
      if (saveButton) { saveButton.disabled = false; saveButton.classList.remove('is-loading'); saveButton.firstChild.textContent = saveButton === $('editorSave') ? '保存' : saveButton.dataset.originalLabel || '重试'; }
    }
  }
  function validateProject(p, source) {
    if (!p.name || Array.from(p.name).length > 12) throw new Error('请输入 1–12 字项目名称');
    if (!['ENABLED', 'DISABLED'].includes(p.status)) throw new Error('请选择项目启用或停用状态');
    if (p.status === 'ENABLED') {
      var named = source.projects.find(function (other) { return other.id !== p.id && other.status === 'ENABLED' && other.name === p.name; });
      if (named) throw new Error('该名称已被启用项目占用：' + named.name);
    }
    if (!p.harnessRepo) throw new Error('请选择有效 harness 工程');
    repoIds(p).forEach(function (rid) {
      var r = repo(rid, source);
      if (!r || r.status !== 'ENABLED') throw new Error('仓库来源不可用：' + (r ? r.name : rid));
      var conflict = source.projects.find(function (other) { return other.id !== p.id && other.status === 'ENABLED' && repoIds(other).includes(rid); });
      if (p.status === 'ENABLED' && conflict) throw new Error('仓已被项目 ' + conflict.name + ' 占用：' + r.name);
    });
    if (hasCredential(p.remark)) throw new Error('备注不能包含访问凭据');
  }
  async function toggleProject(id) {
    if (readonly || busy) return;
    var p = project(id), enabled = p.status === 'ENABLED', baseline = JSON.stringify(Store.read());
    if (enabled && !await confirm('停用项目「' + p.name + '」后：不参与新出卡采集与当前项目归属，关联报告扩展及触发停用，本项目成员退出后续统计；同人其它项目仍有效。历史资料、成员关系、仓映射、环境信息及报告 key 保留。', '停用项目')) return;
    await transact(function (s) { var target = project(id, s); if (!enabled) validateProject(Object.assign({}, target, { status: 'ENABLED' }), s); target.status = enabled ? 'DISABLED' : 'ENABLED'; }, enabled ? '项目已停用，历史资料保留' : '项目已启用；报告扩展及触发须在报告配置核验后另行启用', baseline, rowButton('data-project-id', id, enabled ? '停用' : '启用'));
  }
  function openMembers(id) {
    if (editor || busy || editorTransition || editorClosing || !$('memberDrawer').hidden) return;
    var p = project(id); if (!p) { result('项目不存在，请返回项目列表', true); return; }
    memberOpener = document.activeElement; selectedProject = p.id; memberFilter = {};
    $('memberKeyword').value = ''; ['memberRole', 'memberStatus', 'relationStatus'].forEach(function (key) { $(key)._setValue(''); });
    // 保留 memberDrawer 稳定入口 ID；成员界面使用公共居中 Dialog，而非 Drawer。
    $('memberDrawer')._requestClose = closeMembers;
    BusyNative.openDialog($('memberDrawer'), memberOpener); $('memberNotice').textContent = '';
    render(true); BusyNative.proTableSearch($('memberList')).measureLabels(); BusyNative.proTableSearch($('memberList')).apply();
    $('memberClose').focus();
  }
  function closeMembers() {
    if (editor || busy || editorTransition || editorClosing) return false;
    BusyNative.closePopup(); BusyNative.closeDialog($('memberDrawer')); selectedProject = null;
    if (memberOpener && memberOpener.isConnected) memberOpener.focus();
    return true;
  }
  async function toggleRelation(mid) {
    if (readonly || busy) return;
    var pid = selectedProject, r = relation(pid, mid), enabled = r.status === 'ENABLED', baseline = JSON.stringify(Store.read());
    if (enabled && !await confirm('仅退出本项目统计，其他项目不受影响。人员整体状态、卡片与报告历史不变。', '停用本项目成员关系')) return;
    await transact(function (s) { relation(pid, mid, s).status = enabled ? 'DISABLED' : 'ENABLED'; }, '本项目成员关系已' + (enabled ? '停用' : '启用') + '；人员和其它关系原状态保留', baseline, rowButton('data-member-id', mid, enabled ? '停用本项目关系' : '恢复本项目关系'));
  }
  async function toggleMember(mid) {
    if (readonly || busy) return;
    var m = member(mid), enabled = m.status === 'ENABLED', baseline = JSON.stringify(Store.read());
    if (!await confirm('受影响项目：' + projectNames(affected(mid)) + '。' + (enabled ? '人员停用将退出全部项目后续统计。' : '人员启用后按各项目和关系原状态重新判定，不自动恢复停用关系。') + '门户账号、外部访问和历史报告不变。', (enabled ? '停用' : '启用') + '人员 · ' + m.name)) return;
    await transact(function (s) { member(mid, s).status = enabled ? 'DISABLED' : 'ENABLED'; }, '人员已' + (enabled ? '停用' : '启用') + '，全部项目关系原状态保留', baseline, rowButton('data-member-id', mid, enabled ? '停用人员' : '启用人员'));
  }
  function feedback(text, error) {
    var container = $('editorFeedback'); container.hidden = !text; container.replaceChildren();
    if (!text) return;
    // 表单的持久就地反馈使用公共业务文本，不把主流程替换成 Toast。
    container.append(node('p', error ? 'u-danger' : 'u-muted', text));
    if (error) container.setAttribute('role', 'alert'); else container.setAttribute('role', 'status');
  }
  function field(label, control, required) {
    var item = node('div', 'busy-form-item busy-form-item--label-left' + (required ? ' is-required' : ''));
    var title = node('div', 'busy-form-item__label', label), content = node('div', 'busy-form-item__content');
    content.append(control); item.append(title, content); form.append(item); return item;
  }
  function inputField(label, key, value, limit, required, type, locked) {
    var wrap = node('div', 'busy-input'), input = node('input', 'busy-input__inner'); input.id = 'edit-' + key; input.setAttribute('aria-label', label); input.value = value || ''; input.type = type || 'text'; input.readOnly = !!locked;
    if (limit) input.maxLength = limit; if (required) input.setAttribute('aria-required', 'true'); wrap.append(input); field(label, wrap, required); return input;
  }
  function textareaField(label, key, value) {
    var wrap = node('div', 'busy-textarea'), input = node('textarea', 'busy-textarea__inner'); input.id = 'edit-' + key; input.setAttribute('aria-label', label); input.value = value || ''; input.rows = key === 'environment' ? 9 : 3; wrap.append(input); field(label, wrap); return input;
  }
  function selectField(label, key, options, value, required) {
    var control = node('div', 'busy-select'); control.id = 'edit-' + key; field(label, control, required); BusyNative.select(control, options, value || ''); control.querySelector('[role=combobox]').setAttribute('aria-label', label); return control;
  }
  function checkbox(label, value, checked) {
    var root = node('label', 'busy-checkbox' + (checked ? ' is-checked' : '')), layer = node('span', 'busy-checkbox__input'), input = node('input', 'busy-checkbox__original'); input.type = 'checkbox'; input.value = value; input.setAttribute('aria-label', label); layer.append(input, node('span', 'busy-checkbox__inner')); root.append(layer, node('span', 'busy-checkbox__label', label)); return root;
  }
  function choices(label, key, options, checked, required) {
    var group = node('div', 'busy-checkbox-group'); group.id = 'edit-' + key;
    options.forEach(function (o) { group.append(checkbox(o.label, o.value, checked.includes(o.value))); }); field(label, group, required); return group;
  }
  function values(key) { var root = $('edit-' + key); return Array.from(root.querySelectorAll('.busy-checkbox.is-checked input')).map(function (i) { return i.value; }); }
  function value(key) { var el = $('edit-' + key); return el.classList.contains('busy-select') ? el.dataset.value || '' : el.value.trim(); }
  function errorAt(key, message) {
    var control = $('edit-' + key); if (!control) return;
    var item = control.closest('.busy-form-item'); item.classList.add('is-error'); var error = node('div', 'busy-form-item__error', message); error.id = 'error-' + key; item.querySelector('.busy-form-item__content').append(error);
    var input = control.querySelector('input,textarea') || control; input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', error.id);
  }
  function clearErrors() { form.querySelectorAll('.busy-form-item__error').forEach(function (e) { e.remove(); }); form.querySelectorAll('.is-error').forEach(function (e) { e.classList.remove('is-error'); }); form.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby'); }); }
  async function editorStart(kind, title, context, id) {
    if (busy || editorTransition || editorClosing) return false;
    if (kind !== 'environment' && readonly) return false;
    editorTransition = true;
    try {
      if (editor && editor.kind === 'project' && kind === 'project' && editor.id === id) return false;
      if (!await requestClose()) return false;
      if (projectDraft && kind !== 'repo') {
        restoreProjectDraft();
        if (kind === 'project' && editor.id === id) return false;
        if (!await requestClose()) return false;
      }
      BusyNative.closePopup(); state = Store.read();
      editor = { kind: kind, id: id, projectId: selectedProject, dirty: false, baseline: JSON.stringify(state), revision: null, projectSnapshot: kind === 'project' ? JSON.stringify(project(id, state) || null) : null };
      form.replaceChildren(); $('editorTitle').textContent = title; $('editorContext').textContent = context; feedback('');
      $('connectionTest').hidden = kind !== 'repo'; $('environmentReload').hidden = kind !== 'environment'; $('editorSave').hidden = readonly;
      $('editorSave').firstChild.textContent = '保存';
      return true;
    } finally { editorTransition = false; }
  }
  function editorReady() {
    var fail = checkbox('模拟本次保存失败（不改动数据）', 'fail', false); fail.dataset.mockFail = ''; field('Mock 演示', fail);
    BusyNative.enhance(form); BusyNative.inputs(form);
    form.querySelectorAll('.busy-select [role=combobox]').forEach(function (el) { var title = el.closest('.busy-form-item').querySelector('.busy-form-item__label').textContent; el.setAttribute('aria-label', title); });
    overlay._requestClose = requestClose;
    BusyNative.openDialog(overlay); BusyNative.formLabels(overlay); $('editorSave').disabled = false;
    var focus = form.querySelector('.busy-input__inner:not([readonly]), .busy-select__wrapper, textarea, input'); if (focus) focus.focus();
  }
  function projectCandidates(p, retained) {
    var ids = Array.from(new Set((p ? repoIds(p) : []).concat(retained || []).filter(Boolean)));
    var candidates = state.repos.filter(function (r) { return r.status === 'ENABLED' || ids.includes(r.id); }).map(function (r) { var other = state.projects.find(function (a) { return a.status === 'ENABLED' && (!p || a.id !== p.id) && repoIds(a).includes(r.id); }); return { value: r.id, label: (r.source === 'CODEUP' ? '云效 · ' : '通用 Git · ') + r.name + (r.status !== 'ENABLED' ? '（不可用）' : '') + (other ? '（已被 ' + other.name + ' 占用）' : '') }; });
    ids.filter(function (id) { return !repo(id); }).forEach(function (id) { candidates.push({ value: id, label: id + '（来源未取得）' }); });
    return candidates;
  }
  function draftButton() { $('repoRefresh').replaceChildren(node('span', '', projectDraft ? '返回项目草稿' : '刷新')); }
  function suspendProjectDraft() {
    if (!editor || editor.kind !== 'project' || busy || editorTransition || projectDraft) return;
    BusyNative.closePopup();
    projectDraft = { editor: editor, nodes: Array.from(form.childNodes), title: $('editorTitle').textContent, context: $('editorContext').textContent, focus: document.activeElement };
    // 保存真实表单节点及选择器状态到内存，释放共用编辑器；不将草稿或凭据写入存储。
    BusyNative.closeDialog(overlay); form.replaceChildren(); editor = null;
    switchTab('repos'); draftButton(); result('项目草稿已保留，可维护 Git 配置；点击「返回项目草稿」继续编辑');
  }
  function restoreProjectDraft() {
    var saved = projectDraft; if (!saved) return;
    projectDraft = null; editor = saved.editor; state = Store.read(); form.replaceChildren(...saved.nodes);
    $('editorTitle').textContent = saved.title; $('editorContext').textContent = saved.context;
    $('connectionTest').hidden = true; $('environmentReload').hidden = true; $('editorSave').hidden = readonly; $('editorSave').disabled = false; $('editorSave').firstChild.textContent = '保存';
    var harness = value('harness'), codes = values('code'), p = project(editor.id), candidates = projectCandidates(p, [harness].concat(codes)), dirty = editor.dirty;
    clearErrors();
    // 仅刷新仓库候选，保留原文本节点和全部已选标识（失效项保留并在保存时校验）。
    var old = $('edit-harness'), replacement = node('div', 'busy-select'); replacement.id = old.id; old.replaceWith(replacement);
    BusyNative.select(replacement, [{ value: '', label: '请选择仓库' }].concat(candidates), harness); replacement.querySelector('[role=combobox]').setAttribute('aria-label', 'harness 工程');
    $('edit-code').replaceChildren(...candidates.map(function (o) { return checkbox(o.label, o.value, codes.includes(o.value)); }));
    BusyNative.enhance(form); BusyNative.inputs(form); editor.dirty = dirty;
    editor.projectConflict = editor.projectSnapshot !== JSON.stringify(p || null);
    if (!editor.projectConflict) editor.baseline = JSON.stringify(state);
    switchTab('projects'); BusyNative.openDialog(overlay); BusyNative.formLabels(overlay); draftButton();
    if (editor.projectConflict) feedback('项目已被其它页面更新；原草稿保留，请放弃后重新编辑，不会覆盖新配置', true);
    else {
      try { validateProject({ id: editor.id || 0, name: value('name'), harnessRepo: harness, codeRepos: codes, status: value('status'), remark: value('remark') }, state); feedback('项目草稿已恢复，Git 候选及占用约束已重新核验'); }
      catch (error) { feedback('项目草稿已恢复；' + error.message, true); }
    }
    var focus = saved.focus && saved.focus.isConnected ? saved.focus : $('edit-name'); if (focus) focus.focus();
  }
  async function resumeProjectDraft() {
    if (!projectDraft || busy || editorTransition || editorClosing) return false;
    editorTransition = true;
    try { if (!await requestClose()) return false; restoreProjectDraft(); return true; }
    finally { editorTransition = false; }
  }
  async function openProject(id) {
    var p = id ? project(id) : null;
    if (!await editorStart('project', p ? '编辑项目 · ' + p.name : '新建项目', p ? '项目 #' + p.id + ' · 标识色 ' + colors[palette.indexOf(p.color)] + '（只读，启停不释放）' : '项目标识和标识色由创建顺序生成；不创建远端仓库。', id)) return;
    p = id ? project(id) : null;
    if (id && !p) { closeEditor(); result('项目不存在，请刷新后重新打开', true); return; }
    switchTab('projects');
    inputField('项目名称', 'name', p ? p.name : '', 12, true);
    var candidates = projectCandidates(p);
    selectField('harness 工程', 'harness', [{ value: '', label: '请选择仓库' }].concat(candidates), p ? p.harnessRepo : '', true);
    choices('代码服务仓', 'code', candidates, p ? p.codeRepos : [], false);
    form.append(node('p', 'u-muted', 'harness 单选必填，代码服务仓可多选。同项目允许同仓两种用途；一个仓最多被一个启用项目占用。'));
    form.append(button('查看 Git 配置', suspendProjectDraft, true));
    textareaField('备注', 'remark', p ? p.remark : '');
    selectField('项目状态', 'status', [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }], p ? p.status : 'ENABLED');
    editorReady();
  }
  async function openMember(mid) {
    var p = project(selectedProject), m = mid ? member(mid) : null;
    if (!p || (!m && p.status !== 'ENABLED') || readonly) return;
    if (!await editorStart(m ? 'member' : 'new-member', m ? '编辑共享资料 · ' + m.name : '新增成员 · ' + p.name, m ? '所有受影响项目：' + projectNames(affected(m.id)) + '。本项目关系状态不在这里修改。' : '当前项目：' + p.name + ' / #' + p.id + '。保存时原子创建人员档案和本项目关系。', mid)) return;
    p = project(selectedProject); m = mid ? member(mid) : null;
    if (!p || mid && !m || !mid && p.status !== 'ENABLED') { closeEditor(); result('项目或成员范围已更新，请刷新后重新打开', true); return; }
    inputField('姓名', 'name', m ? m.name : '', 64, true);
    choices('角色', 'roles', Object.keys(roles).map(function (key) { return { value: key, label: roles[key] }; }), m ? m.roles : [], true);
    textareaField('别名（每行一条）', 'aliases', m ? m.aliases.join('\n') : '');
    form.append(node('p', 'u-muted', '最多 50 条，每条不超过 128 字；去首尾空白、统一小写后去重。成员职责仅用于统计，不授予外部权限。'));
    selectField('人员状态（所有项目）', 'status', [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }], m ? m.status : 'ENABLED');
    if (!m) selectField('本项目关系状态', 'relation', [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }], 'ENABLED');
    editorReady();
  }
  async function openLink() {
    var p = project(selectedProject); if (!p || p.status !== 'ENABLED' || readonly) return;
    if (!await editorStart('link', '关联已有成员 · ' + p.name, '按稳定成员标识复用共用人员。已存在的关系打开原关系；停用的关系恢复，不复制档案。')) return;
    p = project(selectedProject);
    if (!p || p.status !== 'ENABLED') { closeEditor(); result('项目范围已更新，请刷新后重新打开', true); return; }
    var selector = selectField('搜索已有成员', 'member', [{ value: '', label: '按姓名搜索并选择' }].concat(state.members.map(function (m) { var r = relation(p.id, m.id); return { value: String(m.id), label: m.name + ' / ' + m.roles.map(function (key) { return roles[key]; }).join('、') + ' / 人员' + statusName(m.status) + (r ? ' / 已关联' + (r.status === 'DISABLED' ? '（可恢复）' : '') : '') }; })), '');
    selector.dataset.filterable = 'true';
    // 公共选择器初始化时需取得 filterable，因此重新建该字段，而非私造下拉。
    var holder = selector.parentElement, replacement = node('div', 'busy-select'); replacement.id = 'edit-member'; replacement.dataset.filterable = 'true';
    replacement.dataset.options = JSON.stringify(selector._nativeSelect.options); selector.remove(); holder.append(replacement);
    var details = node('div', 'tpl-section'); details.id = 'linkDetails'; form.append(details);
    replacement.addEventListener('native-change', function (e) { var m = member(e.detail.value); details.replaceChildren(); if (m) { details.append(node('p', 'u-muted', '已参与项目：' + projectNames(affected(m.id))), node('p', 'u-muted', '人员状态：' + statusName(m.status) + '。关联不会自动启用停用人员。')); var old = relation(p.id, m.id); $('editorSave').firstChild.textContent = old ? old.status === 'DISABLED' ? '恢复原关系' : '查看原关系' : '关联本项目'; } });
    editorReady();
  }
  function normalizeUrl(text) {
    if (text.length > 2048 || /[\u0000-\u0020\u007f]/.test(text)) throw new Error('请输入不含凭据的 HTTP/HTTPS 仓地址');
    var u; try { u = new URL(text); } catch (ignored) { throw new Error('请输入不含凭据的 HTTP/HTTPS 仓地址'); }
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || text.includes('?') || text.includes('#') || !u.pathname.replace(/\//g, '')) throw new Error('请输入不含凭据、查询参数或片段且包含仓路径的 HTTP/HTTPS 仓地址');
    u.pathname = u.pathname.replace(/\/+$/, ''); return u.toString().replace(/\/+$/, '');
  }
  function hasCredential(text) { return /(?:密码|口令|令牌|token|password|secret)\s*[:：=]\s*\S+|https?:\/\/[^\s/]+:[^\s/]+@|(?:bearer|authorization)\s+\S+/i.test(text || ''); }
  function safeShort(text, required) { return (!required || !!text) && Array.from(text).length <= 256 && !/[\u0000-\u001f\u007f]/.test(text); }
  async function openRepo(id) {
    var r = id ? repo(id) : null, refs = r ? references(id) : [];
    if (!await editorStart('repo', r ? '编辑 Git 仓库 · ' + r.name : '新建 Git 仓库', refs.length ? '地址已被以下项目引用，不可更换或删除：' + projectNames(refs) : '仅维护本地配置；不创建或改动远端仓。密码仅在当前输入框短暂存在，Mock 只保存「已配置」标记。', id)) return;
    r = id ? repo(id) : null; refs = r ? references(id) : [];
    if (id && !r) { closeEditor(); result('仓库配置已更新，请刷新后重新打开', true); return; }
    inputField('名称', 'name', r ? r.name : '', 256, true);
    inputField('仓地址', 'url', r ? r.url : '', 2048, true, 'text', refs.length > 0);
    inputField('访问账号', 'username', r ? r.username : 'git', 256, true);
    var secret = inputField('密码或令牌', 'password', '', 256, !r, 'password'); secret.autocomplete = 'new-password'; secret.placeholder = r ? '留空沿用已配置凭据（不回显）' : '仅用于本次 Mock 验收，不输入真实凭据';
    inputField('默认分支', 'branch', r ? r.defaultBranch : '', 256); form.append(node('p', 'u-muted', '默认分支留空时自动发现。连接测试不保存；Mock 只模拟分支读取结果，不联网。'));
    selectField('仓库状态', 'status', [{ value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }], r ? r.status : 'ENABLED');
    var testFail = checkbox('模拟连接失败', 'test-fail', false); testFail.dataset.testFail = ''; field('连接演示', testFail);
    editorReady();
  }
  async function toggleRepo(id) {
    if (readonly || busy) return;
    var r = repo(id), enabled = r.status === 'ENABLED', active = references(id).filter(function (p) { return p.status === 'ENABLED'; }), baseline = JSON.stringify(Store.read());
    if (enabled && active.length) { await confirm('不能停用，被启用项目引用：' + projectNames(active) + '。请先在对应项目解除引用或停用项目，不会自动删除引用。', '仓库引用保护'); return; }
    if (enabled && !await confirm('停用后不再作为新项目配置候选；保留原配置和历史证据。', '停用 Git 仓库')) return;
    await transact(function (s) { var target = repo(id, s); if (enabled && references(id, s).some(function (p) { return p.status === 'ENABLED'; })) throw new Error('仓库被启用项目引用，请刷新：' + projectNames(references(id, s))); target.status = enabled ? 'DISABLED' : 'ENABLED'; }, '仓库已' + (enabled ? '停用' : '启用'), baseline, rowButton('data-repo-id', id, enabled ? '停用' : '启用'));
  }
  async function deleteRepo(id) {
    if (readonly || busy) return;
    var refs = references(id), baseline = JSON.stringify(Store.read());
    if (refs.length) { await confirm('不能删除，引用项目：' + projectNames(refs) + '。停用项目的引用也受保护，请先解除引用。远端仓和映射不会被自动改动。', '仓库引用保护'); return; }
    if (!await confirm('只删除本地 Git 配置，不删除远端仓库。确认删除「' + repo(id).name + '」？', '删除仓库配置')) return;
    await transact(function (s) { if (references(id, s).length) throw new Error('仓库已被项目引用，请刷新'); s.repos = s.repos.filter(function (r) { return r.id !== id; }); }, '仓库配置已删除，远端仓不受影响', baseline, rowButton('data-repo-id', id, '删除'));
  }
  async function openEnvironment(pid) {
    var p = project(pid); if (!p) return;
    if (!await editorStart('environment', '环境信息 · ' + p.name, '当前项目：' + p.name + ' / #' + p.id + '。仅编辑公共业务上下文，不填写个人账号、密码、令牌、连接凭据或配置报文。', pid)) return;
    p = project(pid);
    if (!p) { closeEditor(); result('项目不存在，请刷新后重新打开', true); return; }
    var env = p.environment || {};
    editor.revision = env.revision || 0;
    inputField('部署环境（只读）', 'deployment', env.deployment || '未取得', null, false, 'text', true);
    inputField('修订号（只读）', 'revision', String(editor.revision), null, false, 'text', true);
    inputField('更新时间（只读）', 'updated', env.updatedAt || '暂无资料', null, false, 'text', true);
    var text = textareaField('公共上下文', 'environment', env.content || ''); text.readOnly = readonly;
    text.placeholder = '本环境入口、应用、测试库定位、可复用数据、数据规则、外部依赖、需人工配合事项';
    if (!env.content) form.append(node('p', 'u-muted', '本部署环境暂无公共资料，请补充业务上下文。'));
    var unknown = checkbox('模拟部署环境未知（不可保存）', 'unknown', false); unknown.dataset.unknownEnvironment = ''; field('环境演示', unknown);
    var conflict = checkbox('模拟修订冲突（需重新加载）', 'conflict', false); conflict.dataset.environmentConflict = ''; field('并发演示', conflict);
    editorReady();
    form.querySelector('[data-unknown-environment]').addEventListener('native-change', function (e) { $('edit-deployment').value = e.detail.checked ? '未知部署环境' : env.deployment || '未取得'; $('editorSave').disabled = e.detail.checked || !env.deployment; if (e.detail.checked) feedback('当前部署环境未知，不可保存，请重新加载', true); });
    editor.readUnavailable = mode === 'failed' || mode === 'loading';
    $('editorSave').disabled = !env.deployment || editor.readUnavailable;
    if (editor.readUnavailable) { text.readOnly = true; feedback(mode === 'failed' ? '环境信息读取失败（Mock），以下保留资料不代表最新修订，请重新加载后编辑' : '环境信息加载中（Mock），请重新加载以完成本次读取', mode === 'failed'); }
  }
  function validateDraft() {
    clearErrors();
    var kind = editor.kind, errors = [];
    function add(key, text) { errors.push(text); errorAt(key, text); }
    var draft;
    if (kind === 'project') {
      var old = editor.id ? project(editor.id) : null;
      draft = { id: old ? old.id : Math.max(0, ...state.projects.map(function (p) { return p.id; })) + 1, name: value('name'), harnessRepo: value('harness'), codeRepos: values('code'), status: value('status'), color: old ? old.color : palette[state.projects.length % 6], remark: value('remark'), environment: old ? old.environment : { deployment: '集成测试', revision: 0, updatedAt: '', content: '' } };
      try { validateProject(draft, state); } catch (e) { add(/仓|harness/.test(e.message) ? 'harness' : /备注/.test(e.message) ? 'remark' : /状态/.test(e.message) ? 'status' : 'name', e.message); }
    } else if (kind === 'member' || kind === 'new-member') {
      var aliases = Array.from(new Set(value('aliases').split(/\r?\n/).map(function (a) { return a.trim().toLowerCase(); }).filter(Boolean)));
      draft = { id: editor.id || Math.max(0, ...state.members.map(function (m) { return m.id; })) + 1, name: value('name'), roles: values('roles'), aliases: aliases, status: value('status') };
      if (!draft.name || Array.from(draft.name).length > 64) add('name', '请输入不超过 64 字的姓名');
      if (state.members.some(function (m) { return m.id !== draft.id && m.name === draft.name; })) add('name', '成员已存在，请关联已有成员');
      if (!draft.roles.length) add('roles', '请至少选择一个角色');
      if (!['ENABLED', 'DISABLED'].includes(draft.status)) add('status', '请选择人员启用或停用状态');
      if (kind === 'new-member' && !['ENABLED', 'DISABLED'].includes(value('relation'))) add('relation', '请选择本项目关系启用或停用状态');
      if (aliases.length > 50 || aliases.some(function (a) { return Array.from(a).length > 128; })) add('aliases', '别名最多 50 条，每条不超过 128 字');
      if (kind === 'new-member') draft.relationStatus = value('relation');
    } else if (kind === 'link') {
      draft = { memberId: Number(value('member')) }; if (!member(draft.memberId)) add('member', '请选择成员');
    } else if (kind === 'repo') {
      draft = { name: value('name'), url: value('url'), username: value('username'), defaultBranch: value('branch'), status: value('status'), passwordConfigured: !!value('password') || !!(editor.id && repo(editor.id).passwordConfigured) };
      if (!safeShort(draft.name, true)) add('name', '请输入有效名称（最多 256 字，无控制字符）');
      if (!['ENABLED', 'DISABLED'].includes(draft.status)) add('status', '请选择仓库启用或停用状态');
      if (state.repos.filter(isGit).some(function (r) { return r.id !== editor.id && r.name.toLowerCase() === draft.name.toLowerCase(); })) add('name', '仓名称已存在');
      try { draft.url = normalizeUrl(draft.url); if (state.repos.filter(isGit).some(function (r) { return r.id !== editor.id && normalizeUrl(r.url) === draft.url; })) add('url', '仓地址已存在'); } catch (e) { add('url', e.message); }
      if (editor.id && references(editor.id).length && draft.url !== normalizeUrl(repo(editor.id).url)) add('url', '仓地址被项目引用，不可修改：' + projectNames(references(editor.id)));
      if (!safeShort(draft.username, true)) add('username', '请输入有效账号（最多 256 字，无控制字符）');
      if (!safeShort(draft.defaultBranch, false)) add('branch', '请输入有效分支名称');
      if (!draft.passwordConfigured || value('password').length > 256) add('password', '请填写不超过 256 字的访问密码或令牌');
      if (editor.id && draft.status === 'DISABLED' && references(editor.id).some(function (p) { return p.status === 'ENABLED'; })) add('status', '不能停用，被启用项目引用：' + projectNames(references(editor.id)));
    } else {
      draft = { content: value('environment') };
      if (editor.readUnavailable) add('environment', '公共环境信息未取得，请重新加载后编辑');
      if (form.querySelector('[data-unknown-environment].is-checked') || !project(editor.id).environment.deployment) add('environment', '当前部署环境未知，不可保存');
      if (hasCredential(draft.content) || /[{}]|^\s*(?:SELECT|INSERT|UPDATE|DELETE|curl)\b/im.test(draft.content) || /(?:个人账号|测试账号|登录账号|用户名)\s*[:：=]\s*\S+/.test(draft.content)) add('environment', '仅填写公共业务资料，不能包含个人账号、访问凭据、配置报文或实现片段');
    }
    if (errors.length) { feedback(errors[0], true); var first = form.querySelector('[aria-invalid]'); if (first) first.focus(); return null; }
    return draft;
  }
  async function saveEditor() {
    if (!editor || busy || readonly || editorTransition || editorClosing) return;
    if (editor.projectConflict) { feedback('项目已被其它页面更新；原草稿保留，请放弃后重新编辑，不会覆盖新配置', true); return; }
    try { writePermission(editor.kind); } catch (e) { feedback(e.message, true); return; }
    var draft = validateDraft(); if (!draft) return;
    var current = editor, kind = current.kind;
    if (kind === 'member' && !await confirm('所有受影响项目：' + projectNames(affected(current.id)) + '。共享姓名、角色、别名与人员状态一起更新；本项目及其它项目关系原状态保留，不改历史报告。', '确认共享资料修改')) return;
    if (kind === 'project' && current.id && project(current.id).status === 'ENABLED' && draft.status === 'DISABLED' && !await confirm('停用将影响本项目新出卡、当前归属、报告扩展及触发、成员后续统计；保留历史资料和原成员关系。', '停用项目')) return;
    if (kind === 'repo' && current.id && repo(current.id).status === 'ENABLED' && draft.status === 'DISABLED' && !await confirm('仓库停用后不再作为新配置候选，保留历史资料。', '停用 Git 仓库')) return;
    if (kind === 'link') {
      var old = relation(current.projectId, draft.memberId);
      if (old && old.status === 'ENABLED') { closeEditor(); result('已关联，请查看原关系；未新增任何档案或关系'); highlightMember(draft.memberId); return; }
      if (old && !await confirm('恢复「' + member(draft.memberId).name + '」的原项目关系，不重复关联；人员原状态保持' + statusName(member(draft.memberId).status) + '。', '恢复原关系')) return;
    }
    var ok = await transact(function (s) {
      var p, m;
      if (kind === 'project') { validateProject(draft, s); p = project(draft.id, s); if (p) Object.assign(p, draft); else s.projects.push(draft); }
      if (kind === 'member' || kind === 'new-member') {
        p = project(current.projectId, s); if (!p || kind === 'new-member' && p.status !== 'ENABLED') throw new Error('项目已停用，请刷新');
        if (s.members.some(function (other) { return other.id !== draft.id && other.name === draft.name; })) throw new Error('成员已存在，请关联已有成员');
        m = member(draft.id, s); var rs = draft.relationStatus; delete draft.relationStatus;
        if (m) Object.assign(m, draft); else { s.members.push(draft); s.memberships.push({ projectId: current.projectId, memberId: draft.id, status: rs }); }
      }
      if (kind === 'link') { p = project(current.projectId, s); if (!p || p.status !== 'ENABLED') throw new Error('项目已停用，请刷新'); if (!member(draft.memberId, s)) throw new Error('成员来源未取得，请刷新'); var r = relation(p.id, draft.memberId, s); if (r) r.status = 'ENABLED'; else s.memberships.push({ projectId: p.id, memberId: draft.memberId, status: 'ENABLED' }); }
      if (kind === 'repo') { var r = repo(current.id, s); if (r && references(r.id, s).length && normalizeUrl(r.url) !== draft.url) throw new Error('仓地址被项目引用，不可修改'); if (r) Object.assign(r, draft); else { draft.id = 'git:' + Math.max(Date.now(), Math.max(0, ...s.repos.filter(isGit).map(function (item) { return Number(item.id.split(':')[1]); })) + 1); s.repos.push(draft); } }
      if (kind === 'environment') { p = project(current.id, s); if (!p.environment.deployment) throw new Error('当前部署环境未知，不可保存'); if (p.environment.revision !== current.revision || form.querySelector('[data-environment-conflict].is-checked')) throw new Error('修订冲突，请先重新加载再编辑；未覆盖另一人的变更，当前草稿保留'); p.environment.content = draft.content; p.environment.revision += 1; p.environment.updatedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }); }
    }, { project: '项目已保存', member: '成员共享资料已保存', 'new-member': '成员已新增并关联本项目', link: '成员已关联本项目，人员原状态保留', repo: 'Git 仓库配置已保存', environment: '项目环境信息已保存' }[kind], current.baseline, $('editorSave'));
    if (!ok) return;
    if (kind === 'environment') { current.baseline = JSON.stringify(state); current.revision = project(current.id).environment.revision; current.dirty = false; $('edit-revision').value = String(current.revision); $('edit-updated').value = project(current.id).environment.updatedAt; feedback('项目环境信息已保存，修订已更新，留在当前弹窗'); }
    else closeEditor();
  }
  function highlightMember(id) { var tr = $('memberRows').querySelector('[data-member-id="' + Number(id) + '"]'); if (!tr) { memberFilter = {}; render(true); tr = $('memberRows').querySelector('[data-member-id="' + Number(id) + '"]'); } if (tr) { tr.tabIndex = -1; tr.focus(); } }
  function closeEditor() {
    if (!editor) return;
    var current = editor, memberEditor = ['member', 'new-member', 'link'].includes(current.kind);
    var secret = $('edit-password'); if (secret) secret.value = '';
    editor = null; BusyNative.closeDialog(overlay); form.replaceChildren(); draftButton();
    // 成员行刷新后原触发按钮可能已移除；子弹窗仍返回同一项目成员列表。
    if (memberEditor && !$('memberDrawer').hidden && !$('memberDrawer').contains(document.activeElement)) {
      var target = current.kind === 'member' ? rowButton('data-member-id', current.id, '编辑共享资料') : $(current.kind === 'link' ? 'memberLink' : 'memberNew');
      (target && target.isConnected && !target.hidden ? target : $('memberClose')).focus();
    }
  }
  async function requestClose() {
    if (busy || editorClosing) return false;
    if (!editor) return true;
    editorClosing = true;
    try {
      if (editor.dirty && !await confirm('未保存内容将被放弃，已保存配置不变。', '放弃' + ({ project: '项目', member: '成员', 'new-member': '成员', link: '关联', repo: '仓库配置', environment: '环境信息' }[editor.kind]) + '修改？')) return false;
      closeEditor(); return true;
    } finally { editorClosing = false; }
  }
  async function testConnection() {
    if (!editor || editor.kind !== 'repo' || busy || readonly) return;
    clearErrors();
    try { normalizeUrl(value('url')); } catch (e) { errorAt('url', e.message); feedback(e.message, true); return; }
    if (!safeShort(value('username'), true)) { errorAt('username', '请输入有效账号'); return; }
    if (!value('password') && !(editor.id && repo(editor.id).passwordConfigured)) { errorAt('password', '请填写访问密码或令牌'); feedback('测试需要访问凭据', true); return; }
    var b = $('connectionTest'); b.disabled = true; b.classList.add('is-loading'); b.firstChild.textContent = '正在测试…'; busy = true;
    await new Promise(function (resolve) { setTimeout(resolve, 420); });
    feedback(form.querySelector('[data-test-fail].is-checked') ? '连接失败（Mock）：远端暂不可达，请核对地址与访问授权后重试。未保存配置。' : '连接成功（Mock），发现 3 个分支：main、develop、release。默认分支 main；测试不保存配置。', !!form.querySelector('[data-test-fail].is-checked'));
    b.disabled = false; b.classList.remove('is-loading'); b.firstChild.textContent = '连接测试'; busy = false;
  }
  async function reloadEnvironment() {
    if (!editor || busy) return;
    if (editor.dirty && !await confirm('重新加载将丢弃本次未保存草稿，读取当前修订后重新编辑。', '重新加载环境信息')) return;
    var id = editor.id; $('environmentReload').disabled = true; feedback('正在重新加载环境信息…');
    await new Promise(function (resolve) { setTimeout(resolve, 320); }); $('environmentReload').disabled = false; mode = 'normal'; state = Store.read(); render(); closeEditor(); openEnvironment(id);
  }
  // 所有查询布局、下拉、输入、表格和分页结构均调用公共适配。
  ['projectList', 'memberList'].forEach(function (id) { BusyNative.proTableSearch($(id)); });
  BusyNative.enhance(document); BusyNative.inputs(document);
  ['projectList', 'repoList', 'memberList'].forEach(function (id) { BusyNative.proTableColumns($(id)); if (id !== 'memberList') { BusyNative.bindStickyLayout($(id)); BusyNative.bindPaginationBorder($(id)); } });
  ['projects', 'repos', 'members'].forEach(function (key) { var ids = { projects: 'projectPages', repos: 'repoPages', members: 'memberPages' }, paints = { projects: paintProjects, repos: paintRepos, members: paintMembers }; pagination[key] = ProjectPublic.pagination($(ids[key]), function () { return mode === 'normal' ? rows[key].length : 0; }, paints[key], { pageSize: 20 }); });
  document.querySelectorAll('.busy-select').forEach(function (control) { var field = control.closest('.busy-form-item'); if (field) control.querySelector('[role=combobox]').setAttribute('aria-label', field.querySelector('.busy-form-item__label').textContent); });
  document.querySelectorAll('#moduleTabs [data-tab]').forEach(function (item) { item.addEventListener('click', function () { if (projectDraft && item.dataset.tab === 'projects') { resumeProjectDraft(); return; } switchTab(item.dataset.tab); }); });
  $('projectQuery').addEventListener('click', function () { projectFilter = { keyword: $('projectKeyword').value.trim().toLowerCase(), status: $('projectStatus').dataset.value || '' }; beginLoad(); });
  $('projectReset').addEventListener('click', function () { $('projectKeyword').value = ''; $('projectStatus')._setValue(''); projectFilter = { keyword: '', status: '' }; beginLoad(); });
  $('projectNew').addEventListener('click', function () { openProject(); }); $('projectRefresh').addEventListener('click', function () { beginLoad('项目列表'); });
  $('repoNew').addEventListener('click', function () { openRepo(); }); $('repoRefresh').addEventListener('click', function () { if (projectDraft) resumeProjectDraft(); else beginLoad('Git 配置'); });
  $('memberNew').addEventListener('click', function () { openMember(); }); $('memberLink').addEventListener('click', openLink);
  $('memberQuery').addEventListener('click', function () { memberFilter = { keyword: $('memberKeyword').value.trim().toLowerCase(), role: $('memberRole').dataset.value || '', status: $('memberStatus').dataset.value || '', relation: $('relationStatus').dataset.value || '' }; beginLoad(); });
  $('memberReset').addEventListener('click', function () { $('memberKeyword').value = ''; ['memberRole', 'memberStatus', 'relationStatus'].forEach(function (id) { $(id)._setValue(''); }); memberFilter = {}; beginLoad(); });
  $('memberRefresh').addEventListener('click', function () { beginLoad('当前项目成员'); });
  // memberClose、memberDone 和遮罩关闭由公共 data-dialog-close / _requestClose 接入。
  $('editorSave').addEventListener('click', saveEditor); $('connectionTest').addEventListener('click', testConnection); $('environmentReload').addEventListener('click', reloadEnvironment);
  form.addEventListener('submit', function (e) { e.preventDefault(); saveEditor(); });
  form.addEventListener('input', function () { if (editor) editor.dirty = true; });
  form.addEventListener('native-change', function (e) { if (editor && !e.target.closest('[data-mock-fail], [data-test-fail], [data-environment-conflict], [data-unknown-environment]')) editor.dirty = true; });
  form.addEventListener('focusout', function (e) { if (editor && e.target.id === 'edit-name' && e.target.value.trim()) { var limit = editor.kind === 'project' ? 12 : editor.kind === 'repo' ? 256 : 64; if (Array.from(e.target.value.trim()).length > limit) { clearErrors(); errorAt('name', '名称超过允许长度'); } } });
  ['Normal', 'Loading', 'Failed', 'Empty'].forEach(function (suffix) { $('mock' + suffix).addEventListener('click', function () { mode = suffix.toLowerCase(); if (mode === 'normal') state = Store.read(); render(); result('已切换' + { normal: '正常', loading: '加载中', failed: '加载失败', empty: '空态' }[mode] + '演示；保存数据未被清除'); }); });
  $('mockPermission').addEventListener('click', function () { if (busy || editor || projectDraft || editorTransition) return; readonly = !readonly; $('mockPermission').setAttribute('aria-pressed', String(readonly)); $('mockPermission').firstChild.textContent = readonly ? '恢复维护权限' : '切换只读'; if (readonly) switchTab('projects'); render(); result(readonly ? '只读权限：可查看项目、成员和公共环境信息；所有维护按钮与 Git 入口隐藏' : '已恢复 Mock 维护权限'); });
  $('mockReset').addEventListener('click', async function () { if (busy || editorTransition) return; if (editor || projectDraft) { result('请先完成或放弃当前草稿，再重置 Mock', true); return; } if (!await confirm('仅重置浏览器示例数据，不影响生产。所有 Mock 配置修改将被清除。', '重置 Mock')) return; state = Store.reset(); mode = 'normal'; projectFilter = { keyword: '', status: '' }; memberFilter = {}; $('projectKeyword').value = ''; $('projectStatus')._setValue(''); render(true); result('Mock 已重置，共享存储与项目成员范围已恢复'); });
  // Esc 始终只关闭顶层；Tab 限制在可见弹层并包含公共选择器 popup。
  document.addEventListener('keydown', function (e) {
    var pop = document.querySelector('.busy-popper:not(.busy-zoom-in-top-leave-active)'), confirmation = document.querySelector('.busy-message-box-notice--masked');
    var top = confirmation || pop || (!overlay.hidden ? overlay : !$('memberDrawer').hidden ? $('memberDrawer') : null);
    if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (confirmation) confirmation.querySelector('.busy-notification__actions button').click(); else if (pop) BusyNative.closePopup(); else if (!overlay.hidden) requestClose(); else closeMembers(); return; }
    if (e.key === 'Tab') {
      var modal = confirmation || (!overlay.hidden ? overlay : !$('memberDrawer').hidden ? $('memberDrawer') : top);
      var focusable = Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"], a[href]'));
      if (pop && pop !== modal) focusable = focusable.concat(Array.from(pop.querySelectorAll('[tabindex="0"],button:not([disabled]),input:not([disabled])')));
      focusable = focusable.filter(function (el) { return el.getClientRects().length > 0; });
      if (!focusable.length) return; var index = focusable.indexOf(document.activeElement);
      if (e.shiftKey && index <= 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); } else if (!e.shiftKey && (index < 0 || index === focusable.length - 1)) { e.preventDefault(); focusable[0].focus(); }
    }
  }, true);
  window.addEventListener('beforeunload', function (e) { if (editor && editor.dirty || projectDraft && projectDraft.editor.dirty) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('storage', function (e) { if (e.key === 'devhub-project-management-prototype-v1') { state = Store.read(); render(); if (editor) feedback('其它页面已更新配置。当前草稿保留，提交将复核冲突；请刷新后编辑', true); } });
  render(true);
  var params = new URLSearchParams(location.search);
  if (params.get('tab') === 'repos') switchTab('repos');
  if (params.has('projectId')) openMembers(Number(params.get('projectId')));
})();
