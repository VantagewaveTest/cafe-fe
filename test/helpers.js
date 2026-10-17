'use strict';

/**
 * Test helper: loads the real `api.js` and `ui.js` into an isolated VM context
 * with a fake `window`, in-memory storage and a recording `fetch`.
 *
 * This keeps the frontend testable with the built-in `node --test` runner and
 * no third-party dependency (no jsdom, no framework, no build step) — matching
 * how the frontend itself is written.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function memoryStore() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    clear: () => map.clear()
  };
}

/**
 * @param {object} [options]
 * @param {string} [options.apiBase]
 * @param {(url:string, init:object) => ({status?:number, body?:any, ok?:boolean})} [options.fetch]
 * @returns {{Cafe:object, UI:object, calls:Array, win:object}}
 */
function loadCafe(options) {
  options = options || {};
  const calls = [];

  const win = {
    CAFE_API_BASE: options.apiBase || 'http://localhost:5000/api',
    localStorage: memoryStore(),
    sessionStorage: memoryStore(),
    location: { replace() {}, href: '' }
  };
  win.window = win;

  const document = { hidden: false, addEventListener() {}, removeEventListener() {} };

  function fakeFetch(url, init) {
    calls.push({ url: url, init: init || {} });
    const responder = options.fetch || (() => ({ status: 200, body: {} }));
    let res;
    try {
      res = responder(url, init || {}) || {};
    } catch (err) {
      // A real fetch() rejects on a network error; mirror that instead of throwing.
      return Promise.reject(err);
    }
    return Promise.resolve({
      ok: res.ok !== undefined ? res.ok : (res.status || 200) < 400,
      status: res.status || 200,
      text: () => Promise.resolve(
        res.body === undefined ? '' : (typeof res.body === 'string' ? res.body : JSON.stringify(res.body))
      )
    });
  }

  const sandbox = {
    window: win,
    document: document,
    fetch: fakeFetch,
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Promise: Promise,
    Object: Object,
    String: String,
    Number: Number,
    Array: Array,
    isNaN: isNaN,
    setInterval: () => 0,
    clearInterval: () => {}
  };
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);

  vm.runInContext(fs.readFileSync(path.join(ROOT, 'api.js'), 'utf8'), context, { filename: 'api.js' });
  // ui.js expects a bare `Cafe` global; api.js attaches it to `window`.
  sandbox.Cafe = win.Cafe;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8'), context, { filename: 'ui.js' });

  return { Cafe: win.Cafe, UI: win.UI, calls: calls, win: win };
}

/** Parses the JSON body that was sent on the nth recorded fetch call. */
function sentBody(calls, index) {
  const call = calls[index || 0];
  return call && call.init && call.init.body ? JSON.parse(call.init.body) : null;
}

/** Case-insensitive header lookup on a recorded fetch call. */
function header(calls, name, index) {
  const call = calls[index || 0];
  const headers = (call && call.init && call.init.headers) || {};
  const wanted = String(name).toLowerCase();
  const key = Object.keys(headers).find((k) => k.toLowerCase() === wanted);
  return key ? headers[key] : undefined;
}

module.exports = { loadCafe, memoryStore, sentBody, header };
