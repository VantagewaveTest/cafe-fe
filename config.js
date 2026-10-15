// Shared configuration (no secrets)
window.CAFE_CONFIG = {
  API_BASE: 'http://localhost:5000/api',
  POLL_MS: 3000,
  CANCEL_WINDOW_SEC: 60
};

window.CAFE_API_BASE = window.CAFE_CONFIG.API_BASE;
window.API_BASE = window.CAFE_CONFIG.API_BASE;
