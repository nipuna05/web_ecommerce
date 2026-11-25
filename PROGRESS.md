# Progress and next steps

Last updated: 2026-11-25. Everything below is committed and pushed to `main`.

## Live
- Site (GitHub Pages): https://nipuna05.github.io/web_ecommerce/
- API (Render, free): https://ecommerce-api-yb1z.onrender.com/api  (GitHub variable `API_URL` points the site at it)
- Free Render database is deleted about 30 days after creation (created 2026-11-25). Upgrade or move before real data.

## Done
- Phase 1: Next.js static storefront, cart, checkout, true-price promise (delivered price by country, area and weight)
- Phase 2: NestJS + PostgreSQL API, accounts (JWT), admin panel, order status, restock on cancel
- Vendors: apply at `/sell/`, admin approves, vendor dashboard `/vendor/`, public shops `/store/?v=<slug>`, "Sold by", flat fee calculator (`COMMISSION_PERCENT`, default 5)
- Product approval: new vendor products are pending until an admin approves; name/description/category edits re-queue; admin hide is separate and vendors cannot undo it
- Shop filter on `/products/`, catalog refreshes on navigation/focus
- Backend end-to-end test: `cd backend && npm test` (must print ALL SMOKE TESTS PASSED)

## Next (agreed order)
1. **Apps and projects** (digital items): listing type (physical / app / project), demo link + download link (we do not host files), license, "last updated" health badge (partly done), clear refund rule.
2. **Free classified ads + admin sponsored slots**: categories, city/area, expiry, admin moderation; sponsored banner slots chosen by admin.
3. Trust features from the research: verified-purchase-only reviews and a trust ladder, scam shield for ads (warn on gift cards, overpayment, paying outside the site, prices far below the category norm).
4. Later: payments (needs a provider such as Stripe), payment held until delivery, vendor payouts, multi-vendor shipping, product images, real tax and carrier rates, migrations before production.

## Known limits
- One delivery charge per order even with several vendors.
- Vendors cannot mark their items shipped yet; only admins change order status.
- Login token is in localStorage (API and site are on different domains).
- Product pages for products created after the build use `/item/?s=<slug>`.
- Tax and delivery rates are demo values.

## Handy
- Never commit `.env`; admin account comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` set in the Render dashboard.
- Local build with the Pages path (Git Bash): `MSYS_NO_PATHCONV=1 NEXT_PUBLIC_BASE_PATH=/web_ecommerce npm run build`
