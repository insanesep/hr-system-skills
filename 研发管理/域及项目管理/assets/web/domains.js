(function () {
  'use strict';
  const U=PMUI, D=U.D, { esc, button, state, link, table, panel, field, input, select }=U;
  const listUrl=new URL('domains-projects.html',location.href).href;
  const membersUrl=new URL('member-list.html',D.base).href;
  const page=document.body.dataset.page;
  let selected=U.params.get('domain')||'d3', filter={query:'',source:'',status:'',owner:''}, projectFilter='', projectStatus='', projectSource='', projectOwner='', syncing=false;
  const name=id=>U.userName(id);
  const ownerLink=id=>id?link(name(id),D.memberUrl(id)):'未指定';
  const projects=d=>D.data.projects.filter(p=>p.domain===d.id);
  function timeline(o){return table(['时间','操作人','变更内容'],o.logs.map(x=>[esc(x.time),esc(x.operator),esc(x.text)]),'暂无本次演示变更');}
  function domainRows(ds){return ds.map(d=>[link(d.name,D.domainUrl(d.id)),U.repo(d.repo),ownerLink(d.owner),state(d.state),state(d.source),`<span class="u-mono">${projects(d).length}</span>`,esc(d.updated),`<div class="tpl-row-actions">${button(selected===d.id?'已选择':'选择项目','select-domain','is-link',`data-id="${d.id}"`)}${link('查看',D.domainUrl(d.id))}${!U.readOnly?button('配置','edit-domain','is-link',`data-id="${d.id}"`):''}</div>`]);}
  function projectRows(ps){return ps.map(p=>{const d=D.domain(p.domain);return [link(p.name,D.projectUrl(p.id)),esc(p.name)+'/ ',p.owners.map(o=>ownerLink(o.member)+' '+U.tag(o.role)).join('<br>')||'未指定',ownerLink(d.owner),p.mappings.map(m=>link(D.domain(m.domain).name,D.domainUrl(m.domain))+' / '+esc(m.path)).join('<br>')||'无已确认映射',state(p.state)+(D.effectiveDomain(d)?'':' '+U.tag('所属域未生效')),state(p.source)+'<div class="u-sub">'+esc(p.updated)+'</div>',`<div class="tpl-row-actions">${link('查看',D.projectUrl(p.id))}${!U.readOnly?button('配置','edit-project','is-link',`data-id="${p.id}"`):''}</div>`];});}
  function list(){
    U.nav('域及项目管理',membersUrl,button('刷新','refresh')+(U.readOnly?'':button('同步代码仓结构','sync','busy-button--primary','id="sync-structure"')));
    if(U.readState(list))return;
    document.getElementById('page-content').innerHTML=`<section class="tpl-panel"><div class="tpl-filter">${field('domain-query','域 / 仓关键字',input('domain-query',filter.query,'域名或代码仓名称'))}${field('domain-status','业务状态',select('domain-status','全部'))}<div class="tpl-filter__actions">${button('查询','query','busy-button--primary','id="filterQuery"')}${button('重置','reset','','id="filterReset"')}${button('展开筛选','expand','is-link')}</div><div class="tpl-filter__item--wide" id="more-filters" hidden><div class="tpl-filter">${field('domain-source','来源状态',select('domain-source','全部'))}${field('domain-owner','域负责人',select('domain-owner','全部',true))}</div></div></div></section><section class="tpl-panel" id="domain-results"></section><section class="tpl-panel"><div class="tpl-toolbar"><div class="tpl-toolbar__left"><b class="tpl-toolbar__title" id="project-heading">一级目录项目</b></div></div><div class="tpl-filter">${field('project-query','项目名称',input('project-query',projectFilter,'仅筛选当前域项目'))}${field('project-status','项目状态',select('project-status','全部'))}${field('project-source','来源状态',select('project-source','全部'))}${field('project-owner-filter','项目负责人',select('project-owner-filter','全部',true))}<div class="tpl-filter__actions">${button('查询项目','query-project','busy-button--primary')}${button('重置项目','reset-project')}</div></div><div id="project-results"></div></section><section class="tpl-panel" id="sync-results"></section>`;
    U.options('domain-status',[{value:'',label:'全部'}].concat(['启用','停用']),filter.status);
    U.options('domain-source',[{value:'',label:'全部'}].concat(['已存在','未核验','已消失']),filter.source);
    U.options('project-status',[{value:'',label:'全部'}].concat(['启用','停用']),projectStatus);
    U.options('project-source',[{value:'',label:'全部'}].concat(['已存在','未核验','已消失']),projectSource);
    U.options('project-owner-filter',[{value:'',label:'全部'}].concat(D.data.members.map(m=>({value:m.id,label:D.user(m).name+' · '+D.user(m).code}))),projectOwner);
    U.options('domain-owner',[{value:'',label:'全部'}].concat(D.data.members.filter(D.valid).map(m=>({value:m.id,label:D.user(m).name+' · '+D.user(m).code}))),filter.owner);
    U.enhance(document.getElementById('page-content'));listResults();
  }
  function listResults(){
    const ds=U.params.get('state')==='empty'?[]:D.data.domains.filter(d=>(!filter.query||(d.name+' '+d.repo).includes(filter.query))&&(!filter.status||d.state===filter.status)&&(!filter.source||d.source===filter.source)&&(!filter.owner||d.owner===filter.owner));
    const e=document.getElementById('domain-results');e.innerHTML=`<div class="tpl-toolbar"><div class="tpl-toolbar__left"><b class="tpl-toolbar__title">代码仓域</b><span>当前查询 ${ds.length} 个 · 仓结构同步来源</span></div><div class="tpl-toolbar__right">${button('重置演示数据','reset-mock','is-link')}</div></div>`+table(['域','代码仓','唯一负责人','业务状态','来源状态','项目数','完整核验时间','操作'],domainRows(ds),'暂无同步域清单，先同步已批准范围；不提供手工新增');U.enhance(e);U.mockControls();projectResults();syncResults();
  }
  function projectResults(){
    const d=D.domain(selected), e=document.getElementById('project-results');const ps=d?projects(d).filter(p=>(!projectFilter||p.name.includes(projectFilter))&&(!projectStatus||p.state===projectStatus)&&(!projectSource||p.source===projectSource)&&(!projectOwner||p.owners.some(o=>o.member===projectOwner))):[];
    document.getElementById('project-heading').textContent=(d?d.name+' / ':'')+'一级目录项目';
    e.innerHTML=table(['项目','一级目录','负责人 / 职责','域负责人上级','实现映射','业务状态','来源与核验','操作'],projectRows(U.params.get('state')==='empty'?[]:ps),'当前域暂无匹配项目；清单只能从仓结构同步获取');U.enhance(e);
  }
  function syncResults(){const e=document.getElementById('sync-results');if(!e)return;const s=D.data.sync;e.innerHTML=`<div class="tpl-toolbar"><div class="tpl-toolbar__left"><b class="tpl-toolbar__title">最近结构同步</b>${state(s.state)}</div><span class="u-sub">${esc(s.updated)} · 基准 master · 离线模拟</span></div>`+table(['仓库域','阶段结果','失败原因'],s.rows.map(r=>[esc(D.domain(r.domain).name),state(r.result),esc(r.reason||'完整一级目录已读取')]));U.enhance(e);}
  function domainDetail(){
    const d=D.domain(U.params.get('id')||'d1');U.nav(d?d.name+'域':'域不存在',listUrl,d?button('责任配置','edit-domain','busy-button--primary',`data-id="${d.id}"`)+button(d.state==='启用'?'停用域':'启用域','toggle-domain','',`data-id="${d.id}"`):'');
    if(U.readState(domainDetail))return;if(!d){U.mount(panel('域不存在','<p>请返回同步清单核对域标识。</p>'));return;}
    document.getElementById('page-content').innerHTML=panel('域概览',`<div class="tpl-overview"><div class="tpl-overview__icon">${esc(d.name.slice(0,1))}</div><div class="tpl-overview__main"><div class="tpl-overview__name">${esc(d.name)}</div><div class="tpl-overview__codes">${U.repo(d.repo)} · ${esc(d.id)}</div><div class="chip-group">${state(d.state)}${state(d.source)}</div></div></div>`+U.descriptions([['唯一负责人',ownerLink(d.owner)],['负责人资格',esc(d.special==='架构'?'必须具有架构角色':d.special==='研发或设计'?'研发或设计均可':'有效产研人员')],['同步基准',esc(d.branch)],['完整核验时间',esc(d.updated)],['备注',esc(d.note||'无')],['管理边界','仓身份、名称和结构只读；新同步对象默认停用']]))+panel('子项目与责任',table(['项目','一级目录','负责人 / 职责','域负责人上级','实现映射','业务状态','来源与核验','操作'],projectRows(projects(d))))+panel('同步与变更',timeline(d)+`<p class="u-muted">${esc(D.data.sync.rows.find(x=>x.domain===d.id)?.reason||'上次完整结构已读取（模拟）')}</p>`);
    U.enhance(document.getElementById('page-content'));if(U.params.get('edit')==='1'){U.params.delete('edit');editDomain(d);}
  }
  function projectDetail(){
    const p=D.project(U.params.get('id')||'p3'),d=p?D.domain(p.domain):null;
    U.nav(p?p.name+' · 项目详情':'项目不存在',d?D.domainUrl(d.id):listUrl,p?button('项目配置','edit-project','busy-button--primary',`data-id="${p.id}"`)+button(p.state==='启用'?'停用项目':'启用项目','toggle-project','',`data-id="${p.id}"`):'');
    if(U.readState(projectDetail))return;if(!p){U.mount(panel('项目不存在','<p>请返回同步清单核对项目标识。</p>'));return;}
    document.getElementById('page-content').innerHTML=panel('项目概览',`<div class="tpl-overview"><div class="tpl-overview__icon">项</div><div class="tpl-overview__main"><div class="tpl-overview__name">${esc(p.name)}</div><div class="tpl-overview__codes">${esc(p.id)} · ${esc(p.name)}/ · ${U.repo(d.repo)}</div><div class="chip-group">${state(p.state)}${state(p.source)}${D.effectiveDomain(d)?'':U.tag('所属域未生效','warning')}</div></div></div>`+U.descriptions([['所属域',link(d.name,D.domainUrl(d.id))],['一级目录',esc(p.name)+'/'],['域负责人上级',ownerLink(d.owner)],['最近完整核验',esc(p.updated)],['备注',esc(p.note||'无')]]))+panel('负责人及项目上级',table(['负责人','工号','本项目职责','项目责任上级'],p.owners.map(o=>[ownerLink(o.member),esc(D.user(D.member(o.member)).code),U.tag(o.role),d.owner===o.member?'本人兼管':ownerLink(d.owner)]),'未任命负责人；项目启用前至少一名有效负责人'))+panel('确认实现映射',table(['实现仓','已确认范围','确认情况'],p.mappings.map(m=>[U.repo(D.domain(m.domain).repo),esc(m.path),state('已核验（模拟）')]),'无已确认执行映射；不按同名仓猜测范围'))+panel('项目变更记录',timeline(p));
    U.enhance(document.getElementById('page-content'));if(U.params.get('edit')==='1'){U.params.delete('edit');editProject(p);}
  }
  const currentRender=()=>page==='domains-projects'?list():page==='domain-detail'?domainDetail():projectDetail();
  function qualifies(d,m){return D.valid(m)&&(d.special==='架构'?m.roles.includes('架构'):d.special==='研发或设计'?m.roles.some(r=>['研发','设计'].includes(r)):true);}
  function editDomain(d){
    if(U.readOnly)return;
    U.dialog('域责任配置 · '+d.name,`<p class="u-muted">${U.repo(d.repo)} · 来源只读</p><p>负责人资格：${esc(d.special==='架构'?'架构':d.special==='研发或设计'?'研发或设计':'有效产研人员')}</p>${field('owner-choice','唯一域负责人',select('owner-choice','按姓名 / 工号查找',true),d.state==='启用')}${field('domain-note','备注',input('domain-note',d.note))}`,()=>U.options('owner-choice',[{value:'',label:'未指定'}].concat(D.data.members.filter(D.valid).map(m=>({value:m.id,label:D.user(m).name+' · '+D.user(m).code+' / '+m.roles.join('、'),disabled:!qualifies(d,m)}))),d.owner),async()=>{
      const id=U.values('owner-choice');if((id&&!qualifies(d,D.member(id)))||(!id&&d.state==='启用'))throw new Error('请选择满足该域资格的唯一有效负责人。');
      if(id!==d.owner&&!await U.N.confirm('更换域负责人将改变子项目责任上级；历史审批和经办不回写。确认保存？','更换域负责人'))return false;
      await U.wait(250);d.owner=id;d.note=document.getElementById('domain-note').value.trim();D.log(d,'域责任配置已更新');D.data.members.forEach(D.replan);U.commit();U.N.message('域责任配置已保存（模拟）');currentRender();
    });
  }
  function editProject(p){
    if(U.readOnly)return;
    let owners=structuredClone(p.owners),mappings=structuredClone(p.mappings);
    const ownerRows=()=>table(['负责人 / 工号','本项目职责','操作'],owners.map((o,i)=>[esc(name(o.member))+' · '+esc(D.user(D.member(o.member)).code),U.tag(o.role),button('移除','remove-owner','is-link',`data-index="${i}"`)]),'尚未选择负责人');
    const mappingRows=()=>table(['实现仓','确认路径','操作'],mappings.map((m,i)=>[U.repo(D.domain(m.domain).repo),esc(m.path),button('移除','remove-mapping','is-link',`data-index="${i}"`)]),'暂无已确认映射');
    const box=U.dialog('项目配置 · '+p.name,`<p class="u-muted">${esc(D.domain(p.domain).name)} / ${esc(p.name)}（同步来源只读）</p><div id="owner-rows">${ownerRows()}</div><div class="tpl-filter">${field('project-owner','增加负责人',select('project-owner','有效产研人员',true))}${field('owner-role','本项目职责',select('owner-role'))}</div>${button('添加负责人','add-owner','is-plain')}<hr class="tpl-divider"><div id="mapping-rows">${mappingRows()}</div><div class="tpl-filter">${field('mapping-domain','实现仓',select('mapping-domain','选择已同步代码仓'))}${field('mapping-path','确认范围',select('mapping-path','选择已读取范围'))}</div>${button('添加实现映射','add-mapping','is-plain')}${field('project-note','备注',input('project-note',p.note))}`,()=>{
      U.options('project-owner',D.data.members.filter(D.valid).map(m=>({value:m.id,label:name(m.id)+' · '+D.user(m).code})), '', id=>{const x=document.getElementById('owner-role');x._nativeSelect.options=(D.member(id)?.roles||[]).map(r=>({value:r,label:r}));x._setValue(D.member(id)?.roles[0]||'');});U.options('owner-role',D.roles,'');
      U.options('mapping-domain',D.data.domains.map(d=>({value:d.id,label:d.name+' / '+d.repo,disabled:d.source!=='已存在'})),'',id=>{const x=document.getElementById('mapping-path');x._nativeSelect.options=[{value:'/',label:'全仓（须确认用途）'}].concat(D.data.projects.filter(p=>p.domain===id&&p.source==='已存在').map(p=>({value:p.name,label:p.name+'/'})));x._setValue('');});U.options('mapping-path',[],'');
    },async()=>{
      if(p.state==='启用'&&!owners.length)throw new Error('启用项目必须至少一名有效负责人。');
      if(owners.some(o=>!D.valid(D.member(o.member))||!D.member(o.member).roles.includes(o.role)))throw new Error('负责人已失效或职责不属于该人员，请核对。');
      if(!await U.N.confirm('保存责任与确认实现范围；历史流程不变，关联实现仓不会自动开个人权限。','确认项目配置'))return false;
      await U.wait(250);p.owners=owners;p.mappings=mappings;p.note=document.getElementById('project-note').value.trim();D.log(p,'项目负责人及执行映射已更新');D.data.members.forEach(D.replan);U.commit();U.N.message('项目配置已保存（模拟）');currentRender();
    });
    if(!box)return;
    box.addEventListener('click',async e=>{
      const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;const err=box.querySelector('#modal-error');
      const fail=text=>{err.hidden=false;err.textContent=text;};
      if(action==='add-owner'){const id=U.values('project-owner'),role=U.values('owner-role');if(!id||!role||!D.member(id)?.roles.includes(role))return fail('请选择有效人员及对应职责。');if(owners.some(o=>o.member===id))return fail('同一负责人不重复，请先移除再调整职责。');owners.push({member:id,role});}
      if(action==='remove-owner')owners.splice(Number(b.dataset.index),1);
      if(action==='add-mapping'){const id=U.values('mapping-domain'),path=U.values('mapping-path');if(!id||!path)return fail('请选择来源已核验的实现仓及确认范围。');if(mappings.some(m=>m.domain===id&&m.path===path))return fail('相同实现范围已存在。');if(path==='/'&&!await U.N.confirm('确认该项目需整个实现仓的事实？这不会产生个人仓授权。','全仓映射'))return;mappings.push({domain:id,path});}
      if(action==='remove-mapping')mappings.splice(Number(b.dataset.index),1);
      if(['add-owner','remove-owner','add-mapping','remove-mapping'].includes(action)){err.hidden=true;const a=box.querySelector('#owner-rows'),c=box.querySelector('#mapping-rows');a.innerHTML=ownerRows();c.innerHTML=mappingRows();U.enhance(a);U.enhance(c);box.dispatchEvent(new Event('input',{bubbles:true}));}
    });
  }
  function toggle(o,isProject){
    if(U.readOnly)return;const next=o.state==='启用'?'停用':'启用',label=(isProject?'项目':'域');
    U.dialog(next+label+' · '+o.name,`<p>${next==='停用'?'停止新业务消费，历史资料保留；人员权限关闭仍须单独核验。':'检查来源及有效负责人；不会开启报告触发、自动修复或发布权限。'}</p>${field('toggle-reason','变更原因',input('toggle-reason'),next==='停用')}`,null,async()=>{
      if(next==='停用'&&!document.getElementById('toggle-reason').value.trim())throw new Error('请填写停用原因。');
      if(next==='启用'&&(o.source!=='已存在'||(!isProject&&!qualifies(o,D.member(o.owner)))||(isProject&&(!D.effectiveDomain(D.domain(o.domain))||!o.owners.some(x=>D.valid(D.member(x.member)))))))throw new Error('来源未核验、所属域未生效或缺少满足资格的负责人，不能启用。');
      await U.wait(200);o.state=next;D.log(o,next+label+'：'+(document.getElementById('toggle-reason').value||'确认启用'));D.data.members.forEach(D.replan);U.commit();U.N.message(label+'已'+next+'（模拟）');currentRender();
    },'确认'+next);
  }
  async function sync(el){
    if(syncing||U.readOnly)return;if(!await U.N.confirm('同步已批准演示仓结构，基准master。仅模拟读取，新发现项目默认停用，不自动任命或授权。','同步结构'))return;
    syncing=true;U.loading(el,true);D.data.sync.state='执行中';D.data.sync.updated=D.now();syncResults();await U.wait(500);
    const partial=U.params.get('sync')==='partial'||U.params.get('network')==='fail';
    D.data.sync.rows=D.data.domains.map(d=>{if(d.id==='d5'&&partial)return {domain:d.id,result:'失败',reason:'模拟完整目录读取失败；旧结构与时间保留'};d.source='已存在';d.updated=D.now();projects(d).forEach(p=>{p.source='已存在';p.updated=d.updated;});return {domain:d.id,result:'全部成功'};});
    if(!D.project('p8'))D.data.projects.push({id:'p8',domain:'d2',name:'templates',owners:[],state:'停用',source:'已存在',updated:D.now(),mappings:[],note:'结构同步新发现，默认停用',logs:[]});
    D.data.sync.state=partial?'部分失败':'全部成功';D.data.sync.updated=D.now();U.commit();syncing=false;U.loading(el,false);listResults();U.N.message(partial?'部分仓读取失败，旧有效结构保留（模拟）':'结构模拟同步完成；新项目仍停用');
  }
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
    if(a==='query'){filter={query:document.getElementById('domain-query').value.trim(),status:U.values('domain-status'),source:U.values('domain-source'),owner:U.values('domain-owner')};U.loading(b,true);await U.wait(150);listResults();U.loading(b,false);}
    if(a==='reset'){filter={query:'',status:'',source:'',owner:''};projectFilter='';U.params.delete('state');list();}
    if(a==='expand'){const x=document.getElementById('more-filters');x.hidden=!x.hidden;b.textContent=x.hidden?'展开筛选':'收起筛选';b.setAttribute('aria-expanded',String(!x.hidden));}
    if(a==='query-project'){projectFilter=document.getElementById('project-query').value.trim();projectStatus=U.values('project-status');projectSource=U.values('project-source');projectOwner=U.values('project-owner-filter');projectResults();}
    if(a==='reset-project'){projectFilter='';projectStatus='';projectSource='';projectOwner='';document.getElementById('project-query').value='';['project-status','project-source','project-owner-filter'].forEach(id=>document.getElementById(id)._setValue(''));projectResults();}
    if(a==='refresh')list();if(a==='select-domain'){selected=b.dataset.id;history.replaceState(null,'','?domain='+encodeURIComponent(selected));listResults();}
    if(a==='edit-domain')editDomain(D.domain(b.dataset.id));if(a==='edit-project')editProject(D.project(b.dataset.id));
    if(a==='toggle-domain')toggle(D.domain(b.dataset.id),false);if(a==='toggle-project')toggle(D.project(b.dataset.id),true);if(a==='sync')sync(b);
  });
  currentRender();
})();
