'use strict';

/**
 * Frontend rendering + security tests for `ui.js`.
 *
 * The café renders order data (menu names, order ids, notes) straight into
 * HTML strings, so these tests prove every dynamic value is escaped — a
 * malicious menu item or table number cannot inject markup into a dashboard.
 *
 * Run with: npm test   (or: node --test)
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { loadCafe } = require('./helpers');

function order(overrides) {
  return Object.assign({
    orderId: 'ORD-123',
    status: 'PENDING',
    items: [{ id: 'c1', name: 'Espresso', image: '☕', unitPrice: 3.5, quantity: 2, lineTotal: 7, prepTime: 10 }],
    subtotal: 7,
    tax: 0.35,
    total: 7.35,
    totalPrepTime: 10,
    fulfilment: { type: 'DINE_IN', tableNumber: 7 },
    createdAt: new Date().toISOString(),
    timestamps: { createdAt: new Date().toISOString(), preparingAt: null, readyAt: null, pickedUpAt: null, servedAt: null }
  }, overrides || {});
}

test('ticket escapes a hostile order id (no markup injection)', () => {
  const { UI } = loadCafe();
  const html = UI.ticket(order({ orderId: '<img src=x onerror=alert(1)>' }), {
    primary: { label: 'Start', action: 'start' }
  });
  assert.ok(!html.includes('<img src=x'), 'the raw tag must not survive');
  assert.ok(html.includes('&lt;img src=x'), 'it must be escaped instead');
});

test('ticket escapes a hostile item name', () => {
  const { UI } = loadCafe();
  const html = UI.ticket(order({
    items: [{ id: 'c1', name: '<script>alert(1)</script>', image: '☕', quantity: 1, lineTotal: 3.5, prepTime: 5 }]
  }), {});
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('ticket escapes a hostile button label and note', () => {
  const { UI } = loadCafe();
  const html = UI.ticket(order(), {
    primary: { label: '<b>go</b>', action: 'start' },
    note: '"><img src=x>'
  });
  assert.ok(!html.includes('<b>go</b>'));
  assert.ok(html.includes('&lt;b&gt;go&lt;/b&gt;'));
  assert.ok(!html.includes('<img src=x>'));
});

test('a button carries the action and order id for the click handler', () => {
  const { UI } = loadCafe();
  const html = UI.ticket(order(), { primary: { label: 'Mark ready', action: 'ready' } });
  assert.ok(html.includes('data-action="ready"'));
  assert.ok(html.includes('data-order-id="ORD-123"'));
});

test('a disabled button is rendered disabled and marked for assistive tech', () => {
  const { UI } = loadCafe();
  const html = UI.ticket(order(), { primary: { label: 'Saving…', action: 'ready', disabled: true } });
  assert.ok(html.includes('disabled'));
  assert.ok(html.includes('aria-disabled="true"'));
});

test('itemsList shows each line total and prep time', () => {
  const { UI } = loadCafe();
  const html = UI.itemsList(order());
  assert.ok(html.includes('Espresso'));
  assert.ok(html.includes('$7.00'));
  assert.ok(html.includes('10s'));
});

test('totalsBlock renders subtotal, 5% tax and total', () => {
  const { UI } = loadCafe();
  const html = UI.totalsBlock(order());
  assert.ok(html.includes('$7.00'));
  assert.ok(html.includes('$0.35'));
  assert.ok(html.includes('$7.35'));
  assert.ok(html.includes('Tax (5%)'));
});

test('statusBadge renders the status text', () => {
  const { UI } = loadCafe();
  const html = UI.statusBadge('PREPARING');
  assert.ok(html.includes('PREPARING'));
});

test('countsRow shows every status, defaulting missing ones to zero', () => {
  const { UI } = loadCafe();
  const html = UI.countsRow({ PENDING: 2, READY: 1 });
  assert.ok(html.includes('>2<'));
  assert.ok(html.includes('>1<'));
  assert.ok(html.includes('>0<'));
  assert.equal((html.match(/>0</g) || []).length, 3, 'the three unseen statuses show 0');
});

test('stepper marks progress by status position', () => {
  const { UI } = loadCafe();
  const html = UI.stepper('READY');
  assert.ok(html.includes('✓'), 'completed steps get a tick');
  assert.ok(html.includes('Ready'));
});

test('empty / errorBanner / unauthorized all escape their message', () => {
  const { UI } = loadCafe();
  assert.ok(!UI.empty('❌', '<b>t</b>', '<i>m</i>').includes('<b>t</b>'));
  assert.ok(!UI.errorBanner('<img src=x>').includes('<img src=x>'));
  assert.ok(!UI.unauthorized('<img src=x>').includes('<img src=x>'));
});

test('fulfilmentLabel distinguishes dine-in from pickup', () => {
  const { UI } = loadCafe();
  assert.ok(UI.fulfilmentLabel({ type: 'DINE_IN', tableNumber: 7 }).includes('Table 7'));
  assert.ok(UI.fulfilmentLabel({ type: 'PICKUP' }).includes('Pickup'));
  assert.equal(UI.fulfilmentLabel(null), '—');
});
