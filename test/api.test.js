'use strict';

/**
 * Frontend contract + security tests for `api.js`.
 *
 * These assert the rules the API contract puts on the *client*:
 *  - the browser sends item ids + quantities only (never prices or totals);
 *  - the tracking token travels in the X-Tracking-Token header, never a URL;
 *  - staff requests carry Authorization: Bearer <token>;
 *  - the status model mirrors the backend exactly.
 *
 * Run with: npm test   (or: node --test)
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { loadCafe, sentBody, header } = require('./helpers');

/* ------------------------------------------------------------------ *
 * Pricing: the client must never send money
 * ------------------------------------------------------------------ */

test('checkout sends item ids and quantities only, never prices or totals', () => {
  const { Cafe, calls } = loadCafe();
  const payload = {
    items: [{ id: 'c1', quantity: 2 }, { id: 'w1', quantity: 1 }],
    fulfilment: { type: 'DINE_IN', tableNumber: 7 },
    payment: { method: 'card' }
  };

  return Cafe.api.placeOrder(payload).then(() => {
    const body = sentBody(calls, 0);
    assert.deepEqual(body, payload, 'the client must forward exactly what the page built');
    for (const item of body.items) {
      assert.deepEqual(Object.keys(item).sort(), ['id', 'quantity']);
    }
    assert.equal(body.totalAmount, undefined);
    assert.equal(body.total, undefined);
    assert.equal(body.subtotal, undefined);
  });
});

test('placeOrder posts to /orders with JSON content type', () => {
  const { Cafe, calls } = loadCafe();
  return Cafe.api.placeOrder({ items: [{ id: 'c1', quantity: 1 }] }).then(() => {
    assert.equal(calls[0].init.method, 'POST');
    assert.ok(calls[0].url.endsWith('/api/orders'));
    assert.equal(header(calls, 'Content-Type'), 'application/json');
  });
});

/* ------------------------------------------------------------------ *
 * Tracking: two factors, token never in the URL
 * ------------------------------------------------------------------ */

test('tracking sends the token as X-Tracking-Token and keeps it out of the URL', () => {
  const { Cafe, calls } = loadCafe({
    fetch: () => ({ status: 200, body: { success: true, order: { orderId: 'ORD-1', status: 'PENDING' } } })
  });

  return Cafe.api.trackOrder('ORD-1', 'secrettoken').then((order) => {
    assert.equal(header(calls, 'X-Tracking-Token'), 'secrettoken');
    assert.ok(!calls[0].url.includes('secrettoken'), 'the token must never appear in the URL');
    assert.ok(calls[0].url.endsWith('/api/orders/ORD-1'));
    assert.equal(order.orderId, 'ORD-1');
  });
});

test('a tracking token is URL-encoded in the path', () => {
  const { Cafe, calls } = loadCafe({ fetch: () => ({ status: 200, body: { order: {} } }) });
  return Cafe.api.trackOrder('ORD 1/2', 't').then(() => {
    assert.ok(calls[0].url.endsWith('/api/orders/ORD%201%2F2'));
  });
});

/* ------------------------------------------------------------------ *
 * Staff sessions
 * ------------------------------------------------------------------ */

test('login stores the server-issued session and exposes role + token', () => {
  const { Cafe } = loadCafe({
    fetch: () => ({
      status: 200,
      body: { success: true, token: 'abc123', role: 'CHEF', username: 'chef', displayName: 'Kitchen Chef', expiresAt: new Date(Date.now() + 3600e3).toISOString() }
    })
  });

  return Cafe.api.login('chef', 'chef123').then((session) => {
    assert.equal(Cafe.staff.token(), 'abc123');
    assert.equal(Cafe.staff.role(), 'CHEF');
    assert.equal(session.username, 'chef');
  });
});

test('staff requests carry Authorization: Bearer <token>', () => {
  const { Cafe, calls } = loadCafe({ fetch: () => ({ status: 200, body: { pending: [], preparing: [], counts: {} } }) });
  Cafe.staff.set({ token: 'tok-9', role: 'CHEF', expiresAt: new Date(Date.now() + 3600e3).toISOString() });

  return Cafe.api.kitchenQueue().then(() => {
    assert.equal(header(calls, 'Authorization'), 'Bearer tok-9');
  });
});

test('an expired stored session is discarded instead of being used', () => {
  const { Cafe } = loadCafe();
  Cafe.staff.set({ token: 'old', role: 'CHEF', expiresAt: new Date(Date.now() - 1000).toISOString() });
  assert.equal(Cafe.staff.get(), null);
  assert.equal(Cafe.staff.token(), null);
});

test('logout clears the local session', () => {
  const { Cafe } = loadCafe({ fetch: () => ({ status: 200, body: { success: true } }) });
  Cafe.staff.set({ token: 'x', role: 'WAITER', expiresAt: new Date(Date.now() + 3600e3).toISOString() });
  return Cafe.api.logout().then(() => {
    assert.equal(Cafe.staff.get(), null);
  });
});

