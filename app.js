// Shared Client Script
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

// Staff session helpers
function getStaffSession() {
  const data = localStorage.getItem('cafe_staff_session');
  return data ? JSON.parse(data) : null;
}

function setStaffSession(session) {
  localStorage.setItem('cafe_staff_session', JSON.stringify(session));
}

function clearStaffSession() {
  localStorage.removeItem('cafe_staff_session');
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

  // If backend says READY, show ready message
  if (order.backendStatus === 'READY') {
    timerBar.style.display = 'flex';
    timerBar.className = 'fixed top-0 left-0 right-0 bg-emerald-700 text-white px-4 py-3 text-center text-base font-bold shadow-lg z-50 flex items-center justify-center gap-3 animate-pulse';
    timerBar.innerHTML = `
      <span>🎉 Order #${order.orderId} is Ready! Please pick up at the counter.</span>
      <button onclick="dismissOrder()" class="bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1 rounded transition">Dismiss</button>
    `;
    if (!order.celebrated && window.confetti) {
      window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      order.celebrated = true;
      setActiveOrder(order);
    }
    return;
  }

  // If order is PICKED_UP or SERVED, show completion
  if (order.backendStatus === 'PICKED_UP' || order.backendStatus === 'SERVED') {
    timerBar.style.display = 'flex';
    timerBar.className = 'fixed top-0 left-0 right-0 bg-blue-700 text-white px-4 py-3 text-center text-base font-bold shadow-lg z-50 flex items-center justify-center gap-3';
    const statusText = order.backendStatus === 'SERVED' ? 'Served! Enjoy your meal.' : 'Picked up! Enjoy your meal.';
    timerBar.innerHTML = `
      <span>✅ Order #${order.orderId}: ${statusText}</span>
      <button onclick="dismissOrder()" class="bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1 rounded transition">Dismiss</button>
    `;
    return;
  }

  // Timer is an estimate only - never mark as READY
  const now = Date.now();
  const remainingMs = order.endTime - now;

  if (remainingMs <= 0) {
    // Timer expired but order is NOT ready yet - show waiting message
    timerBar.style.display = 'flex';
    timerBar.className = 'fixed top-0 left-0 right-0 bg-amber-800 text-amber-100 px-4 py-3 text-center text-sm font-medium shadow-lg z-50 flex items-center justify-center gap-3';
    timerBar.innerHTML = `
      <span>⏳ Order #${order.orderId} is being prepared... (estimated time elapsed, waiting for kitchen)</span>
      <button onclick="dismissOrder()" class="bg-white/20 hover:bg-white/30 text-xs px-2.5 py-1 rounded transition">Dismiss</button>
    `;
    return;
  }

  timerBar.style.display = 'flex';
  const remainingSec = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  timerBar.innerHTML = `
    <span>⏳ Order #${order.orderId} estimated prep time remaining: <strong>${timeStr}</strong></span>
    <a href="cart.html" class="underline text-amber-200 hover:text-white text-xs">View Details</a>
  `;
}

function dismissOrder() {
  clearActiveOrder();
  initFloatingTimer();
}

// Poll backend for order status (every ~3 seconds)
async function pollOrderStatus() {
  const order = getActiveOrder();
  if (!order || !order.secret) return;

  try {
    const response = await fetch(`${API_BASE}/orders/${order.orderId}?secret=${order.secret}`);
    if (response.status === 403 || response.status === 404) {
      // Order not found or unauthorized
      return;
    }
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.order) {
        const previousStatus = order.backendStatus;
        order.backendStatus = data.order.status;
        order.timestamps = data.order.timestamps;
        setActiveOrder(order);

        // Trigger confetti when backend reports READY
        if (data.order.status === 'READY' && previousStatus !== 'READY') {
          if (window.confetti) {
            window.confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
          }
        }
      }
    }
  } catch (err) {
    // Network error - will retry on next poll
    console.error('Poll error:', err);
  }
}

// Run timer every second
setInterval(initFloatingTimer, 1000);

// Poll backend every ~3 seconds
setInterval(pollOrderStatus, 3000);

window.addEventListener('DOMContentLoaded', () => {
  initFloatingTimer();
  pollOrderStatus();
});
