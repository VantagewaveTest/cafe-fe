/**
 * ui.js — shared, framework-free rendering helpers for the café pages.
 * Keeps the Daily Grind look (Tailwind + amber palette) consistent everywhere.
 */
(function (global) {
  'use strict';

  var e = Cafe.escapeHtml;

  /* ---------------------------------------------------------------- *
   * Status atoms
   * ---------------------------------------------------------------- */

  function statusBadge(status) {
    var meta = Cafe.statusMeta(status);
    return '<span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ' + meta.badge + '">' +
      '<span>' + meta.icon + '</span>' + e(status) + '</span>';
  }

  /** The five-step customer-facing tracker. */
  function stepper(status) {
    var current = Cafe.statusIndex(status);
    var steps = Cafe.STATUSES.map(function (code, index) {
      var meta = Cafe.STATUS_META[code];
      var done = index < current;
      var active = index === current;
      var classes = done
        ? 'bg-amber-800 text-white border-amber-800'
        : active
          ? 'bg-amber-100 text-amber-900 border-amber-500 ring-2 ring-amber-300'
          : 'bg-white text-amber-700/60 border-amber-200';
      var tick = done ? '✓' : meta.icon;
      return '<li class="flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 ' + classes + '">' +
        '<span aria-hidden="true">' + tick + '</span><span>' + e(meta.short) + '</span></li>';
    }).join('');

    return '<ol class="flex flex-wrap gap-2 text-xs font-semibold">' + steps + '</ol>';
  }

  /* ---------------------------------------------------------------- *
   * Formatting
   * ---------------------------------------------------------------- */

  function fulfilmentLabel(fulfilment) {
    if (!fulfilment) return '—';
    if (String(fulfilment.type).toUpperCase() === 'DINE_IN') {
      return '🍽️ Table ' + e(fulfilment.tableNumber || '?');
    }
    return '🥡 Pickup at counter';
  }

  function itemsSummary(order) {
    return (order.items || []).map(function (item) {
      return e(item.name) + ' × ' + item.quantity;
    }).join(', ');
  }

  function itemsList(order) {
    var rows = (order.items || []).map(function (item) {
      return '<li class="flex items-start justify-between gap-3 py-1">' +
        '<span class="text-amber-900"><span aria-hidden="true">' + e(item.image || '•') + '</span> ' + e(item.name) +
        ' <span class="text-amber-700/70">× ' + item.quantity + '</span></span>' +
        '<span class="shrink-0 text-amber-700/70">' + Cafe.money(item.lineTotal) + ' · ' + item.prepTime + 's</span>' +
        '</li>';
    }).join('');
    return '<ul class="divide-y divide-amber-100 text-sm">' + rows + '</ul>';
  }

  function totalsBlock(order) {
    return '' +
      '<dl class="space-y-1 text-sm text-amber-800">' +
      '<div class="flex justify-between"><dt>Subtotal</dt><dd class="font-semibold">' + Cafe.money(order.subtotal) + '</dd></div>' +
      '<div class="flex justify-between"><dt>Tax (5%)</dt><dd class="font-semibold">' + Cafe.money(order.tax) + '</dd></div>' +
      '<div class="flex justify-between border-t border-amber-100 pt-1 text-base font-bold text-amber-900"><dt>Total</dt><dd>' + Cafe.money(order.total) + '</dd></div>' +
      '</dl>';
  }

  /* ---------------------------------------------------------------- *
   * States
   * ---------------------------------------------------------------- */

  function empty(icon, title, message, actionHtml) {
    return '<div class="rounded-2xl border border-dashed border-amber-300 bg-white/70 p-8 text-center">' +
      '<div class="text-4xl mb-2" aria-hidden="true">' + icon + '</div>' +
      '<h3 class="font-bold text-amber-900">' + e(title) + '</h3>' +
      '<p class="mx-auto mt-1 max-w-sm text-sm text-amber-700/80">' + e(message) + '</p>' +
      (actionHtml ? '<div class="mt-4">' + actionHtml + '</div>' : '') +
      '</div>';
  }

  function loading(message) {
    return '<div class="flex items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-white p-6 text-sm text-amber-800">' +
      '<span class="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-800"></span>' +
      e(message || 'Loading…') + '</div>';
  }

  function errorBanner(message, actionHtml) {
    return '<div role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">' +
      '<span><strong class="font-semibold">Problem:</strong> ' + e(message) + '</span>' +
      (actionHtml || '') +
      '</div>';
  }

  function unauthorized(message) {
    return '<div role="alert" class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">' +
      '<strong class="font-semibold">Not authorised.</strong> ' + e(message || 'Please sign in again.') +
      ' <a href="staff-login.html" class="font-semibold underline">Go to sign in</a>' +
      '</div>';
  }

  /* ---------------------------------------------------------------- *
   * Tickets (chef / waiter)
   * ---------------------------------------------------------------- */

  /**
   * @param {object} order staff order view
   * @param {{primary?: {label:string, action:string, disabled?:boolean}, secondary?: object, tone?: string}} options
   */
  function ticket(order, options) {
    options = options || {};
    var tone = options.tone || 'border-amber-200';
    var primary = options.primary;
    var secondary = options.secondary;

    function buttonHtml(spec, style) {
      if (!spec) return '';
      var disabled = spec.disabled ? ' disabled aria-disabled="true"' : '';
      var disabledClasses = spec.disabled ? ' opacity-40 cursor-not-allowed' : '';
      var title = spec.title ? ' title="' + e(spec.title) + '"' : '';
      return '<button type="button" data-action="' + e(spec.action) + '" data-order-id="' + e(order.orderId) + '"' + disabled + title +
        ' class="rounded-lg px-3.5 py-2 text-sm font-semibold shadow-sm transition' + disabledClasses + ' ' + style + '">' +
        e(spec.label) + '</button>';
    }

    return '<article class="rounded-2xl border ' + tone + ' bg-white p-4 shadow-sm" data-order-card="' + e(order.orderId) + '">' +
      '<header class="flex items-start justify-between gap-3">' +
      '<div>' +
      '<p class="font-mono text-sm font-bold text-amber-900">' + e(order.orderId) + '</p>' +
      '<p class="mt-0.5 text-xs text-amber-700/80">' + fulfilmentLabel(order.fulfilment) + ' · ' + e(Cafe.timeSince(order.createdAt)) + '</p>' +
      '</div>' +
      statusBadge(order.status) +
      '</header>' +
      (options.note ? '<p class="mt-2 text-xs text-amber-700/70">' + e(options.note) + '</p>' : '') +
      '<div class="mt-3">' + itemsList(order) + '</div>' +
      '<footer class="mt-3 flex items-center justify-between gap-2 border-t border-amber-100 pt-3">' +
      '<span class="text-xs text-amber-700/80">⏱️ ' + order.totalPrepTime + 's · ' + Cafe.money(order.total) + '</span>' +
      '<span class="flex gap-2">' +
      buttonHtml(secondary, 'border border-amber-300 bg-white text-amber-900 hover:bg-amber-50') +
      buttonHtml(primary, 'bg-amber-800 text-white hover:bg-amber-900') +
      '</span>' +
      '</footer>' +
      '</article>';
  }

  /** Compact list row for history tables. */
  function historyRow(order) {
    var completedAt = order.timestamps.readyAt || order.timestamps.servedAt || order.createdAt;
    return '<tr class="border-b border-amber-100 last:border-0">' +
      '<td class="py-2 pr-3 font-mono text-xs text-amber-900">' + e(order.orderId) + '</td>' +
      '<td class="py-2 pr-3">' + fulfillmentShort(order.fulfilment) + '</td>' +
      '<td class="py-2 pr-3 text-amber-800">' + e(itemsSummary(order)) + '</td>' +
      '<td class="py-2 pr-3">' + statusBadge(order.status) + '</td>' +
      '<td class="py-2 pr-3 text-right font-semibold text-amber-900">' + Cafe.money(order.total) + '</td>' +
      '<td class="py-2 text-right text-amber-700/80">' + e(Cafe.formatClock(completedAt)) + '</td>' +
      '</tr>';
  }

  function fulfillmentShort(fulfilment) {
    if (!fulfilment) return '—';
    return String(fulfilment.type).toUpperCase() === 'DINE_IN'
      ? 'Table ' + e(fulfilment.tableNumber || '?')
      : 'Pickup';
  }

  function countsRow(counts) {
    var order = ['PENDING', 'PREPARING', 'READY', 'PICKED_UP', 'SERVED'];
    return '<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">' + order.map(function (code) {
      var meta = Cafe.STATUS_META[code];
      return '<div class="rounded-xl border border-amber-200 bg-white p-3 text-center">' +
        '<div class="text-xl font-bold text-amber-900">' + (counts[code] || 0) + '</div>' +
        '<div class="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">' +
        '<span class="h-2 w-2 rounded-full ' + meta.dot + '"></span>' + e(meta.short) + '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  global.UI = {
    statusBadge: statusBadge,
    stepper: stepper,
    fulfilmentLabel: fulfilmentLabel,
    fulfillmentShort: fulfillmentShort,
    itemsSummary: itemsSummary,
    itemsList: itemsList,
    totalsBlock: totalsBlock,
    empty: empty,
    loading: loading,
    errorBanner: errorBanner,
    unauthorized: unauthorized,
    ticket: ticket,
    historyRow: historyRow,
    countsRow: countsRow
  };
})(window);
