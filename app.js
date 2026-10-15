const API_BASE = (window.CAFE_CONFIG || {}).API_BASE || (window.API_BASE || 'http://localhost:5000/api');
window.API_BASE = API_BASE;

(function () {
  // ---- Circular timer ----
  let timerWidget = null;
  let ring = null;
  let text = null;
  function ensureTimer() {
    if (timerWidget) return timerWidget;
    timerWidget = document.createElement('div');
    timerWidget.id = 'circle-timer';
    timerWidget.className = 'fixed right-4 top-20 z-50 pointer-events-none opacity-0 scale-90 transition';
    timerWidget.innerHTML = `
      <div class="relative w-14 h-14 rounded-full bg-amber-100 shadow-lg border border-amber-300 flex items-center justify-center">
        <svg class="absolute inset-0 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#fde68a" stroke-width="6"></circle>
          <circle id="circle-timer-ring" cx="28" cy="28" r="24" fill="none" stroke="#7c2d12" stroke-width="6" stroke-dasharray="0 1000" stroke-linecap="round"></circle>
        </svg>
        <span id="circle-timer-text" class="relative text-[11px] font-bold text-amber-900">--</span>
      </div>
    `;
    document.body.appendChild(timerWidget);
    ring = document.getElementById('circle-timer-ring');
    text = document.getElementById('circle-timer-text');
    return timerWidget;
  }

  let celebrated = false;
  window.initCircleTimer = function () {
    const el = ensureTimer();
    const raw = localStorage.getItem('active_cafe_order');
    const order = raw ? JSON.parse(raw) : null;
    if (!order) {
      el.classList.add('opacity-0', 'scale-90', 'pointer-events-none');
      el.classList.remove('opacity-100', 'scale-100');
      return;
    }

    el.classList.remove('opacity-0', 'scale-90', 'pointer-events-none');
    el.classList.add('opacity-100', 'scale-100');

    const now = Date.now();
    const remainingMs = Math.max(0, (order.endTime || Date.now()) - now);
    const totalMs = Math.max(1, order.totalMs || (remainingMs + now - (order.startTime || now)));
    const fraction = clamp((totalMs - remainingMs) / totalMs, 0, 1);

    // circumference = 2π*24 ≈ 150.8
    const circumference = 150.8;
    ring.setAttribute('stroke-dasharray', `${fraction * circumference} ${circumference}`);
    text.textContent = formatTime(remainingMs);

    if (remainingMs <= 0 && !celebrated && order.canCelebrate) {
      celebrated = true;
      triggerConfetti('circle');
      localStorage.setItem('active_cafe_order', JSON.stringify(Object.assign({}, order, { celebrated: true })));
    }
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function formatTime(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  function triggerConfetti() {
    if (window.confetti) {
      window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    } else {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      sc.onload = () => triggerConfetti();
      document.head.appendChild(sc);
    }
  }

  function clearActiveOrder() {
    localStorage.removeItem('active_cafe_order');
    celebrated = false;
    initCircleTimer();
    window.location.reload();
  }
  window.clearCafeOrder = clearActiveOrder;

  // poll timer every second
  setInterval(window.initCircleTimer, 1000);
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.confetti) {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      document.head.appendChild(sc);
    }
    window.initCircleTimer();
  });

  // ---- helpers used by pages ----
  window.getActiveOrder = () => {
    const d = localStorage.getItem('active_cafe_order');
    return d ? (JSON.parse(d) || {}) : null;
  };
  window.setActiveOrder = (order) => localStorage.setItem('active_cafe_order', JSON.stringify(order));
  window.clearActiveOrder = () => localStorage.removeItem('active_cafe_order');
})();
