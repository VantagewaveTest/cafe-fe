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
