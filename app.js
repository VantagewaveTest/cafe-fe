/**
 * app.js — shared customer-page behaviour.
 *
 * The floating status bar is now BACKEND-DRIVEN:
 *  - it polls the order status every 3 s (only when an order is active),
 *  - the countdown is an ESTIMATE only; it never decides that an order is ready,
 *  - confetti fires only when the backend actually reports READY (or later),
 *  - a failed poll keeps the last known status instead of faking a new one.
 */
(function (global) {
  'use strict';

  // Confetti is only used for a genuine backend READY.
  if (!global.confetti) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    script.onerror = function () { /* offline: confetti is optional */ };
    document.head.appendChild(script);
  }

  var isTrackPage = /track\.html$/i.test(location.pathname);
  var poller = null;

  /* ---------------------------------------------------------------- *
   * Active order (kept for backwards compatibility with existing pages)
   * ---------------------------------------------------------------- */

  function getActiveOrder() { return Cafe.activeOrder.get(); }
  function setActiveOrder(order) { return Cafe.activeOrder.set(order); }
  function clearActiveOrder() { Cafe.activeOrder.clear(); }

  function dismissOrder() {
    clearActiveOrder();
    if (poller) { poller.stop(); poller = null; }
    var bar = document.getElementById('floating-timer-bar');
    if (bar) bar.style.display = 'none';
    if (isTrackPage) location.href = 'menu.html';
  }

  global.getActiveOrder = getActiveOrder;
  global.setActiveOrder = setActiveOrder;
  global.clearActiveOrder = clearActiveOrder;
  global.dismissOrder = dismissOrder;

  /* ---------------------------------------------------------------- *
   * Floating status bar
   * ---------------------------------------------------------------- */

  function ensureBar() {
    var bar = document.getElementById('floating-timer-bar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'floating-timer-bar';
    bar.style.display = 'none';
    document.body.prepend(bar);
    return bar;
  }

  function celebrate(order) {
    if (order.celebrated || !global.confetti) return;
    try {
      global.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (err) { /* confetti is decorative */ }
    Cafe.activeOrder.patch({ celebrated: true });
  }

  function renderBar() {
    var bar = ensureBar();
    var order = getActiveOrder();

    if (!order || !order.orderId) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    var status = order.status || 'PENDING';
    var meta = Cafe.statusMeta(status);
    var isReady = Cafe.isAtLeast(status, 'READY');
    var finished = status === 'SERVED';

    var remainingMs = order.estimateReadyAt ? new Date(order.estimateReadyAt).getTime() - Date.now() : 0;
    var estimateText = remainingMs > 0
      ? 'estimate <strong>' + Cafe.countdown(remainingMs) + '</strong>'
      : 'taking longer than estimated';

    var message;
    if (isReady) {
      message = '🎉 Order ' + Cafe.escapeHtml(order.orderId) + ' is <strong>' + Cafe.escapeHtml(meta.label) + '</strong>!';
      celebrate(order);
    } else {
      message = '⏳ Order ' + Cafe.escapeHtml(order.orderId) + ' · ' + Cafe.escapeHtml(meta.label) + ' — ' + estimateText;
    }

    bar.className = 'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-center text-sm font-medium shadow-md transition-all duration-300 ' +
      (isReady ? 'bg-emerald-700 text-white' : 'bg-amber-900 text-amber-100');

    bar.innerHTML =
      '<span>' + message + '</span>' +
      '<a href="track.html" class="text-xs underline ' + (isReady ? 'text-white' : 'text-amber-200 hover:text-white') + '">View details</a>' +
      '<button type="button" id="dismiss-order-btn" class="rounded px-2 py-0.5 text-xs ' + (isReady ? 'bg-white/20 hover:bg-white/30' : 'bg-amber-800 hover:bg-amber-700') + '">' +
      (finished ? 'Clear' : 'Dismiss') + '</button>';

    var dismissBtn = document.getElementById('dismiss-order-btn');
    if (dismissBtn) dismissBtn.addEventListener('click', dismissOrder, { once: true });
  }

  /* ---------------------------------------------------------------- *
   * Polling the server for the real status
   * ---------------------------------------------------------------- */

  function refreshStatus() {
    var order = getActiveOrder();
    if (!order || !order.orderId || !order.trackingToken) return Promise.resolve();

    return Cafe.api.trackOrder(order.orderId, order.trackingToken)
      .then(function (fresh) {
        Cafe.activeOrder.patch({
          status: fresh.status,
          updatedAt: new Date().toISOString()
        });
        renderBar();
      })
      .catch(function (err) {
        // Keep the last known status and just surface a soft warning.
        if (err instanceof Cafe.ApiError && (err.status === 401 || err.status === 403 || err.status === 404)) {
          if (poller) { poller.stop(); poller = null; }
          var bar = ensureBar();
          bar.style.display = 'flex';
          bar.className = 'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-red-800 px-4 py-2 text-center text-sm font-medium text-white shadow-md';
          bar.innerHTML = '<span>This device can no longer verify order ' + Cafe.escapeHtml(order.orderId) + '.</span>' +
            '<button type="button" id="dismiss-order-btn" class="rounded bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30">Dismiss</button>';
          var btn = document.getElementById('dismiss-order-btn');
          if (btn) btn.addEventListener('click', dismissOrder, { once: true });
        }
        // Network / 5xx: leave the bar showing the last known status.
      });
  }

  function start() {
    if (isTrackPage) return; // track.html owns its own polling + detail view
    renderBar();
    if (!getActiveOrder()) return;
    if (poller) poller.stop();
    poller = Cafe.poll(refreshStatus, { intervalMs: Cafe.POLL_INTERVAL_MS }).start();
  }

  document.addEventListener('DOMContentLoaded', start);
  global.initFloatingTimer = start; // backwards compatibility
  global.refreshActiveOrder = refreshStatus;
})(window);
