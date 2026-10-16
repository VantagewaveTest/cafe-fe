// Shared Client Script
const API_BASE = (window.CAFE_CONFIG && window.CAFE_CONFIG.API_BASE) || 'http://localhost:5000/api';
const POLL_MS = (window.CAFE_CONFIG && window.CAFE_CONFIG.POLL_MS) || 3000;

window.API_BASE = API_BASE;
window.POLL_MS = POLL_MS;

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

// Render floating estimate bar (estimate only — never marks READY)
function initFloatingEstimate() {
  let timerBar = document.getElementById('floating-estimate-bar');
  if (!timerBar) {
    timerBar = document.createElement('div');
    timerBar.id = 'floating-estimate-bar';
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

  if (remainingMs <= 0) {
    timerBar.style.display = 'flex';
    timerBar.className = 'fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-3 text-center text-base font-bold shadow-lg z-50 flex items-center justify-between gap-3';
    timerBar.innerHTML = `
      <span>⏳ Order #${order.orderId} estimated prep time has elapsed. Status is determined by the kitchen.</span>
      <div class="flex items-center gap-2">
        <a href="order-status.html?orderId=${encodeURIComponent(order.orderId)}" class="underline text-amber-100 hover:text-white text-xs">Check Status</a>
        <button onclick="clearActiveOrder(); timerBar.style.display='none';" class="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded transition">Close</button>
      </div>
    `;
    return;
  }

  timerBar.style.display = 'flex';
  const remainingSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  timerBar.innerHTML = `
    <span>⏳ Active Order #${order.orderId} Estimate Remaining: <strong>${timeStr}</strong> (estimate only)</span>
    <div class="flex items-center gap-2">
      <a href="order-status.html?orderId=${encodeURIComponent(order.orderId)}" class="underline text-amber-200 hover:text-white text-xs">Track Order</a>
      <button onclick="clearActiveOrder(); timerBar.style.display='none';" class="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded transition">Close</button>
    </div>
  `;
}

// Run estimate bar every second
setInterval(initFloatingEstimate, 1000);
window.addEventListener('DOMContentLoaded', initFloatingEstimate);
