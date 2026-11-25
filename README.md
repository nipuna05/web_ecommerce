# ShopEase: web_ecommerce

A mobile-first, multi-category online store. Phase 1 is a static storefront (Next.js + TypeScript) with demo data, deployed to GitHub Pages.

**Live site:** https://nipuna05.github.io/web_ecommerce/ (after the first deploy and enabling Pages, see below)

## Phase 1 features

- Home, product list (search, category, sort, price and stock filters), product page
- Cart saved in the browser, guest checkout with delivery options and tax, demo order history
- Responsive layout, light and dark theme

No backend yet: products live in `lib/products.ts`, and orders are stored in the browser only. No real payments.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in ./out
```

## Deploy (GitHub Pages)

1. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes.
2. One time only: repo **Settings → Pages → Source: GitHub Actions**.

## Roadmap

1. **Phase 1:** static storefront (this)
2. **Phase 2:** NestJS API, PostgreSQL, real accounts, payments, reviews, true-price promise, price history
3. **Phase 3:** AI shopping assistant, group cart, owner's wallet, agent-ready catalog

Hosting note: GitHub Pages serves static files only, so the Phase 2 backend needs a separate host (Azure, Render, etc.).
