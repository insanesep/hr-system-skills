(function () {
  'use strict';

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  function toast(message, type) {
    var host = $('#toastHost');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'err' ? ' err' : '');
    el.textContent = message;
    host.appendChild(el);
    window.setTimeout(function () { el.remove(); }, 2600);
  }

  function openDrawer(title, sub, body, foot) {
    $('#drawerTitle').textContent = title || '';
    $('#drawerSub').textContent = sub || '';
    $('#drawerBody').innerHTML = body || '';
    $('#drawerFoot').innerHTML = foot || '<button class="btn" type="button" data-close="drawer">关闭</button>';
    $('#drawerMask').classList.add('open');
    $('#drawer').classList.add('open');
    $('#drawer').setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeDrawer() {
    $('#drawerMask').classList.remove('open');
    $('#drawer').classList.remove('open');
    $('#drawer').setAttribute('aria-hidden', 'true');
    if (!$('#modalMask').classList.contains('open')) document.body.classList.remove('no-scroll');
  }

  function openModal(title, body, foot) {
    $('#modalTitle').textContent = title || '';
    $('#modalBody').innerHTML = body || '';
    $('#modalFoot').innerHTML = foot || '<button class="btn" type="button" data-close="modal">关闭</button>';
    $('#modalMask').classList.add('open');
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    $('#modalMask').classList.remove('open');
    if (!$('#drawer').classList.contains('open')) document.body.classList.remove('no-scroll');
  }

  function switchTab(group, key) {
    $$('[data-tab-group="' + group + '"]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab-key') === key);
    });
    $$('[data-panel-group="' + group + '"]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-panel-key') !== key;
    });
  }

  document.addEventListener('click', function (event) {
    var tab = event.target.closest('[data-tab-group]');
    if (tab) {
      switchTab(tab.getAttribute('data-tab-group'), tab.getAttribute('data-tab-key'));
      return;
    }
    var toastTarget = event.target.closest('[data-toast]');
    if (toastTarget) toast(toastTarget.getAttribute('data-toast'));
    if (event.target.closest('[data-close="drawer"]')) { closeDrawer(); return; }
    if (event.target.closest('[data-close="modal"]')) { closeModal(); return; }
  });

  var drawerMask = $('#drawerMask');
  if (drawerMask) drawerMask.addEventListener('click', closeDrawer);
  var modalMask = $('#modalMask');
  if (modalMask) modalMask.addEventListener('click', function (event) {
    if (event.target === modalMask) closeModal();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { closeDrawer(); closeModal(); }
  });

  window.HRUI = {
    $: $,
    $$: $$,
    toast: toast,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    openModal: openModal,
    closeModal: closeModal,
    switchTab: switchTab
  };
})();
