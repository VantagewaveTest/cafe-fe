// Shared API helper
(function () {
  const BASE = (window.CAFE_CONFIG || {}).API_BASE || 'http://localhost:5000/api';

  window.CafeApi = {
    BASE,
    async request(path, options = {}) {
      const opts = Object.assign({}, options);
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      const chefToken = sessionStorage.getItem('chefToken');
      if (chefToken && opts.sendAuth !== false) opts.headers.Authorization = `Bearer ${chefToken}`;
      const res = await fetch(`${BASE}${path}`, opts);
      let json;
      try { json = await res.json(); } catch (_) { json = {}; }
      return { ok: res.ok, status: res.status, body: json };
    },
    async get(path) { return this.request(path, { method: 'GET' }); },
    async post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },
    async patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); },
    async del(path, body) { return this.request(path, { method: 'DELETE', body: JSON.stringify(body || {}) }); },
    idempotencyKey() {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    }
  };
})();