test('guardRole sends an unauthenticated visitor to sign-in', () => {
  const { Cafe, win } = loadCafe();
  const replaced = [];
  win.location.replace = (url) => replaced.push(url);

  const session = Cafe.guardRole('CHEF');
  assert.equal(session, null);
  assert.deepEqual(replaced, ['staff-login.html']);
});

test('guardRole never trusts a URL role: a waiter is bounced off the chef dashboard', () => {
  const { Cafe, win } = loadCafe();
  const replaced = [];
  win.location.replace = (url) => replaced.push(url);
  Cafe.staff.set({ token: 'w', role: 'WAITER', expiresAt: new Date(Date.now() + 3600e3).toISOString() });

  const session = Cafe.guardRole('CHEF');
  assert.equal(session, null);
  assert.deepEqual(replaced, ['waiter.html']);
});

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

test('a 403 becomes an ApiError with the right status and a friendly message', () => {
  const { Cafe } = loadCafe({ fetch: () => ({ status: 403, body: { success: false, message: 'nope', code: 'FORBIDDEN' } }) });

  return Cafe.api.kitchenQueue().then(
    () => assert.fail('should have thrown'),
    (err) => {
      assert.ok(err instanceof Cafe.ApiError);
      assert.equal(err.status, 403);
      assert.equal(err.payload.code, 'FORBIDDEN');
      assert.match(err.friendly(), /permission/i);
    }
  );
});

test('a 401 explains that the session expired', () => {
  const { Cafe } = loadCafe({ fetch: () => ({ status: 401, body: { message: 'no session' } }) });
  return Cafe.api.serviceOrders().then(
    () => assert.fail('should have thrown'),
    (err) => {
      assert.equal(err.status, 401);
      assert.match(err.friendly(), /expired/i);
    }
  );
});

test('an unreachable backend is a status-0 error, not a crash', () => {
  const { Cafe } = loadCafe({ fetch: () => { throw new Error('ECONNREFUSED'); } });
  return Cafe.api.menu().then(
    () => assert.fail('should have thrown'),
    (err) => {
      assert.equal(err.status, 0);
      assert.match(err.message, /backend/i);
    }
  );
});

test('menu() unwraps the menu array', () => {
  const { Cafe } = loadCafe({ fetch: () => ({ status: 200, body: { success: true, menu: [{ id: 'c1' }] } }) });
  return Cafe.api.menu().then((menu) => assert.equal(menu[0].id, 'c1'));
});

/* ------------------------------------------------------------------ *
 * Status model parity with the backend
 * ------------------------------------------------------------------ */

test('the status list is exactly the backend lifecycle, uppercase', () => {
  const { Cafe } = loadCafe();
  // Spread into this realm: Cafe.STATUSES is created inside the VM context.
  assert.deepEqual([...Cafe.STATUSES], ['PENDING', 'PREPARING', 'READY', 'PICKED_UP', 'SERVED']);
});

test('statusIndex / isAtLeast follow the lifecycle order', () => {
  const { Cafe } = loadCafe();
  assert.equal(Cafe.statusIndex('pending'), 0);
  assert.equal(Cafe.statusIndex('SERVED'), 4);
  assert.equal(Cafe.statusIndex('???'), -1);
  assert.equal(Cafe.isAtLeast('READY', 'PREPARING'), true);
  assert.equal(Cafe.isAtLeast('PENDING', 'READY'), false);
});

test('an unknown status falls back to a PENDING meta instead of throwing', () => {
  const { Cafe } = loadCafe();
  assert.equal(Cafe.statusMeta('nonsense').label, 'Order received');
  assert.equal(Cafe.statusMeta(undefined).icon, '📝');
});

/* ------------------------------------------------------------------ *
 * Formatting + escaping
 * ------------------------------------------------------------------ */

test('money formats to two decimals', () => {
  const { Cafe } = loadCafe();
  assert.equal(Cafe.money(7.35), '$7.35');
  assert.equal(Cafe.money(7), '$7.00');
  assert.equal(Cafe.money(undefined), '$0.00');
});

test('escapeHtml neutralises the characters used in markup injection', () => {
  const { Cafe } = loadCafe();
  assert.equal(
    Cafe.escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
  );
});

test('countdown never goes negative', () => {
  const { Cafe } = loadCafe();
  assert.equal(Cafe.countdown(90000), '01:30');
  assert.equal(Cafe.countdown(-5000), '00:00');
});

test('todayKey is a UTC YYYY-MM-DD string', () => {
  const { Cafe } = loadCafe();
  assert.match(Cafe.todayKey(), /^\d{4}-\d{2}-\d{2}$/);
});
