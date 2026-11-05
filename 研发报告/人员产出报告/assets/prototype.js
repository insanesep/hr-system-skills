window.ReportUI = (function () {
  var layerFocus = {};

  function toast(message, type) {
    var host = document.getElementById('toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'toast-stack';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    var item = document.createElement('div');
    item.className = 'toast' + (type ? ' ' + type : '');
    item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    item.textContent = message;
    host.appendChild(item);
    window.setTimeout(function () { item.remove(); }, 2800);
  }

  function setLoading(button, loading) {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    button.setAttribute('aria-busy', loading ? 'true' : 'false');
  }

  function openLayer(id) {
    var layer = document.getElementById(id);
    if (!layer) return;
    layerFocus[id] = document.activeElement;
    layer.hidden = false;
    document.body.classList.add('no-scroll');
    var target = layer.querySelector('input:not([type="hidden"]), select, button, a');
    if (target) window.setTimeout(function () { target.focus(); }, 0);
  }

  function closeLayer(id) {
    var layer = document.getElementById(id);
    if (!layer) return;
    layer.hidden = true;
    if (!document.querySelector('.modal-backdrop:not([hidden]), .bottom-sheet-backdrop:not([hidden]), .drawer-backdrop:not([hidden])')) {
      document.body.classList.remove('no-scroll');
    }
    if (layerFocus[id] && document.contains(layerFocus[id])) layerFocus[id].focus();
  }

  function download(filename, content) {
    var blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function saveState(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (error) { }
  }

  function readState(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (error) { return null; }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  return {
    toast: toast,
    setLoading: setLoading,
    openLayer: openLayer,
    closeLayer: closeLayer,
    download: download,
    saveState: saveState,
    readState: readState,
    escapeHtml: escapeHtml
  };
})();
