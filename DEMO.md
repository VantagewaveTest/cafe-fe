# Demo & evidence — cafe-fe

The frontend is plain HTML + Tailwind (CDN) + vanilla JS. Two ways to demo it.

---

## 1. Automated checks

```bash
cd cafe-fe
npm test            # 34 passing (see TEST_RESULTS.md)
```

For the backend lifecycle, end-to-end, with live requests:

```bash
cd cafe-be
node scripts/demo.js        # prints "RESULT: 29 / 29 checks passed"
```

---

## 2. Manual walkthrough (the full story)

Start both services:

```bash
# terminal 1
cd cafe-be && npm start          # http://localhost:5000

# terminal 2
cd cafe-fe && npx http-server -p 3000   # http://localhost:3000
```

Open `http://localhost:3000/index.html` (use `http://`, not `file://`).

| Step | Page | Action | Expected |
| --- | --- | --- | --- |
| 1 | `menu.html` | add a Coffee and a Waffle | cart badge updates |
| 2 | `cart.html` | *Dine-in*, table **7**, place order | confirmation with the **server-computed** total + order id |
| 3 | `track.html` | watch | shows `PENDING`, refreshes by itself every ~3 s |
| 4 | `staff-login.html` | `chef` / `chef123` | redirected to `chef.html` |
| 5 | `chef.html` | *Start preparing*, then *Mark ready* | ticket moves PENDING → PREPARING → READY; counts update |
| 6 | `track.html` | watch | becomes `READY`; confetti fires (backend-driven, not the countdown) |
| 7 | `staff-login.html` | `waiter` / `waiter123` (new tab) | redirected to `waiter.html` |
| 8 | `waiter.html` | *Picked up*, then *Served* | READY → PICKED_UP → SERVED |
| 9 | `track.html` | watch | shows `SERVED` |
| 10 | `chef.html` | history + top items | the completed order and "Espresso ×2" appear |

> The chef and waiter sessions are per tab (`sessionStorage`), so you can sign in
> as both side by side in one browser.

### Security to point out in the demo

* Open `track.html` after clearing `localStorage` — tracking is refused (the
  token, not the order id, is the key).
* Paste another order's id into the URL by hand — you cannot read it without its
  token (`401`/`403`).
* Sign in as `chef`, then open `waiter.html` — you are bounced back; the role is
  decided by the server, never by the page or URL.

### Evidence to capture

* the checkout confirmation showing server totals,
* the tracker at all five statuses,
* the chef queue and the waiter board mid-flow,
* `npm test` (**34 passing**) and `node scripts/demo.js` (**29 / 29**).

Known limitations are listed in the `README.md`.
