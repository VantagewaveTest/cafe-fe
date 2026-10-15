// Shared Client Script for Timer, Real-time Order Tracking & Confetti
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

// Poll server for latest order status
async function pollOrderStatus(orderId) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.order) {
        return data.order;
      }
    }
  } catch (err) {
    // Backend might be offline or restarting
  }
  return null;
}

// Render floating status bar if active order exists
async function initFloatingTimer() {
  let timerBar = document.getElementById('floating-timer-bar');
  if (!timerBar) {
    timerBar = document.createElement('div');
    timerBar.id = 'floating-timer-bar';
    timerBar.className = 'fixed top-0 left-0 right-0 bg-amber-900 text-amber-100 px-4 py-2.5 text-center text-sm font-medium shadow-md z-50 flex items-center justify-center gap-4 transition-all duration-300';
    document.body.prepend(timerBar);
  }

  const order = getActiveOrder();
  if (!order) {
    timerBar.style.display = 'none';
    return;
  }

  // Fetch updated status from server
  const serverOrder = await pollOrderStatus(order.orderId);
  const currentStatus = serverOrder ? serverOrder.status : (order.status || 'pending');
  const tableNum = serverOrder?.tableNumber || order.tableNumber || '?';

  timerBar.style.display = 'flex';

  if (currentStatus === 'delivered') {
    timerBar.className = 'fixed top-0 left-0 right-0 bg-emerald-700 text-white px-4 py-3 text-center text-base font-bold shadow-lg z-50 flex items-center justify-center gap-3 animate-pulse';
    timerBar.innerHTML = `
      <span>🎉 Order #${order.orderId} has been served at Table ${tableNum}! Enjoy your meal!</span>
      <button onclick="dismissOrder()" class="bg-white/20 hover:bg-white/30 text-xs px-3 py-1 rounded-lg transition font-medium">Dismiss</button>
    `;
    
    // Trigger confetti once upon delivery
    if (!order.celebrated && window.confetti) {
      window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      order.celebrated = true;
      setActiveOrder({ ...order, status: 'delivered', celebrated: true });
    }
    return;
  }

  if (currentStatus === 'ready_for_pickup') {
    timerBar.className = 'fixed top-0 left-0 right-0 bg-indigo-700 text-white px-4 py-2.5 text-center text-sm font-semibold shadow-md z-50 flex items-center justify-center gap-4 transition-all';
    timerBar.innerHTML = `
      <span>🔔 <strong>Order #${order.orderId} (Table ${tableNum}):</strong> Chef finished cooking! Handed over to Waiter on the way to your table.</span>
    `;
    return;
  }

  if (currentStatus === 'preparing') {
    timerBar.className = 'fixed top-0 left-0 right-0 bg-orange-700 text-white px-4 py-2.5 text-center text-sm font-semibold shadow-md z-50 flex items-center justify-center gap-4 transition-all';
    timerBar.innerHTML = `
      <span>🍳 <strong>Order #${order.orderId} (Table ${tableNum}):</strong> Chef accepted your order and is actively preparing it in the kitchen.</span>
    `;
    return;
  }

  // Otherwise 'pending'
  timerBar.className = 'fixed top-0 left-0 right-0 bg-amber-900 text-amber-100 px-4 py-2.5 text-center text-sm font-medium shadow-md z-50 flex items-center justify-center gap-4 transition-all';
  timerBar.innerHTML = `
    <span>⏳ <strong>Order #${order.orderId} (Table ${tableNum}):</strong> Order placed. Waiting for kitchen chef to accept...</span>
    <button onclick="dismissOrder()" class="text-xs text-amber-300 hover:text-white underline ml-2">Cancel/Clear</button>
  `;
}

function dismissOrder() {
  clearActiveOrder();
  const timerBar = document.getElementById('floating-timer-bar');
  if (timerBar) timerBar.style.display = 'none';
  window.location.reload();
}

// Run tracker every 3 seconds to poll server status
setInterval(initFloatingTimer, 3000);
window.addEventListener('DOMContentLoaded', initFloatingTimer);
