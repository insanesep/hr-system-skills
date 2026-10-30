(function () {
  'use strict';
  const D = PMData, N = BusyNative;
  const params = new URLSearchParams(location.search);
  const readOnly = params.get('mode') === 'readonly';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const button = (label, action, variant = '', attrs = '') => `<button type="button" class="busy-button ${variant}" data-action="${esc(action)}" ${attrs}><span>${esc(label)}</span></button>`;
  const tag = (text, type = 'info') => `<span class="busy-tag busy-tag--${type} is-plain">${esc(text)}</span>`;
  const state = text => tag(text, /已达|启用|已存在|全部成功/.test(text) ? 'success' : /失败|消失/.test(text) ? 'danger' : /待|未核验|部分/.test(text) ? 'warning' : 'info');
  const link = (text, href) => `<a href="${esc(href)}">${esc(text)}</a>`;
  const userName = id => { const m = D.member(id); return m ? D.user(m).name : '未指定'; };
  const rolesHtml = list => `<span class="chip-group">${list.map(r => tag(r, r === '产品' ? 'primary' : r === '架构' ? 'warning' : 'info')).join('')}</span>`;
  const repo = name => esc(name).replace(/-/g, '-<wbr>');
  function field(id, label, control, required = false, wide = false) {
    return `<div class="busy-form-item ${required ? 'is-required' : ''} ${wide ? 'tpl-filter__item--wide' : ''}" data-field="${esc(id)}"><label class="busy-form-item__label" for="${esc(id)}">${esc(label)}</label><div class="busy-form-item__content">${control}<div class="busy-form-item__error" hidden></div></div></div>`;
  }
  const input = (id, value = '', placeholder = '') => `<div class="busy-input"><input id="${esc(id)}" value="${esc(value)}" placeholder="${esc(placeholder)}" type="text"></div>`;
  const select = (id, placeholder = '请选择', filterable = false) => `<div id="${esc(id)}" class="busy-select" data-filterable="${filterable}"><input readonly placeholder="${esc(placeholder)}"></div>`;
  function options(id, data, value = '', change) { const el = document.getElementById(id); if (el) N.select(el, data, value, change); }
  function values(id) { return document.getElementById(id)?.dataset.value || ''; }
  function checks(id, list, selected = []) {
    return `<div class="busy-checkbox-group" id="${esc(id)}">${list.map(x => { const v = typeof x === 'string' ? x : x.value, t = typeof x === 'string' ? x : x.label; return `<label class="busy-checkbox ${selected.includes(v) ? 'is-checked' : ''}" data-value="${esc(v)}"><span class="busy-checkbox__inner"></span>${esc(t)}</label>`; }).join('')}</div>`;
  }
  function checked(id) { return [...document.querySelectorAll('#' + id + ' .is-checked[data-value]')].map(x => x.dataset.value); }
  function table(heads, rows, empty = '暂无符合条件的记录') {
    return rows.length ? `<div class="tpl-table-wrap"><table class="busy-table"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<div class="busy-empty tpl-native-state"><div class="busy-empty__description"><p>${esc(empty)}</p></div></div>`;
  }
  const descriptions = pairs => `<table class="busy-descriptions">${pairs.map(([k,v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('')}</table>`;
  const panel = (title, content) => `<section class="tpl-panel"><div class="tpl-section__head">${esc(title)}</div>${content}</section>`;
  function tabs(items, active) { return `<div class="busy-tabs" id="page-tabs">${items.map(([id,label]) => `<div class="busy-tabs__item ${active === id ? 'is-active' : ''}" data-tab="${esc(id)}">${esc(label)}</div>`).join('')}</div>`; }
  function bindTabs(callback) { document.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => { const u = new URL(location.href); u.searchParams.set('tab', t.dataset.tab); history.replaceState(null, '', u); callback(t.dataset.tab); })); }
  function enhance(root = document) { N.enhance(root); }
  function error(id, text) {
    const el = document.querySelector(`[data-field="${id}"]`); if (!el) return;
    el.classList.toggle('is-error', !!text); const e = el.querySelector('.busy-form-item__error'); e.hidden = !text; e.textContent = text;
    if (text) { el.scrollIntoView({ block: 'center' }); el.querySelector('input')?.focus(); }
  }
  function notice(text, type = 'warning') { const e = document.getElementById('page-feedback'); e.hidden = false; e.className = 'tpl-panel u-' + type; e.textContent = text; }
  function loading(el, value) { if (!el) return; el.disabled = value; el.classList.toggle('is-loading', value); el.setAttribute('aria-busy', String(value)); }
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  function commit() { if (!D.save()) { notice('浏览器未允许保存原型数据，本页操作未跨页持久化。', 'danger'); return false; } return true; }
  function nav(label, back, actions = '') {
    document.getElementById('page-title').textContent = label;
    const a = document.getElementById('page-back'); a.href = back; a.textContent = '返回列表';
    document.getElementById('page-actions').innerHTML = readOnly ? tag('仅可查看') : actions;
  }
  function mount(content) { document.getElementById('page-content').innerHTML = content; enhance(document.getElementById('page-content')); }
  let modal = null;
  function dialog(title, html, init, submit, confirmText = '保存', config = {}) {
    if (modal) return;
    N.closePopup(); const prior = document.activeElement;
    const overlay = document.createElement('div'); overlay.className = 'busy-overlay';
    overlay.innerHTML = `<div class="busy-overlay-dialog"><section class="busy-dialog busy-dialog--small" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="busy-dialog__header"><div class="dialog-header"><div class="dialog-title">${esc(title)}</div>${button('关闭', 'close-modal', 'is-link busy-dialog__close', 'aria-label="关闭弹窗"')}</div></header><div class="busy-dialog__body"><div class="dialog-content tpl-section">${html}<p id="modal-error" class="u-danger" role="alert" hidden></p></div></div><footer class="busy-dialog__footer"><div class="busy-dialog__actions">${button('取消', 'close-modal')}${button(confirmText, 'submit-modal', 'busy-button--primary')}</div></footer></section></div>`;
    document.body.append(overlay); modal = overlay; let dirty = false, busy = false;
    const close = async () => {
      if (busy) return;
      N.closePopup(); if (config.guardChanges !== false && dirty && !await N.confirm('有未保存的修改，是否放弃？', '放弃修改')) return;
      overlay.remove(); modal = null; document.removeEventListener('keydown', escape, true); prior?.focus();
    };
    const escape = e => {
      if (document.querySelector('.busy-message-box__mask')) return;
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (document.querySelector('.busy-popper')) N.closePopup(); else close();
      }
      if (e.key === 'Tab' && !document.querySelector('.busy-popper')) {
        const targets = [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href],[tabindex="0"]')].filter(x => x.getClientRects().length);
        const first = targets[0], last = targets.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    overlay.addEventListener('input', () => dirty = true); overlay.addEventListener('native-change', () => dirty = true);
    overlay.querySelectorAll('[data-action="close-modal"]').forEach(b => b.onclick = close);
    overlay.querySelector('[data-action="submit-modal"]').onclick = async function () {
      if (busy) return;
      const err = overlay.querySelector('#modal-error'); err.hidden = true;
      try { busy = true; loading(this, true); const result = await submit(); if (result === false) return; dirty = false; busy = false; await close(); } catch (e) { err.hidden = false; err.textContent = e.message; } finally { busy = false; if (this.isConnected) loading(this, false); }
    };
    init?.(overlay); enhance(overlay); overlay.querySelector('input,button')?.focus(); document.addEventListener('keydown', escape, true);
    return overlay;
  }
  function mockControls() {
    document.querySelectorAll('[data-action="reset-mock"]').forEach(b => b.onclick = async () => {
      if (await N.confirm('重置这两个功能的离线演示数据？不影响真实系统。', '重置演示数据')) { try { localStorage.removeItem(D.key); location.href = location.pathname; } catch (_) { notice('演示数据重置失败。', 'danger'); } }
    });
  }
  function actionAttrs(action, id) { return `data-id="${esc(id)}"`; }
  function more(anchor, items) {
    const list = document.createElement('div'); list.className = 'busy-select-dropdown';
    list.innerHTML = `<ul class="busy-select-dropdown__list">${items.map(([a,l]) => `<li class="busy-select-dropdown__item" role="menuitem" tabindex="0" data-action="${esc(a)}" data-id="${esc(anchor.dataset.id)}">${esc(l)}</li>`).join('')}</ul>`;
    N.popup(anchor, list, 'busy-select__popper');
    list.querySelectorAll('[role="menuitem"]').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') i.click(); }));
  }
  function readState(render) {
    const target = document.getElementById('page-content');
    if (params.get('state') === 'error') { target.innerHTML = panel('读取失败', '<p class="u-danger" role="alert">模拟数据源读取失败，未将失败解释为空清单。</p>' + button('重新加载', 'retry-load')); target.querySelector('button').onclick = () => { params.delete('state'); render(); }; enhance(target); return true; }
    if (params.get('state') === 'loading') { target.innerHTML = panel('加载中', '<div class="tpl-native-state" role="status" aria-busy="true">正在读取人员、责任与仓库结构…</div>'); return true; }
    return false;
  }
  window.PMUI = { D, N, params, readOnly, esc, button, tag, state, link, userName, rolesHtml, repo, field, input, select, options, values, checks, checked, table, descriptions, panel, tabs, bindTabs, enhance, error, notice, loading, wait, commit, nav, mount, dialog, mockControls, actionAttrs, more, readState };
})();
