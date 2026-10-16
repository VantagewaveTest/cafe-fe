// Shared Client Script for Timer & Confetti
// Single configurable API base URL. Override with ?apiBase=... or by setting
// window.CAFE_API_BASE before this script loads. Must match the cafe-be port.
const API_BASE = new URLSearchParams(location.search).get('apiBase')
  || window.CAFE_API_BASE
  || 'http://localhost:5000/api';

// Inject confetti CDN dynamically if not present
if (!window.confetti) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
  document.head.appendChild(script);
}

function getActiveOrder() {
  const data = localStorage.getItem('active_cafe_order');
  return data ? JSON.parse(data) : null;
}

function setActiveOrder(order) {
  localStorage.setItem('active_cafe_order', JSON.stringify(order));
}

function clearActiveOrder() {
  localStorage.removeItem('active_cafe_order');
}

// Render floating timer bar if active order exists.
// IMPORTANT: this countdown is an ESTIMATE of preparation time only. It must
// never change order status, mark an order READY, or celebrate readiness just
// because time elapsed. Readiness comes only from the backend reporting READY.
function initFloatingTimer() {
  let timerBar = document.getElementById('floating-timer-bar');
  if (!timerBar) {
    timerBar = document.createElement('div');
    timerBar.id = 'floating-timer-bar';
    timerBar.className = 'fixed top-0 left-0 right-0 bg-amber-900 text-amber-100 px-4 py-2 text-center text-sm font-medium shadow-md z-50 flex items-center justify-center gap-4 transition-all duration-300';
    document.body.prepend(timerBar);
  }

  const order = getActiveOrder();
  if (!order) {
    timerBar.style.display = 'none';
    return;
  }

  const now = Date.now();
  const remainingMs = order.endTime - now;
  const estimateOver = remainingMs <= 0;

  // If the estimate has run out, show a neutral message — NOT a readiness
  // celebration. Real READY status is surfaced on tracking.html from the API.
  if (estimateOver) {
    timerBar.style.display = 'flex';
    timerBar.className = 'fixed top-0 left-0 right-0 bg-amber-800 text-amber-100 px-4 py-3 text-center text-sm font-medium shadow-lg z-50 flex items-center justify-center gap-3';
    timerBar.innerHTML = `
      <span>ℹ️ Order #${order.orderId} prep estimate elapsed — awaiting kitchen update.</span>
      <a href="tracking.html" class="underline text-amber-200 hover:text-white text-xs">Track Order</a>
      <button onclick="dismissOrder()" class="bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1 rounded transition">Dismiss</button>
    `;
    return;
  }

  const remainingSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  timerBar.style.display = 'flex';
  timerBar.className = 'fixed top-0 left-0 right-0 bg-amber-900 text-amber-100 px-4 py-2 text-center text-sm font-medium shadow-md z-50 flex items-center justify-center gap-4 transition-all duration-300';
  timerBar.innerHTML = `
    <span>⏳ Order #${order.orderId} est. prep time remaining: <strong>${timeStr}</strong></span>
    <a href="tracking.html" class="underline text-amber-200 hover:text-white text-xs">Track Order</a>
    <button onclick="dismissOrder()" class="bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1 rounded transition">Dismiss</button>
  `;
}

function dismissOrder() {
  clearActiveOrder();
  initFloatingTimer();
  window.location.reload();
}

// Run timer every second
setInterval(initFloatingTimer, 1000);
window.addEventListener('DOMContentLoaded', initFloatingTimer);
