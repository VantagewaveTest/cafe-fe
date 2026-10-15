# Cafe Frontend (cafe-fe)

Frontend for **The Daily Grind Café** — a static HTML/Tailwind CSS app served with `http-server`.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home / landing page |
| `menu.html` | Browse menu items, filter by category, add to cart |
| `cart.html` | Review cart, add table number, place order, get Order ID |
| `orders-view.html` | Role-scoped order lookup (Customer / Chef tabs) |
| `app.js` | Shared script: API base URL, floating order timer, confetti |

## Getting Started

```bash
npm install
npm start        # serves the app on http://localhost:3000
```

## Backend

The app expects the cafe backend (`cafe-be`) to be running and reachable at the API base URL defined in `app.js`:

```js
const API_BASE = 'http://localhost:5000/api';
```

Endpoints used:
- `GET  {API_BASE}/menu`   — fetch menu items
- `POST {API_BASE}/orders` — place an order (supports `tableNumber` and `paymentMethod`)
- `GET  {API_BASE}/orders/:orderId?role=customer|chef` — role-scoped order lookup

### Role-scoped visibility

Each role sees only its allowed fields (see `orders-view.html`):

| Role | Sees | Hidden |
|------|------|--------|
| `customer` | their order: items, price, total, status, ETA | chef/kitchen details, other orders |
| `chef` | orderId, table, items + qty + prepTime, status | prices, payment, customer name |

## Tech Stack

- HTML + Tailwind CSS (CDN)
- Vanilla JavaScript
- `http-server` for local development
