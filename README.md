# ShopEase: web_ecommerce

A mobile-first, multi-category online store: a Next.js storefront plus a NestJS + PostgreSQL API.

**Live demo:** https://nipuna05.github.io/web_ecommerce/ (static storefront with demo data)

## Features

- Home, product list (search, category, sort, price and stock filters), product page
- Cart saved in the browser, guest checkout with delivery options and tax, order history
- **True-price promise:** every price is shown delivered (item + tax + delivery) for the chosen country, and the cart and checkout match it exactly
- Responsive layout, light and dark theme

On GitHub Pages the site uses built-in demo data (`lib/products.ts`) and keeps orders in the browser only. With the API running, products and orders come from PostgreSQL. No real payments yet. Tax and delivery rates are demo values.

## Run the storefront

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in ./out
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to use the API. Leave it unset for demo data.

## API and database (`backend/`)

NestJS + TypeORM. Products and orders are stored in PostgreSQL. Order totals, tax, delivery and stock are recomputed on the server; prices sent by the browser are never trusted.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/products?search=&category=` | List products |
| `GET /api/products/:slug` | One product |
| `POST /api/orders` | Place an order (validates, checks stock, saves) |
| `GET /api/orders/:code?email=` | Look up an order (the email must match) |

**With Docker** (needs Docker Desktop): `docker compose up --build` starts PostgreSQL and the API on http://localhost:4000/api.

**Without Docker** (in-memory database, data resets on restart):

```bash
cd backend
npm install
npm test                      # end-to-end smoke test
DB_TYPE=sqljs npm run dev     # API on http://localhost:4000/api
```

Tables are auto-created (`synchronize`), which suits development. Add migrations before production.

## Deploy (GitHub Pages)

1. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes the storefront.
2. One time only: repo **Settings → Pages → Source: GitHub Actions**.

GitHub Pages serves static files only, so the API needs a separate host (Azure, Render, etc.).

## Roadmap

1. **Phase 1:** static storefront with the true-price promise (done)
2. **Phase 2:** API + PostgreSQL for products and orders (done). Next: accounts and login, payments, reviews, admin panel, real tax and delivery rules, price history, hosting the API online
3. **Phase 3:** AI shopping assistant, group cart, owner's wallet, agent-ready catalog
