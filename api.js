/**
 * api.js — the single place that talks to the café backend.
 *
 * Contract: see API_CONTRACT.md (agreed with cafe-be#10).
 *  - Base URL http://localhost:5000/api  (fixes the old 5001/5000 mismatch)
 *  - Staff token -> Authorization: Bearer <token>
 *  - Guest tracking -> X-Tracking-Token header (id alone never authorizes)
 *  - Typed errors for 400/401/403/404/409/503 so pages can react safely
 *
 * No framework, no build step: a plain global `Cafe` namespace.
 */
(function (global) {
  'use strict';

  var API_BASE = (global.CAFE_API_BASE || 'http://localhost:5000/api').replace(/\/+$/, '');
  var POLL_INTERVAL_MS = 3000;

  var STORAGE_KEYS = {
    cart: 'cafe_cart',
    activeOrder: 'active_cafe_order',
    staffSession: 'cafe_staff_session'
  };

  /* ---------------------------------------------------------------- *
   * Errors
   * ---------------------------------------------------------------- */

  function ApiError(message, status, payload) {
    var error = Error.call(this, message);
    this.name = 'ApiError';
    this.message = message;
    this.status = status || 0;
    this.payload = payload || null;
    this.stack = error.stack;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  /** Human-friendly description for a failed request. */
  ApiError.prototype.friendly = function () {
    switch (this.status) {
      case 0: return this.message;
      case 400: return this.message || 'That order was not valid. Please check your cart.';
      case 401: return 'Your session has expired. Please sign in again.';
      case 403: return 'You do not have permission to do that.';
      case 404: return 'We could not find that order.';
      case 409: return this.message || 'That action is not allowed for the current status.';
      case 503: return 'The café could not save that change. Please try again.';
      default: return this.message || 'Something went wrong. Please try again.';
    }
  };

  /* ---------------------------------------------------------------- *
   * Core request helper
   * ---------------------------------------------------------------- */

  function request(path, options) {
    options = options || {};
    var headers = {};
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.token) headers['Authorization'] = 'Bearer ' + options.token;
    if (options.trackingToken) headers['X-Tracking-Token'] = options.trackingToken;

    return fetch(API_BASE + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    }).catch(function () {
      throw new ApiError('Unable to reach the café server. Is the backend running on port 5000?', 0, null);
    }).then(function (response) {
      return response.text().then(function (text) {
        var payload = null;
        if (text) { try { payload = JSON.parse(text); } catch (e) { payload = null; } }
        if (!response.ok) {
          throw new ApiError((payload && payload.message) || ('Request failed with status ' + response.status), response.status, payload);
        }
        return payload;
      });
    });
  }

  /* ---------------------------------------------------------------- *
   * Local storage: cart, active order, staff session
   * ---------------------------------------------------------------- */

  /**
   * Storage split (deliberate, see README):
   *  - the staff session is per browser TAB (sessionStorage) so a chef and a
   *    waiter can be signed in side by side on one machine without clobbering
   *    each other — and the same holds for two staff on one terminal;
   *  - the customer's cart and active order follow them across tabs
   *    (localStorage).
   */
  function pickStore(name) {
    try {
      var store = global[name];
      store.setItem('__cafe_probe__', '1');
      store.removeItem('__cafe_probe__');
      return store;
    } catch (e) {
      return global.localStorage;
    }
  }

  var staffStore = pickStore('sessionStorage');
  var orderStore = pickStore('localStorage');

  function readJSON(store, key, fallback) {
    try {
      var raw = store.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) { /* storage disabled */ }
  }

  function removeKey(store, key) {
    try { store.removeItem(key); } catch (e) { /* noop */ }
  }

  var staff = {
    get: function () {
      var session = readJSON(staffStore, STORAGE_KEYS.staffSession, null);
      if (!session || !session.token) return null;
      if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
        staff.clear();
        return null;
      }
      return session;
    },
    set: function (session) { writeJSON(staffStore, STORAGE_KEYS.staffSession, session); },
    clear: function () { removeKey(staffStore, STORAGE_KEYS.staffSession); },
    token: function () { var s = staff.get(); return s ? s.token : null; },
    role: function () { var s = staff.get(); return s ? s.role : null; }
  };

  var activeOrder = {
    get: function () { return readJSON(orderStore, STORAGE_KEYS.activeOrder, null); },
    set: function (order) { writeJSON(orderStore, STORAGE_KEYS.activeOrder, order); return order; },
    patch: function (partial) {
      var next = Object.assign({}, activeOrder.get() || {}, partial);
      return activeOrder.set(next);
    },
    clear: function () { removeKey(orderStore, STORAGE_KEYS.activeOrder); }
  };

  /* ---------------------------------------------------------------- *
   * Status model (uppercase only, mirrors the backend)
   * ---------------------------------------------------------------- */

  var STATUSES = ['PENDING', 'PREPARING', 'READY', 'PICKED_UP', 'SERVED'];

  var STATUS_META = {
    PENDING: { label: 'Order received', short: 'Received', icon: '📝', blurb: 'Waiting in the kitchen queue', badge: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-500' },
    PREPARING: { label: 'Being prepared', short: 'Preparing', icon: '👨‍🍳', blurb: 'A chef is working on it now', badge: 'bg-orange-100 text-orange-900 border-orange-300', dot: 'bg-orange-500' },
    READY: { label: 'Ready', short: 'Ready', icon: '🔔', blurb: 'Ready for pickup at the counter', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300', dot: 'bg-emerald-500' },
    PICKED_UP: { label: 'Picked up', short: 'Picked up', icon: '🛎️', blurb: 'On its way to you', badge: 'bg-sky-100 text-sky-900 border-sky-300', dot: 'bg-sky-500' },
    SERVED: { label: 'Served', short: 'Served', icon: '✅', blurb: 'Enjoy your order!', badge: 'bg-slate-200 text-slate-900 border-slate-300', dot: 'bg-slate-500' }
  };

  function statusIndex(status) {
    return STATUSES.indexOf(String(status || '').toUpperCase());
  }

  /** True when `status` is at or past `floor` in the lifecycle. */
  function isAtLeast(status, floor) {
    var i = statusIndex(status);
    var f = statusIndex(floor);
    return i >= 0 && f >= 0 && i >= f;
  }

  function statusMeta(status) {
    return STATUS_META[String(status || '').toUpperCase()] || STATUS_META.PENDING;
  }

  /* ---------------------------------------------------------------- *
   * Polling with an in-flight guard
   * ---------------------------------------------------------------- */

  /**
   * @param {function(): Promise<any>} fn  must handle its own errors
   * @param {{intervalMs?:number}} [options]
   */
  function poll(fn, options) {
    var intervalMs = (options && options.intervalMs) || POLL_INTERVAL_MS;
    var timer = null;
    var inFlight = false;
    var stopped = false;

    function tick() {
      if (stopped || inFlight || global.document.hidden) return Promise.resolve();
      inFlight = true;
      return Promise.resolve()
        .then(fn)
        .catch(function () { /* pages render their own error state */ })
        .then(function () { inFlight = false; });
    }

    function onVisibility() {
      if (!global.document.hidden) tick();
    }

    return {
      start: function () {
        if (timer) return this;
        document.addEventListener('visibilitychange', onVisibility);
        tick();
        timer = setInterval(tick, intervalMs);
        return this;
      },
      stop: function () {
        stopped = true;
        document.removeEventListener('visibilitychange', onVisibility);
        if (timer) { clearInterval(timer); timer = null; }
      },
      poke: tick,
      isBusy: function () { return inFlight; }
    };
  }

  /* ---------------------------------------------------------------- *
   * Small formatting helpers
   * ---------------------------------------------------------------- */

  function money(value) {
    return '$' + Number(value || 0).toFixed(2);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function formatClock(iso) {
    if (!iso) return '—';
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' ' + formatClock(iso);
  }

  /** "just now", "3 min ago", ... used on kitchen/service tickets. */
  function timeSince(iso) {
    if (!iso) return '—';
    var seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return seconds + 's ago';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    var hours = Math.floor(minutes / 60);
    return hours + 'h ' + (minutes % 60) + 'm ago';
  }

  function countdown(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var minutes = Math.floor(total / 60);
    var seconds = total % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  /** UTC YYYY-MM-DD — matches the backend's date filters. */
  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------------------------------------------------------------- *
   * Endpoint wrappers
   * ---------------------------------------------------------------- */

  var api = {
    menu: function () {
      return request('/menu').then(function (data) { return data.menu; });
    },

    login: function (username, password) {
      return request('/auth/login', { method: 'POST', body: { username: username, password: password } })
        .then(function (data) {
          var session = {
            token: data.token,
            role: data.role,
            username: data.username,
            displayName: data.displayName,
            expiresAt: data.expiresAt
          };
          staff.set(session);
          return session;
        });
    },

    logout: function () {
      var token = staff.token();
      staff.clear();
      if (!token) return Promise.resolve();
      return request('/auth/logout', { method: 'POST', token: token, body: {} }).catch(function () { /* local sign-out is enough */ });
    },

    placeOrder: function (payload) {
      // Only ids + quantities are sent; the server prices the order.
      return request('/orders', { method: 'POST', body: payload });
    },

    trackOrder: function (orderId, trackingToken) {
      return request('/orders/' + encodeURIComponent(orderId), { trackingToken: trackingToken })
        .then(function (data) { return data.order; });
    },

    kitchenQueue: function () { return request('/kitchen/queue', { token: staff.token() }); },
    kitchenHistory: function (date) { return request('/kitchen/history?date=' + encodeURIComponent(date), { token: staff.token() }); },
    topPrepared: function (date) { return request('/stats/top-prepared?date=' + encodeURIComponent(date), { token: staff.token() }); },
    startOrder: function (id) { return request('/kitchen/orders/' + encodeURIComponent(id) + '/start', { method: 'PATCH', token: staff.token() }); },
    readyOrder: function (id) { return request('/kitchen/orders/' + encodeURIComponent(id) + '/ready', { method: 'PATCH', token: staff.token() }); },

    serviceOrders: function () { return request('/service/orders', { token: staff.token() }); },
    serviceHistory: function (date) { return request('/service/history?date=' + encodeURIComponent(date), { token: staff.token() }); },
    pickupOrder: function (id) { return request('/service/orders/' + encodeURIComponent(id) + '/pickup', { method: 'PATCH', token: staff.token() }); },
    serveOrder: function (id) { return request('/service/orders/' + encodeURIComponent(id) + '/serve', { method: 'PATCH', token: staff.token() }); }
  };

  /**
   * Page guard for staff pages. Never trusts a URL role — the role comes from
   * the stored, server-issued session.
   * @returns {object|null} session, or null after redirecting.
   */
  function guardRole(role) {
    var session = staff.get();
    if (!session) {
      global.location.replace('staff-login.html');
      return null;
    }
    if (session.role !== role) {
      global.location.replace(session.role === 'CHEF' ? 'chef.html' : 'waiter.html');
      return null;
    }
    return session;
  }

  var Cafe = {
    API_BASE: API_BASE,
    POLL_INTERVAL_MS: POLL_INTERVAL_MS,
    STORAGE_KEYS: STORAGE_KEYS,
    ApiError: ApiError,
    request: request,
    api: api,
    staff: staff,
    activeOrder: activeOrder,
    STATUSES: STATUSES,
    STATUS_META: STATUS_META,
    statusIndex: statusIndex,
    isAtLeast: isAtLeast,
    statusMeta: statusMeta,
    poll: poll,
    money: money,
    escapeHtml: escapeHtml,
    formatClock: formatClock,
    formatDateTime: formatDateTime,
    timeSince: timeSince,
    countdown: countdown,
    todayKey: todayKey,
    guardRole: guardRole
  };

  global.Cafe = Cafe;
  global.API_BASE = API_BASE; // backwards compatibility for the existing pages
})(window);
