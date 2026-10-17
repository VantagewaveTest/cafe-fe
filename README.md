# The Daily Grind Café — frontend

Plain HTML + Tailwind (CDN) + vanilla JS. No framework, no build step.
`api.js` is the single place that talks to the backend; `ui.js` holds shared
rendering helpers; `app.js` owns the customer-facing floating status bar.

Contract: [`API_CONTRACT.md`](./API_CONTRACT.md) (agreed with cafe-be#10).

## Run

The backend must be running on **5000** (see `cafe-be`):

```bash
# terminal 1
cd ../cafe-be && npm start

# terminal 2
npx http-server -p 3000      # or: npm start
# open http://localhost:3000/index.html
```

Open the pages over `http://` (not `file://`) so `fetch` from the CDN Tailwind
and the API both behave normally.

## Pages

| Page | Who | What |
| --- | --- | --- |
| `index.html` | customer | Landing page, shows the live status bar for an active order |
| `menu.html` | customer | Menu + cart, adds/removes items |
| `cart.html` | customer | Checkout: dine-in table or pickup, simulated payment. Sends **ids + quantities only** |
| `track.html` | customer | Backend-driven tracker: all five statuses, server totals, estimate countdown |
| `staff-login.html` | staff | Shared sign-in; the **server** decides the role |
| `chef.html` | `CHEF` | FIFO queue, start/ready actions, status counts, date history, top items |
| `waiter.html` | `WAITER` | Preparing / ready / on-the-way board, pickup/serve actions, service history |

Demo staff accounts: `chef` / `chef123` and `waiter` / `waiter123`.

## Test

```bash
npm test                  # node --test — 34 passing, no dependencies
```

The suite loads the real `api.js` / `ui.js` into a VM with a fake `window` and a
recording `fetch`, so it checks the shipping files (contract conformance, typed
errors, role guarding and HTML escaping) rather than re-implementing them.

Recorded results: [`TEST_RESULTS.md`](./TEST_RESULTS.md) · demo:
[`DEMO.md`](./DEMO.md).

## How tracking works

* Checkout returns `orderId` **and** a private `trackingToken`. Both are stored in
  `localStorage` under `active_cafe_order`; the token is never put in a URL.
* `track.html` and `app.js` poll `GET /api/orders/:orderId` every ~3 s with an
  in-flight guard (via `Cafe.poll`).
* The countdown is an **estimate only**. `READY` comes from the backend, and
  confetti fires only then. If the estimate expires, the real status keeps
  showing.
* A failed poll keeps the last known status. A `401`/`403`/`404` shows an
  "cannot verify this order" state instead of inventing a status.

## Notes / limitations

* Cart totals before checkout are a **browser-side estimate** and are labelled as
  such; the server recomputes the real totals and the confirmation shows those.
* Tracking lives in `localStorage`, so clearing it (or using another browser)
  loses tracking access — by design, since the token is never in a URL.
* **Storage split:** the staff session is kept in `sessionStorage`, so it is
  **per browser tab** — a chef and a waiter can be signed in side by side in one
  browser (and two staff never share a session on one terminal). The customer's
  cart and active order stay in `localStorage` so they follow the customer
  across tabs.
* `api.js` defaults to `http://localhost:5000/api`; override with
  `window.CAFE_API_BASE` before loading it if the backend moves.
