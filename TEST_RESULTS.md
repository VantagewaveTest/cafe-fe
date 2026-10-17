# Test results — cafe-fe

**Date:** 2026-10-17
**Environment:** Windows, Node **v24.20.0**
**Runner:** the built-in `node --test` — **no dependencies** (no jsdom, no
framework, no build step).

The tests load the **real** `api.js` and `ui.js` into an isolated VM context
with a fake `window`, in-memory `localStorage`/`sessionStorage` and a recording
`fetch`. Nothing is re-implemented in the tests — the shipping files are under
test.

## How to reproduce

```bash
cd cafe-fe
npm test            # == node --test
```

## Result

```
ℹ tests 34
ℹ pass 34
ℹ fail 0
```

33 assertions across 2 files, plus the shared `test/helpers.js` file (which the
runner counts as one passing file entry).

| File | Tests | What it proves |
| --- | --- | --- |
| `test/api.test.js` | 21 | the client obeys the contract: **ids + quantities only** (no prices/`totalAmount`); the tracking token travels in `X-Tracking-Token` and is never in a URL; staff requests carry `Authorization: Bearer`; expired sessions are discarded; `guardRole` never trusts a URL role; `400/401/403/409` and an unreachable backend map to typed `ApiError`s; the status model matches the backend |
| `test/ui.test.js` | 12 | every dynamic value rendered into HTML is escaped — a hostile order id, item name, button label or note cannot inject markup (**XSS defence**); tickets carry `data-action`/`data-order-id`; totals, tax, status badges, counts and steppers render correctly |

### Coverage of the assignment's test requirements

| Required scenario | Where |
| --- | --- |
| Malicious / tampered input | `api.test.js` (prices never sent), `ui.test.js` (`<script>`/`<img onerror>` neutralised) |
| Unauthorized access | `api.test.js` (`401`/`403` handling, expired session, `guardRole`) |
| Role handling | `api.test.js` (a waiter is bounced off the chef dashboard) |
| Contract conformance | `api.test.js` (paths, methods, headers, status vocabulary) |

> The **integration** evidence (frontend + backend end to end) lives in
> [`DEMO.md`](./DEMO.md); the backend's 48-test API suite is in
> `cafe-be/TEST_RESULTS.md`.
