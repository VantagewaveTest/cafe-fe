# Daily Grind Cafe — Frontend (`cafe-fe`)

Static HTML/JS frontend for the Daily Grind Cafe demo: customer menu, cart and
checkout, live order tracking, plus separate Chef and Waiter dashboards. It is a
pure consumer of the backend API — no pricing, authorization, or order-state
logic lives here.

## Setup

The pages are static and can be served by any static file server. The repo's
`npm start` serves them on port 3000:

```bash
npm install        # installs http-server (dev dependency)
npm start          # http://localhost:3000
```

Make sure `cafe-be` is running on port **5000** first (`cd ../cafe-be && npm start`).

### API base URL

All pages share one configurable API base from `app.js`:

```js
const API_BASE = window.CAFE_API_BASE || 'http://localhost:5000/api';
```

Default is `http://localhost:5000/api`. To point elsewhere, either set
`window.CAFE_API_BASE = 'http://host:port/api'` before `app.js` loads, or append
`?apiBase=http://host:port/api` to any page URL. The old frontend used port
5001; it now defaults to the backend's **5000**.

## Pages

| Page | Audience | What it does |
|------|----------|--------------|
| `index.html` | Customer | Landing page |
| `menu.html` | Customer | Live menu from `GET /api/menu`, add to cart |
| `cart.html` | Customer | Cart, table/counter selection, simulated payment, checkout |
| `tracking.html` | Customer | Private live order status, polled every ~3s via `X-Order-Token` |
| `login.html` | Staff | `POST /api/auth/login`, stores server-verified identity + role |
| `chef.html` | CHEF | FIFO pending queue, start/ready, prep history, top-prepared stats |
| `waiter.html` | WAITER | Preparing/ready/picked-up queues, pickup/serve, service history |

## Behaviour notes

- **Polling:** `tracking.html`, `chef.html`, and `waiter.html` refresh every ~3
  seconds so changes made in other sessions appear without a manual reload.
- **Simulated payment:** checkout sends a payment method but no real charge is
  made; the UI labels this as simulation.
- **Countdown is an estimate only:** the floating timer and the tracker's
  countdown never mark an order READY. Readiness and the confetti celebration
  appear only when the **backend** reports `READY`.
- **Authorization is server-side:** Chef/Waiter pages hide actions they can't
  perform and rely on the backend's role checks. Hiding a button is a UI
  convenience, not a security control — the server enforces roles.
- **Roles come from the server:** login stores the role the backend verified,
  not a user-selected role.
- **Error states:** loading, empty, network-error, 401 (unauthorized), and 403
  (forbidden) are surfaced with clear messages; expired staff sessions bounce to
  the login page.

## Statuses

The tracker displays all five backend statuses: `PENDING`, `PREPARING`,
`READY`, `PICKED_UP`, `SERVED`.

## Testing

These are static pages with no build step or unit-test framework. Verify
end-to-end with the backend running (see `cafe-be/README.md` for its `npm test`):

1. Start `cafe-be` (`:5000`) and `cafe-fe` (`:3000`).
2. Customer: add items → cart → choose table/counter → simulated checkout →
   land on `tracking.html` showing `PENDING`.
3. Open `chef.html` in a second browser/session, log in as `chef1`, and use
   **Start Preparing** then **Mark Ready**.
4. Open `waiter.html` in a third session, log in as `waiter1`, and use
   **Mark Picked Up** then **Mark Served**.
5. Confirm the customer tracker reflects each change within ~3s with no reload,
   and the celebration appears only at `READY`.

## Known limitations

- Staff session and cart are stored in `localStorage`; clearing site data resets
  them.
- No client-side routing or framework — plain multi-page HTML.
- No offline support or request retry/backoff beyond the polling loop.

## AI-code review

This frontend was generated with AI assistance and then reviewed and verified by
hand: the checkout payload was checked to send only trusted menu IDs/quantities
(no client prices), the countdown was confirmed to never flip status or
celebrate early, role gating was confirmed to defer to the server, and the
customer → chef → waiter journey was walked through live across three browser
sessions to confirm each status change appears within one polling cycle.
