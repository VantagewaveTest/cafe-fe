// Shared Client Script for Timer & Confetti
const API_BASE = 'http://localhost:5000/api';

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

// Render floating timer bar if active order exists
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

  if (remainingMs <= 0) {
    timerBar.style.display = 'flex';
    timerBar.className = 'fixed top-0 left-0 right-0 bg-emerald-700 text-white px-4 py-3 text-center text-base font-bold shadow-lg z-50 flex items-center justify-center gap-3 animate-pulse';
    timerBar.innerHTML = `
      <span>🎉 Order #${order.orderId} is Ready! Please pick up at the counter.</span>
      <button onclick="dismissOrder()" class="bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1 rounded transition">Dismiss</button>
    `;
    
    // Trigger confetti once upon completion
    if (!order.celebrated && window.confetti) {
      window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      order.celebrated = true;
      setActiveOrder(order);
    }
    return;
  }

  timerBar.style.display = 'flex';
  const remainingSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  timerBar.innerHTML = `
    <span>⏳ Active Order #${order.orderId} Prep Time Remaining: <strong>${timeStr}</strong></span>
    <a href="cart.html" class="underline text-amber-200 hover:text-white text-xs">View Details</a>
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
