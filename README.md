# Cafe Frontend (cafe-fe)

Frontend for **The Daily Grind Café** — a static HTML/Tailwind CSS app served with `http-server`.

## Pages

| Page | Purpose |
|------|---------|
| `index.html` | Home / landing page |
| `menu.html` | Browse menu items, filter by category, add to cart |
| `cart.html` | Review cart, see tax/prep-time summary, place order |
| `app.js` | Shared script: API base URL, floating order timer, confetti |

## Getting Started

```bash
npm install
npm start        # serves the app on http://localhost:3000
```

## Backend

The app expects the cafe backend (`cafe-be`) to be running and reachable at the API base URL defined in `app.js`:

```js
const API_BASE = 'http://localhost:5001/api';
```

Endpoints used:
- `GET  {API_BASE}/menu`   — fetch menu items
- `POST {API_BASE}/orders` — place an order

> Note: the backend's default port is **5000**, while `app.js` points at **5001**. Make sure both sides use the same port before testing the full flow.

## Tech Stack

- HTML + Tailwind CSS (CDN)
- Vanilla JavaScript
- `http-server` for local development
