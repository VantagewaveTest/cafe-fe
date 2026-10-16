// Shared API helper
(function () {
  const BASE = (window.CAFE_CONFIG && window.CAFE_CONFIG.API_BASE) || window.API_BASE || 'http://localhost:5000/api';

  window.CafeApi = {
    BASE,
    async request(path, options = {}) {
      const opts = Object.assign({}, options);
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      const orderToken = sessionStorage.getItem('orderAccessToken');
      if (orderToken && opts.sendOrderToken !== false) {
        opts.headers['X-Order-Token'] = orderToken;
      }
      const staffToken = sessionStorage.getItem('staffToken');
      if (staffToken && opts.sendAuth !== false) {
        opts.headers['Authorization'] = `Bearer ${staffToken}`;
      }
      const res = await fetch(`${BASE}${path}`, opts);
      let json;
      try { json = await res.json(); } catch (_) { json = {}; }
      return { ok: res.ok, status: res.status, body: json };
    },
    async get(path, opts = {}) { return this.request(path, { method: 'GET', ...opts }); },
    async post(path, body, opts = {}) { return this.request(path, { method: 'POST', body: JSON.stringify(body), ...opts }); },
    async patch(path, body, opts = {}) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }); }
  };

})();
