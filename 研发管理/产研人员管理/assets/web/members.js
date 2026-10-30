(function () {
  'use strict';
  const U = PMUI, D = U.D;
  const { esc, button, state, link, table, panel, field, input, select } = U;
  const listUrl = new URL('member-list.html', D.base).href;
  const domainList = new URL('../../../域及项目管理/assets/web/domains-projects.html', D.base).href;
  const formUrl = id => new URL('member-form.html' + (id ? '?id=' + encodeURIComponent(id) : ''), D.base).href;
  const newFormUrl = id => new URL('member-form.html?userId=' + encodeURIComponent(id), D.base).href;
  const page = document.body.dataset.page;
  let dirty = false, saving = false, initialForm = '', boundPublicUser = null;
  let filter = { query: '', role: '', status: '', domain: '', project: '', grant: '' }, pageIndex = 1;
  const memberName = m => `${D.user(m).name} · ${D.user(m).code}`;
  const report = m => D.valid(m) ? '已自动纳入' : '未纳入';
  const grantSummary = m => { const a = D.data.grants.filter(g => g.member === m.id); return a.length ? a.map(g => state(g.state)).join(' ') : '无产品自动授权'; };
  const identityDimensions = [['aliyun', '阿里云身份'], ['qoder', 'Qoder身份'], ['wecom', '企业微信身份']];
  function filterScopes(m, id) { return D.scopes(m).some(s => s === id || D.project(s)?.domain === id); }
  const canAddUser = id => D.data.users.some(u=>u.id===id&&u.active) && !D.data.members.some(m=>m.user===id);
  function pickGroupUser() {
    if(U.readOnly)return;
    let selected='',searchedName='',matches=[],searchVersion=0;
    U.dialog('新增人员 · 搜索集团人员',`<p class="u-muted">输入完整姓名精确搜索集团人员；已有产研档案（含禁用、已删除）不再展示。</p><div class="tpl-filter">${field('group-user-name','姓名',input('group-user-name','','输入完整姓名'),true)}<div class="tpl-filter__actions">${button('搜索','search-group-user','busy-button--primary','id="search-group-user"')}</div></div><div id="group-user-results" role="status">请输入完整姓名后搜索。</div>`,box=>{
      const next=box.querySelector('[data-action="submit-modal"]'),nameInput=box.querySelector('#group-user-name'),results=box.querySelector('#group-user-results');next.disabled=true;
      function paint(){
        results.innerHTML=table(['选择','姓名','工号','部门'],matches.map(u=>[U.checks('group-choice-'+u.id,[{value:u.id,label:''}],selected===u.id?[u.id]:[]),esc(u.name),esc(u.code),esc(u.department)]),'暂无可新增人员，请核对完整姓名；已有人员与无效集团身份已过滤');
        U.enhance(results);next.disabled=!selected;
      }
      const search=async()=>{
        const name=nameInput.value.trim(),version=++searchVersion;selected='';matches=[];next.disabled=true;U.error('group-user-name','');
        if(!name){U.error('group-user-name','请输入完整姓名');results.textContent='请输入完整姓名后搜索。';return;}
        const searchButton=box.querySelector('#search-group-user');U.loading(searchButton,true);results.textContent='正在精确检索集团人员…';
        await U.wait(180);
        if(!box.isConnected||version!==searchVersion){U.loading(searchButton,false);return;}
        if(U.params.get('network')==='fail'){results.textContent='集团人员查询失败（模拟），请重试；不能将失败当作无人匹配。';U.loading(searchButton,false);return;}
        searchedName=name;matches=[...new Map(D.data.users.filter(u=>u.name===name&&canAddUser(u.id)).map(u=>[u.id,u])).values()];paint();U.loading(searchButton,false);
      };
      box.querySelector('#search-group-user').onclick=search;
      nameInput.addEventListener('input',()=>{searchVersion++;selected='';matches=[];next.disabled=true;results.textContent='姓名已改变，请重新搜索。';});
      nameInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search();}});
      box.addEventListener('native-change',e=>{const choice=e.target.closest('#group-user-results .busy-checkbox');if(!choice)return;selected=e.detail.checked?choice.dataset.value:'';paint();});
      queueMicrotask(()=>nameInput.focus());
    },async()=>{
      const name=document.getElementById('group-user-name').value.trim();
      if(!selected||name!==searchedName||!matches.some(u=>u.id===selected))throw new Error('请搜索并唯一勾选一名集团人员。');
      if(!canAddUser(selected))throw new Error('该人员已有产研档案或集团身份已失效，请重新搜索。');
      location.href=newFormUrl(selected);
    },'下一步',{guardChanges:false});
  }
  function list() {
    U.nav('产研人员管理', domainList, button('新增人员','add-member','busy-button--primary','id="add-member"'));
    if (U.readState(list)) return;
    try { filter = JSON.parse(sessionStorage.getItem('pm-member-filter')) || filter; } catch (_) {}
    if(filter.domain&&!D.domain(filter.domain)){filter.domain='';filter.project='';}
    if(filter.project&&D.project(filter.project)?.domain!==filter.domain)filter.project='';
    const filterHtml = `<section class="tpl-panel"><div class="tpl-filter">${field('filterQueryText','姓名或工号',input('filterQueryText',filter.query,'搜索姓名 / 工号'))}${field('filter-domain','域',select('filter-domain','全部域'))}${field('filter-project','项目',select('filter-project','请先选择域')+'<span id="project-cascade-hint" class="u-sub">请先选择域</span>')}${field('filter-role','角色',select('filter-role','全部'))}${field('filter-status','业务状态',select('filter-status','默认不含已删除'))}<div class="tpl-filter__actions">${button('查询','query','busy-button--primary','id="filterQuery"')}${button('重置','reset','','id="filterReset"')}${button('展开筛选','expand','is-link')}</div><div id="more-filters" class="tpl-filter__item--wide" hidden><div class="tpl-filter">${field('filter-grant','授权状态',select('filter-grant','全部'))}</div></div></div></section>`;
    document.getElementById('page-content').innerHTML = filterHtml + '<section class="tpl-panel" id="member-results"></section>';
    U.options('filter-role', [{value:'',label:'全部'}].concat(D.roles), filter.role);
    U.options('filter-status', [{value:'',label:'默认不含已删除'}].concat(['启用','禁用','已删除','全部历史']), filter.status);
    let selectedDomain=filter.domain;
    function syncProjectChoices(id,reset){
      const control=document.getElementById('filter-project'),projects=D.data.projects.filter(p=>p.domain===id);
      control._nativeSelect.options=[{value:'',label:id?'该域全部项目':'请先选择域'}].concat(projects.map(p=>({value:p.id,label:p.name})));
      control.classList.toggle('is-disabled',!id||!projects.length);
      const wrapper=control.querySelector('.busy-select__wrapper');wrapper.setAttribute('aria-disabled',String(!id||!projects.length));wrapper.tabIndex=id&&projects.length?0:-1;
      if(reset)control._setValue('');
      document.getElementById('project-cascade-hint').textContent=!id?'请先选择域':projects.length?'仅显示所选域下的项目':'该域暂无项目，可仅按域查询';
      U.error('filter-project','');
    }
    U.options('filter-domain', [{value:'',label:'全部域'}].concat(D.data.domains.map(d => ({value:d.id,label:d.name}))), filter.domain, id => {
      if(id!==selectedDomain){syncProjectChoices(id,true);selectedDomain=id;}
    });
    U.options('filter-project', [{value:'',label:filter.domain?'该域全部项目':'请先选择域'}].concat(D.data.projects.filter(p=>p.domain===filter.domain).map(p=>({value:p.id,label:p.name}))), filter.project);
    syncProjectChoices(filter.domain,false);
    U.options('filter-grant', [{value:'',label:'全部'}].concat(['已达目标','待同步','同步失败','待管理员处理']), filter.grant);
    U.enhance(document.getElementById('page-content')); listResults();
  }
  function listResults() {
    const rows = U.params.get('state') === 'empty' ? [] : D.data.members.filter(m => {
      const u = D.user(m), grants = D.data.grants.filter(g=>g.member===m.id);
      return (!filter.query || (u.name+' '+u.code+' '+m.display).includes(filter.query)) && (!filter.role || m.roles.includes(filter.role)) && (filter.status === '全部历史' || (filter.status ? m.state===filter.status : m.state!=='已删除')) && (!filter.domain || filterScopes(m,filter.domain)) && (!filter.project || D.scopes(m).includes(filter.project)) && (!filter.grant || grants.some(g=>g.state===filter.grant));
    });
    const totalPages = Math.max(1,Math.ceil(rows.length/5)); pageIndex = Math.min(pageIndex,totalPages);
    const current = rows.slice((pageIndex-1)*5,pageIndex*5);
    document.getElementById('member-results').innerHTML = `<div class="tpl-toolbar"><div class="tpl-toolbar__left"><b class="tpl-toolbar__title">人员名单</b><span>当前查询 ${rows.length} 人 · 按公共身份去重</span></div><div class="tpl-toolbar__right">${button('刷新','refresh')}${button('重置演示数据','reset-mock','is-link')}</div></div>` + table(['人员 / 工号','报告展示名','角色','业务状态','参与域 / 项目','负责人身份','仓授权','报告范围','最近变更','操作'], current.map(m=> {
      const scopes=D.scopes(m); const assignments=D.responsibilities(m);
      return [link(D.user(m).name,D.memberUrl(m.id))+'<div class="u-sub u-mono">'+esc(D.user(m).code)+'</div>',esc(m.display),U.rolesHtml(m.roles),state(m.state),scopes.map(id=>D.project(id)?link(D.domain(D.project(id).domain).name+' / '+D.project(id).name,D.projectUrl(id)):link(D.domain(id).name,D.domainUrl(id))).join('<br>') || '未配置',assignments.map(x=>link(x.name,x.url)).join('<br>')||'参与人',grantSummary(m),state(report(m)),esc(m.updated),`<div class="tpl-row-actions">${link('查看',D.memberUrl(m.id))}${!U.readOnly ? (m.state==='已删除'?button('恢复','restore','is-link',`data-id="${m.id}"`):link('编辑',formUrl(m.id))+button('更多','member-more','is-link',`data-id="${m.id}"`)):''}</div>`];
    }), '暂无符合条件的人员；可重置筛选查看名单') + `<div class="tpl-table-foot"><div class="busy-pagination"><span class="busy-pagination__total">共 ${rows.length} 条</span>${button('上一页','prev-page','','aria-label="上一页" '+(pageIndex===1?'disabled':''))}<span class="u-mono">${pageIndex} / ${totalPages}</span>${button('下一页','next-page','','aria-label="下一页" '+(pageIndex===totalPages?'disabled':''))}</div></div>`;
    U.enhance(document.getElementById('member-results')); U.mockControls();
  }
  function detail() {
    const m=D.member(U.params.get('id') || 'm2');
    U.nav(m?memberName(m):'人员不存在',listUrl,m&&m.state!=='已删除'?`<a class="busy-button busy-button--primary" href="${esc(formUrl(m.id))}">编辑人员</a>${button('更多操作','member-more','',`data-id="${m.id}"`)}`:m?button('恢复人员','restore','',`data-id="${m.id}"`):'');
    if(U.readState(detail)) return;
    if(!m){U.mount(panel('无法读取人员','<p>人员标识不存在，请返回列表。</p>'));return;}
    const tabs=[['projects','参与项目'],['permissions','代码仓权限'],['identity','身份映射']];
    const tab=tabs.some(([id])=>id===U.params.get('tab'))?U.params.get('tab'):'projects';
    const scopeRows=D.scopes(m).map(id=> {
      const p=D.project(id), d=D.domain(p?p.domain:id), owner=p?.owners.find(o=>o.member===m.id);
      return [link(d.name,D.domainUrl(d.id)),p?link(p.name,D.projectUrl(p.id)):'域级参与',p?state(p.state)+' '+state(p.source):state(d.state)+' '+state(d.source),esc(owner?owner.role+' · 项目负责人':d.owner===m.id?'域负责人':(m.scopeRoles[id]||'未指定身份')+' · 参与人'),p?(d.owner===m.id?'本人兼管':link(U.userName(d.owner),D.memberUrl(d.owner))):'不推定域上级'];
    });
    const grants=D.data.grants.filter(g=>g.member===m.id);
    document.getElementById('page-content').innerHTML= panel('人员概览',`<div class="tpl-overview"><div class="tpl-overview__icon">${esc(D.user(m).name.slice(0,1))}</div><div class="tpl-overview__main"><div class="tpl-overview__name">${esc(m.display)}</div><div class="tpl-overview__codes">${esc(D.user(m).code)} · 门户 ${esc(m.user)} · ${esc(D.user(m).department)}</div><div class="chip-group">${U.rolesHtml(m.roles)}${state(m.state)}${state(report(m))}</div></div></div>`+U.descriptions([['公共账号',state(D.user(m).active?'启用':'失效')],['报告纳入',esc(report(m))],['仓授权摘要',grantSummary(m)],['最近变更',esc(m.updated)]])) + `<section class="tpl-panel">${U.tabs(tabs,tab)}<hr class="tpl-divider"><div id="detail-tab-content"></div></section>`;
    U.enhance(document.getElementById('page-content'));
    function showTab(id) {
      const e=document.getElementById('detail-tab-content');
      if(id==='projects') e.innerHTML=table(['域','项目 / 一级目录','业务 / 来源状态','本人的职责','项目责任上级'],scopeRows,'尚未配置参与关系');
      if(id==='permissions') e.innerHTML='<p class="u-muted">产品仅自动取得普通分支读写；关闭须核验全部访问。以下为离线模拟结果。</p>'+table(['代码仓','目标权限','实际有效权限','授权来源','联动状态','差异与核验时间','操作'],grants.map(g=>[link(D.domain(g.domain).name,D.domainUrl(g.domain))+'<div class="u-sub">'+U.repo(D.domain(g.domain).repo)+'</div>',esc(g.target),esc(g.actual),esc(g.source),state(g.state),esc(g.detail||'')+'<div class="u-sub">'+esc(g.updated)+'</div>',!U.readOnly?button(g.state==='待管理员处理'?'处理后复核':'重试核验','retry-grant','is-link',`data-id="${m.id}" data-domain="${g.domain}"`):'仅可查看']),'无产品自动授权，其他角色不自动扩权');
      if(id==='identity') e.innerHTML=U.descriptions(identityDimensions.map(([key,label])=>[label,m.identities[key]?esc(m.identities[key])+'<div class="u-sub">已登记（模拟）；真实映射核验未接入</div>':'未维护']))+'<p class="u-muted">三个来源独立维护与判重；不从姓名或另一系统身份补造映射。</p>';
      U.enhance(e);
    }
    U.bindTabs(showTab); showTab(tab);
  }
  function qualification(m, nextRoles) {
    for(const d of D.data.domains.filter(x=>x.owner===m.id)) {
      if(d.special==='架构'&&!nextRoles.includes('架构')) return '公共域唯一负责人必须具有架构角色，请先交接。';
      if(d.special==='研发或设计'&&!nextRoles.some(r=>['研发','设计'].includes(r))) return '设计域负责人必须具有研发或设计角色，请先交接。';
    }
    for(const p of D.data.projects) for(const o of p.owners.filter(o=>o.member===m.id)) if(!nextRoles.includes(o.role))return '仍承担项目负责人职责：'+p.name+' / '+o.role+'，请先交接。';
    return '';
  }
  function memberForm() {
    const id=U.params.get('id'), m=id?D.member(id):null;
    boundPublicUser=m?D.user(m):D.data.users.find(u=>u.id===U.params.get('userId'));
    U.nav(id?'编辑人员':'编辑人员资料',id?D.memberUrl(id):listUrl);
    if(U.readState(memberForm))return;
    if(id&&!m){U.mount(panel('人员不存在','<p>无效人员标识。</p>'));return;}
    if(U.readOnly||m?.state==='已删除'){U.mount(panel('不可编辑','<p>当前记录只读，请返回列表。</p>'));return;}
    if(!m&&!boundPublicUser){U.mount(panel('请先选择集团人员','<p>从新增搜索弹窗精确检索并唯一勾选人员后进入本页。</p>'+button('搜索集团人员','add-member','busy-button--primary')));return;}
    if(!m&&!canAddUser(boundPublicUser.id)){const existing=D.data.members.find(x=>x.user===boundPublicUser.id);U.mount(panel('人员不可重复新增','<p>该人员已有产研档案或集团身份已失效，请返回列表核对。</p>'+(existing?link('查看已有人员',D.memberUrl(existing.id)):'')));return;}
    const scopes=m?.scopes||[], allScopes=D.data.domains.map(d=>({value:d.id,label:d.name+'域 · '+d.repo})).concat(D.data.projects.map(p=>({value:p.id,label:D.domain(p.domain).name+' / '+p.name})));
    const scopeRows=allScopes.map(s=>`<div class="tpl-filter__row">${U.checks('choice-'+s.value,[s],scopes)}${field('scope-role-'+s.value,'参与身份',select('scope-role-'+s.value,'先选择基本身份'),scopes.includes(s.value))}</div>`).join('');
    document.getElementById('page-content').innerHTML=panel('基本身份',`<p class="u-muted">新增默认禁用。公共身份只读引用，不新建门户账号。</p><div class="tpl-filter">${field('public-user','集团人员',esc(boundPublicUser.name+' · '+boundPublicUser.code),true)}${field('display-name','报告展示名',input('display-name',m?.display||boundPublicUser.name),true)}${field('member-roles','业务角色',U.checks('member-roles',D.roles,m?.roles||[]),true,true)}</div><div id="public-summary" class="u-muted">${esc(boundPublicUser.department)} · 公共账号${boundPublicUser.active?'有效':'失效'} · 门户标识 ${esc(boundPublicUser.id)}（只读）</div>`)+panel('身份映射',`<div class="tpl-filter">${identityDimensions.map(([key,label])=>field('identity-'+key,label,input('identity-'+key,m?.identities[key]||'','对应系统的账号标识'))).join('')}</div><p class="u-muted">按阿里云、Qoder、企业微信三个来源分别登记；不修改真实账号，不以手工填写当作核验成功。</p>`)+panel('参与域及项目',`<p class="u-muted">参与身份必须是基本业务角色的子集；先选择基本身份，再为已选域项目明确职责。负责人和上级只在域及项目管理维护。</p><div class="tpl-section" id="scope-choices">${scopeRows}</div><div class="tpl-footer-bar">${link('查看负责人任命与项目上级',domainList)}</div>`)+`<div class="tpl-actionbar"><div class="tpl-actionbar__inner"><span class="tpl-actionbar__hint">只保存离线演示资料，不执行真实授权</span>${button('取消','cancel-form')}${button('保存人员','save-member','busy-button--primary','id="save-member"')}</div></div>`;
    allScopes.forEach(s=>U.options('scope-role-'+s.value,m?.roles||[],m?.roles.includes(m.scopeRoles[s.value])?m.scopeRoles[s.value]:''));
    U.enhance(document.getElementById('page-content')); initialForm=formSnapshot(); dirty=false;
    document.getElementById('page-content').addEventListener('input',()=>dirty=formSnapshot()!==initialForm);
    document.getElementById('page-content').addEventListener('native-change',e=>{
      if(e.target.closest('#member-roles')) {
        const roles=U.checked('member-roles'); let firstInvalid='';
        allScopes.forEach(s=>{
          const control=document.getElementById('scope-role-'+s.value),previous=U.values(control.id);
          control._nativeSelect.options=roles.map(role=>({value:role,label:role}));
          if(previous&&!roles.includes(previous)) {
            control._setValue('');
            if(U.checked('choice-'+s.value).length&&!firstInvalid)firstInvalid=control.id;
          }
        });
        if(firstInvalid)U.error(firstInvalid,'基本身份已收窄，请重新选择参与身份或解除该关系。');
      }
      if(e.target.closest('#scope-choices .busy-checkbox')) {
        const id=e.target.closest('.busy-checkbox').dataset.value;
        document.querySelector(`[data-field="scope-role-${id}"]`).classList.toggle('is-required',U.checked('choice-'+id).length>0);
      }
      if(e.target.id?.startsWith('scope-role-')) {
        const id=e.target.id.slice('scope-role-'.length);
        if(U.checked('choice-'+id).length)U.error(e.target.id,U.checked('member-roles').includes(U.values(e.target.id))?'':'请选择属于基本身份的参与身份。');
      }
      dirty=formSnapshot()!==initialForm;
    });
    document.querySelectorAll('#display-name,[id^="identity-"]').forEach(e=>e.addEventListener('blur',()=>validateForm(m,false)));
  }
  function formSnapshot(){return JSON.stringify({ user:boundPublicUser?.id, display:document.getElementById('display-name')?.value, roles:U.checked('member-roles'), identities:identityDimensions.map(([key])=>[key,document.getElementById('identity-'+key)?.value]), scopes:[...document.querySelectorAll('#scope-choices .is-checked[data-value]')].map(e=>[e.dataset.value,U.values('scope-role-'+e.dataset.value)]) });}
  function validateForm(m, submit=true) {
    const userId=m?.user||boundPublicUser?.id, display=document.getElementById('display-name').value.trim(), roles=U.checked('member-roles');
    const identities=Object.fromEntries(identityDimensions.map(([key])=>[key,document.getElementById('identity-'+key).value.trim()]));
    const scopes=[...document.querySelectorAll('#scope-choices .is-checked[data-value]')].map(e=>e.dataset.value);
    const problems=[];
    if(!D.data.users.some(u=>u.id===userId&&u.active))problems.push(['public-user','集团人员身份已失效，请重新选择']);
    if(!m&&D.data.members.some(x=>x.user===userId))problems.push(['public-user','该人员已存在，请维护原档案，不可重复新增']);
    if(!display)problems.push(['display-name','请填写报告展示名']); if(!roles.length)problems.push(['member-roles','请至少选择一个基本业务身份']);
    identityDimensions.forEach(([key,label])=>{
      if(identities[key]&&D.data.members.some(x=>x.id!==m?.id&&x.identities[key]===identities[key]))problems.push(['identity-'+key,label+'已关联其他人员，请核对']);
    });
    if(m){const message=qualification(m,roles); if(message)problems.push(['member-roles',message]);}
    for(const id of scopes) {
      const p=D.project(id), d=D.domain(p?p.domain:id);
      if(!(p?D.effectiveProject(p):D.effectiveDomain(d))&&!m?.scopes.includes(id)) problems.push(['scope-role-'+id,'请选择来源有效且已启用的域项目']);
      if(!roles.includes(U.values('scope-role-'+id)))problems.push(['scope-role-'+id,'参与身份必须是基本身份的非空子集，请重新选择或解除关系']);
    }
    if(m?.state==='启用'&&roles.includes('产品')&&!identities.aliyun)problems.push(['identity-aliyun','启用产品必须维护阿里云身份，实际授权仍须核验']);
    if(m?.state==='启用'&&roles.includes('产品')&&!scopes.length)problems.push(['member-roles','启用产品须关联有效域项目']);
    ['public-user','display-name','member-roles',...identityDimensions.map(([key])=>'identity-'+key),...D.data.domains.map(d=>'scope-role-'+d.id),...D.data.projects.map(p=>'scope-role-'+p.id)].forEach(id=>U.error(id,''));
    if(problems.length){const [id,message]=problems[0];if(submit||document.getElementById(id)?.value)U.error(id,message); return null;}
    return {user:userId,display,roles,identities,scopes,scopeRoles:Object.fromEntries(scopes.map(id=>[id,U.values('scope-role-'+id)]))};
  }
  async function saveMember(el) {
    if(saving)return;const m=D.member(U.params.get('id'));const value=validateForm(m);if(!value)return;
    if(m&&m.roles.includes('产品')&&!await U.N.confirm('角色或参与范围变化将重算仓权限；退出的域要求全部访问关闭。确认保存？','保存人员'))return;
    saving=true;U.loading(el,true);await U.wait(250);
    if(U.params.get('network')==='fail'){U.notice('模拟保存失败。输入已保留，可重新提交。','danger');saving=false;U.loading(el,false);return;}
    if(!m&&!canAddUser(value.user)){U.error('public-user','该人员已存在或身份已失效，请返回列表重新选择');saving=false;U.loading(el,false);return;}
    let target=m;
    if(!target){target={id:'m'+Date.now(),state:'禁用',logs:[],updated:D.now()};D.data.members.push(target);}
    if(m&&m.identities.aliyun!==value.identities.aliyun) {
      D.log(m,'阿里云身份变更：'+(m.identities.aliyun||'未维护')+' → '+(value.identities.aliyun||'未维护'));
      D.data.grants.filter(g=>g.member===m.id).forEach(g=>{g.actual='未核验';g.source='身份变更待核验';g.state='待管理员处理';g.detail='原阿里云身份权限需单独核验，新身份不继承旧权限结果';g.updated='未取得';});
    }
    Object.assign(target,value);D.log(target,m?'人员角色、身份或参与关系已更新':'人员已建立，默认禁用');D.replan(target);
    if(U.commit()){dirty=false;U.N.message(m?'人员资料已保存；权限按最新目标核验':'人员已建立，当前禁用');await U.wait(1500);location.href=D.memberUrl(target.id);}saving=false;U.loading(el,false);
  }
  async function changeState(m, next) {
    U.N.closePopup();
    if(U.readOnly)return;
    const blockers=[];
    if(['禁用','已删除'].includes(next)){
      blockers.push(...D.data.domains.filter(d=>d.owner===m.id&&d.state==='启用').map(d=>({name:d.name+'域唯一负责人',url:D.domainUrl(d.id,true)})));
      blockers.push(...D.data.projects.filter(p=>p.state==='启用'&&p.owners.some(o=>o.member===m.id)&&!p.owners.some(o=>o.member!==m.id&&D.valid(D.member(o.member)))).map(p=>({name:p.name+'项目唯一有效负责人',url:D.projectUrl(p.id,true)})));
      blockers.push(...D.data.work.filter(w=>w.member===m.id&&w.state==='待交接').map(w=>({name:w.title,url:''})));
    }
    const label={'启用':'启用','禁用':'禁用','已删除':'删除'}[next];
    const grantDomains=[...new Set(D.targetDomains(m).concat(D.data.grants.filter(g=>g.member===m.id).map(g=>g.domain)))];
    U.dialog(label+'人员 · '+m.display,`<p>${next==='启用'?'启用后自动进入报告人员范围；产品只开普通分支读写。':'业务准入和报告名单立即收口；仓权限须核验全部访问关闭，历史仍保留。'}</p><p>涉及代码仓：${grantDomains.map(id=>esc(D.domain(id).repo)).join('、')||'无产品自动授权仓'}</p>`+(blockers.length?`<div class="u-danger" role="alert">请先完成交接</div><ul>${blockers.map(x=>`<li>${x.url?link(x.name,x.url):esc(x.name)}</li>`).join('')}</ul>`:'<p>本次无阻断交接事项。</p>')+field('state-reason','变更原因',input('state-reason','','填写启禁或删除原因'),next!=='启用'),null,async()=>{
      if(blockers.length)throw new Error('仍有未完成交接，不能使工作无责任主体。');
      if(next!=='启用'&&!document.getElementById('state-reason').value.trim())throw new Error('请填写变更原因。');
      if(next==='启用'&&(!D.user(m).active||!m.roles.length))throw new Error('公共身份或角色无效，无法启用。');
      if(next==='启用'&&m.scopes.some(id=>!m.roles.includes(m.scopeRoles[id])))throw new Error('参与身份不属于基本身份，请先编辑人员参与关系。');
      if(next==='启用'&&qualification(m,m.roles))throw new Error(qualification(m,m.roles));
      if(next==='启用'&&m.roles.includes('产品')&&(!m.identities.aliyun||!D.scopes(m).some(id=>D.project(id)?D.effectiveProject(D.project(id)):D.effectiveDomain(D.domain(id)))))throw new Error('启用产品需有效域归属与阿里云身份；实际授权仍须核验。');
      await U.wait(250);m.state=next;D.log(m,label+'人员：'+(document.getElementById('state-reason').value.trim()||'确认启用'));D.replan(m);U.commit();U.N.message('人员已'+label+'；权限结果仍须核验');if(page==='member-list')listResults();else if(next==='已删除')location.href=listUrl;else detail();
    },'确认'+label);
  }
  async function retryGrant(m, domainId, el) {
    if(!await U.N.confirm('只模拟核验最新目标，不改变真实代码仓。仍有继承权限时不会标记全部关闭。','仓权限核验'))return;
    const g=D.data.grants.find(x=>x.member===m.id&&x.domain===domainId);U.loading(el,true);g.state='同步中';U.commit();await U.wait(500);
    D.replan(m);g.updated=D.now();
    if(U.params.get('network')==='fail'){g.state='同步失败';g.detail='模拟外部读取失败，未取得完整权限事实';}
    else if(g.source==='身份变更待核验'){g.state='待管理员处理';g.actual='未核验';g.detail='原阿里云身份权限及新身份映射尚未核验，不沿用旧授权成功结果';}
    else if(g.target==='全部访问关闭'&&g.source==='代码组继承'){g.state='待管理员处理';g.actual='只读';g.detail='仍有代码组继承访问；关闭未完成，不能修改共享组影响其他人员';}
    else{g.actual=g.target==='全部访问关闭'?'无访问':g.target;g.state='已达目标';g.source=g.actual==='无访问'?'直接/继承均未发现访问（模拟）':'直接成员';g.detail='最新权限目标已核验（离线模拟）';}
    U.commit();D.log(m,'代码仓权限模拟核验：'+g.state);U.commit();detail();
  }
  document.addEventListener('click',async e=>{
    const a=e.target.closest('[data-action]');if(!a)return;const action=a.dataset.action;
    if(action==='query'){
      const domain=U.values('filter-domain'),project=U.values('filter-project');
      if(project&&(!domain||D.project(project)?.domain!==domain)){U.error('filter-project','项目不属于当前域，请重新选择项目');return;}
      U.error('filter-project','');
      filter={query:document.getElementById('filterQueryText').value.trim(),role:U.values('filter-role'),status:U.values('filter-status'),domain,project,grant:U.values('filter-grant')};
      try{sessionStorage.setItem('pm-member-filter',JSON.stringify(filter));}catch(_){}
      pageIndex=1;U.loading(a,true);await U.wait(150);listResults();U.loading(a,false);
    }
    if(action==='reset'){filter={query:'',role:'',status:'',domain:'',project:'',grant:''};try{sessionStorage.removeItem('pm-member-filter');}catch(_){}pageIndex=1;U.params.delete('state');list();}
    if(action==='expand'){const x=document.getElementById('more-filters');x.hidden=!x.hidden;a.textContent=x.hidden?'展开筛选':'收起筛选';a.setAttribute('aria-expanded',String(!x.hidden));}
    if(action==='prev-page'){pageIndex--;listResults();}if(action==='next-page'){pageIndex++;listResults();}if(action==='refresh')listResults();
    const m=D.member(a.dataset.id);
    if(action==='member-more'&&m)U.more(a,[[m.state==='启用'?'disable':'enable',m.state==='启用'?'禁用人员':'启用人员'],['delete','删除人员']]);
    if(action==='enable'&&m)changeState(m,'启用');if(action==='disable'&&m)changeState(m,'禁用');if(action==='delete'&&m)changeState(m,'已删除');
    if(action==='restore'&&m&&await U.N.confirm('恢复原身份与历史关联，状态为禁用。确认恢复？','恢复人员')){m.state='禁用';D.log(m,'恢复为禁用');U.commit();location.href=D.memberUrl(m.id);}
    if(action==='retry-grant'&&m)retryGrant(m,a.dataset.domain,a);
    if(action==='add-member')pickGroupUser();
    if(action==='save-member')saveMember(a);
    if(action==='cancel-form'&&(!dirty||await U.N.confirm('有未保存的人员修改，是否放弃？','离开表单'))){dirty=false;location.href=U.params.get('id')?D.memberUrl(U.params.get('id')):listUrl;}
  });
  document.addEventListener('click',async e=>{if(page!=='member-form'||!dirty||saving)return;const a=e.target.closest('a[href]');if(a){e.preventDefault();if(await U.N.confirm('有未保存的人员修改，是否放弃？','离开表单')){dirty=false;location.href=a.href;}}});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  if(page==='member-list')list();else if(page==='member-form')memberForm();else detail();
})();
