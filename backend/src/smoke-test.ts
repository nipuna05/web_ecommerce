// End-to-end smoke test: boots the API with an in-memory DB and exercises the main flows.
process.env.DB_TYPE = "sqljs";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "AdminPass123";
import assert from "node:assert/strict";
import { createApp } from "./main";

async function main() {
  const app = await createApp();
  await app.listen(0);
  const base = (await app.getUrl()).replace("[::1]", "localhost") + "/api";
  const j = async (path: string, init?: RequestInit) => {
    const r = await fetch(base + path, { headers: { "content-type": "application/json" }, ...init });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const order = (items: unknown, extra: object = {}) =>
    j("/orders", {
      method: "POST",
      body: JSON.stringify({ name: "Test User", email: "Test@Example.com", address: "1 Test Street", regionCode: "US", zoneCode: "metro", shippingMethod: "standard", items, ...extra }),
    });

  // Products
  const all = await j("/products");
  assert.equal(all.status, 200);
  assert.equal(all.body.length, 12, "seeded 12 products");
  assert.equal(typeof all.body[0].price, "number", "price is a number");
  assert.equal((await j("/products?category=Home")).body.length, 3);
  assert.equal((await j("/products?search=keyboard")).body.length, 1);
  assert.equal((await j("/products/smart-watch")).body.price, 129);
  assert.equal((await j("/products/nope")).status, 404);

  // Order: 1 x keyboard (59.50) to US => tax 4.76 + shipping 4.99 = 69.25, same as the storefront
  const ok = await order([{ slug: "mechanical-keyboard", qty: 1 }]);
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.body.total, 69.25);
  assert.equal(ok.body.tax, 4.76);
  assert.equal(ok.body.shipping, 4.99);
  assert.match(ok.body.code, /^ORD-[0-9A-F]{10}$/);

  // Free delivery above threshold, express surcharge
  const big = await order([{ slug: "smart-watch", qty: 1 }], { shippingMethod: "express" });
  assert.equal(big.body.shipping, 8, "free standard + 8 express");

  // Delivery depends on the address zone and total weight.
  // 2 mug sets = 3.2 kg -> billed 4 kg. US "regional": 6.49 + 1.30 x 3 = 10.39, tax 8% of 49.98 = 4.00
  const heavy = await order([{ slug: "ceramic-mug-set", qty: 2 }], { zoneCode: "regional" });
  assert.equal(heavy.status, 201, JSON.stringify(heavy.body));
  assert.equal(heavy.body.shipping, 10.39);
  assert.equal(heavy.body.total, 64.37);
  assert.equal(heavy.body.zoneCode, "regional");
  assert.equal(heavy.body.weightKg, 3.2);
  // Same cart to a different area costs a different amount (US metro: 4.99 + 1.00 x 3 = 7.99)
  const metro = await order([{ slug: "ceramic-mug-set", qty: 2 }], { zoneCode: "metro" });
  assert.equal(metro.body.shipping, 7.99);
  // Sri Lanka remote, 2 yoga mats (2.4 kg -> 3 kg): 8.99 + 1.40 x 2 = 11.79; tax 18% of 42 = 7.56
  const lk = await order([{ slug: "yoga-mat", qty: 2 }], { regionCode: "LK", zoneCode: "remote" });
  assert.equal(lk.body.shipping, 11.79);
  assert.equal(lk.body.total, 61.35);
  // A zone that does not belong to the country / unknown zone is rejected
  assert.equal((await order([{ slug: "yoga-mat", qty: 1 }], { zoneCode: "mars" })).status, 400);
  assert.equal((await order([{ slug: "yoga-mat", qty: 1 }], { zoneCode: undefined })).status, 400);

  // Stock was decremented (40 -> 39) and cannot be oversold (smart-watch had 9, 1 sold)
  assert.equal((await j("/products/mechanical-keyboard")).body.stock, 39);
  const over = await order([{ slug: "smart-watch", qty: 9 }]);
  assert.equal(over.status, 400);
  assert.equal((await j("/products/smart-watch")).body.stock, 8, "failed order leaves stock untouched");
  assert.equal((await order([{ slug: "cotton-bedsheet", qty: 1 }])).status, 400, "out of stock");

  // Validation and tampering
  assert.equal((await order([])).status, 400);
  assert.equal((await order([{ slug: "yoga-mat", qty: 0 }])).status, 400);
  assert.equal((await order([{ slug: "ghost", qty: 1 }])).status, 400);
  assert.equal((await order([{ slug: "yoga-mat", qty: 1 }], { regionCode: "ZZ" })).status, 400);
  assert.equal((await order([{ slug: "yoga-mat", qty: 1 }], { email: "bad" })).status, 400);
  assert.equal((await order([{ slug: "yoga-mat", qty: 1 }], { total: 0.01 })).status, 400, "client totals rejected");

  // Order lookup needs the matching email
  const code = ok.body.code;
  assert.equal((await j(`/orders/${code}?email=test@example.com`)).status, 200);
  assert.equal((await j(`/orders/${code}?email=other@example.com`)).status, 404);
  assert.equal((await j(`/orders/${code}`)).status, 404);

  // ---------- Accounts ----------
  const call = (path: string, token: string | null, method = "GET", body?: unknown) =>
    j(path, {
      method,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const reg = (email: string, password = "Password123", name = "Cust") => call("/auth/register", null, "POST", { name, email, password });

  assert.equal((await reg("short@example.com", "short")).status, 400, "short password rejected");
  const c1 = await reg("Cust1@Example.com");
  assert.equal(c1.status, 201, JSON.stringify(c1.body));
  assert.equal(c1.body.user.email, "cust1@example.com", "email normalised");
  assert.equal(c1.body.user.role, "customer");
  assert.equal(c1.body.user.passwordHash, undefined, "hash never returned");
  assert.equal((await reg("cust1@example.com")).status, 409, "duplicate email");
  assert.equal((await call("/auth/login", null, "POST", { email: "cust1@example.com", password: "wrong-password" })).status, 401);
  assert.equal((await call("/auth/login", null, "POST", { email: "nobody@example.com", password: "Password123" })).status, 401);
  const login1 = await call("/auth/login", null, "POST", { email: "cust1@example.com", password: "Password123" });
  assert.equal(login1.status, 201);
  const t1: string = login1.body.token;
  assert.equal((await call("/auth/me", t1)).body.email, "cust1@example.com");
  assert.equal((await call("/auth/me", null)).status, 401);
  assert.equal((await call("/auth/me", "garbage.token.value")).status, 401);

  // Orders link to the account; guests still can order; "mine" is private
  const mineOrder = await call("/orders", t1, "POST", {
    name: "Cust", email: "cust1@example.com", address: "5 Account Road", regionCode: "US", zoneCode: "metro",
    shippingMethod: "standard", items: [{ slug: "water-bottle", qty: 1 }],
  });
  assert.equal(mineOrder.status, 201);
  assert.equal(mineOrder.body.userId, c1.body.user.id);
  assert.equal(ok.body.userId, null, "guest order has no user");
  const mine = await call("/orders/mine", t1);
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.body.map((o: { code: string }) => o.code), [mineOrder.body.code]);
  assert.equal((await call("/orders/mine", null)).status, 401);
  const c2 = await reg("cust2@example.com");
  assert.equal((await call("/orders/mine", c2.body.token)).body.length, 0, "other customer sees nothing");

  // ---------- Admin ----------
  const adminLogin = await call("/auth/login", null, "POST", { email: "admin@test.local", password: "AdminPass123" });
  assert.equal(adminLogin.status, 201, JSON.stringify(adminLogin.body));
  assert.equal(adminLogin.body.user.role, "admin");
  const ta: string = adminLogin.body.token;
  for (const p of ["/admin/orders", "/admin/stats"]) {
    assert.equal((await call(p, null)).status, 401, `${p} needs login`);
    assert.equal((await call(p, t1)).status, 403, `${p} forbidden for customers`);
    assert.equal((await call(p, ta)).status, 200, `${p} ok for admin`);
  }
  assert.equal((await call("/admin/products", t1, "POST", {})).status, 403);
  assert.ok((await call("/admin/orders", ta)).body.length >= 5, "admin sees all orders");

  const np = { slug: "test-lamp", name: "Test Lamp", category: "Home", price: 10.5, stock: 3, weightKg: 0.7, emoji: "🪔", description: "A test product." };
  const created = await call("/admin/products", ta, "POST", np);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal((await call("/admin/products", ta, "POST", np)).status, 409, "duplicate slug");
  assert.equal((await call("/admin/products", ta, "POST", { ...np, slug: "Bad Slug" })).status, 400);
  assert.equal((await call("/admin/products", ta, "POST", { ...np, slug: "x-1", price: -5 })).status, 400);
  assert.equal((await call("/admin/products/test-lamp", ta, "PATCH", { price: 12.25, stock: 9 })).status, 200);
  const pub = await j("/products/test-lamp");
  assert.equal(pub.body.price, 12.25);
  assert.equal(pub.body.stock, 9);
  assert.equal((await call("/admin/products/test-lamp", ta, "PATCH", { slug: "hack" })).status, 400, "slug cannot be changed");
  assert.equal((await call("/admin/stats", ta)).body.lowStock.some((x: { slug: string }) => x.slug === "cotton-bedsheet"), true);

  // Order status + restock on cancel
  const before = (await j("/products/yoga-mat")).body.stock;
  const o3 = await order([{ slug: "yoga-mat", qty: 3 }]);
  assert.equal((await j("/products/yoga-mat")).body.stock, before - 3);
  assert.equal((await call(`/admin/orders/${o3.body.code}/status`, ta, "PATCH", { status: "shipped" })).body.status, "shipped");
  assert.equal((await call(`/admin/orders/${o3.body.code}/status`, ta, "PATCH", { status: "teleported" })).status, 400);
  assert.equal((await call(`/admin/orders/${o3.body.code}/status`, t1, "PATCH", { status: "paid" })).status, 403);
  assert.equal((await call(`/admin/orders/${o3.body.code}/status`, ta, "PATCH", { status: "cancelled" })).body.status, "cancelled");
  assert.equal((await j("/products/yoga-mat")).body.stock, before, "cancel restores stock");
  assert.equal((await call(`/admin/orders/${o3.body.code}/status`, ta, "PATCH", { status: "paid" })).status, 400, "cancelled is final");
  assert.equal((await call("/admin/orders/ORD-NOPE/status", ta, "PATCH", { status: "paid" })).status, 404);

  assert.equal((await call("/admin/products/test-lamp", ta, "DELETE")).status, 200);
  assert.equal((await j("/products/test-lamp")).status, 404);
  assert.equal((await call("/admin/products/test-lamp", ta, "DELETE")).status, 404);

  // ---------- Vendors ----------
  const apply = (token: string | null, shopName = "Dev Tools Shop", description = "We sell small dev tools and templates.") =>
    call("/vendors/apply", token, "POST", { shopName, description });
  const t2: string = c2.body.token;
  assert.equal((await apply(null)).status, 401);
  assert.equal((await apply(t2, "X", "short")).status, 400, "validation");
  const ap = await apply(t2);
  assert.equal(ap.status, 201, JSON.stringify(ap.body));
  assert.equal(ap.body.status, "pending");
  assert.equal(ap.body.slug, "dev-tools-shop");
  assert.equal((await apply(t2)).status, 409, "one application per user");
  assert.equal((await call("/vendors/me", t2)).body.status, "pending");
  const vp = { slug: "vend-widget", name: "Vendor Widget", category: "Gadgets", price: 20, stock: 5, weightKg: 0.3, emoji: "🔧", description: "A vendor product." };
  assert.equal((await call("/vendor/products", t2, "POST", vp)).status, 403, "pending vendor cannot list");
  assert.equal((await call("/vendor/products", null)).status, 401);
  assert.equal((await call("/admin/vendors", t2)).status, 403, "customers cannot see vendor admin");
  assert.equal((await j("/vendors/shop/dev-tools-shop")).status, 404, "pending shop is not public");

  const vlist = await call("/admin/vendors", ta);
  assert.equal(vlist.status, 200);
  const vrec = vlist.body.find((v: { slug: string }) => v.slug === "dev-tools-shop");
  assert.equal(vrec.ownerEmail, "cust2@example.com");
  assert.equal((await call(`/admin/vendors/${vrec.id}/status`, ta, "PATCH", { status: "bogus" })).status, 400);
  assert.equal((await call(`/admin/vendors/${vrec.id}/status`, t2, "PATCH", { status: "approved" })).status, 403);
  assert.equal((await call(`/admin/vendors/${vrec.id}/status`, ta, "PATCH", { status: "approved" })).body.status, "approved");

  // Approved vendor manages only their own products
  const vc = await call("/vendor/products", t2, "POST", vp);
  assert.equal(vc.status, 201, JSON.stringify(vc.body));
  assert.equal((await call("/vendor/products", t2, "POST", vp)).status, 409, "slug unique");
  assert.equal((await call("/vendor/products", t2, "POST", { ...vp, slug: "water-bottle" })).status, 409, "cannot reuse a store product slug");
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { price: 22.5, stock: 7 })).status, 200);
  assert.equal((await call("/vendor/products/water-bottle", t2, "PATCH", { price: 1 })).status, 404, "cannot edit store products");
  assert.equal((await call("/vendor/products/water-bottle", t2, "DELETE")).status, 404, "cannot delete store products");
  assert.deepEqual((await call("/vendor/products", t2)).body.map((p: { slug: string }) => p.slug), ["vend-widget"]);

  const c3 = await reg("cust3@example.com");
  const t3: string = c3.body.token;
  await apply(t3, "Other Shop", "Another shop that sells things.");
  const v3 = (await call("/admin/vendors", ta)).body.find((v: { slug: string }) => v.slug === "other-shop");
  await call(`/admin/vendors/${v3.id}/status`, ta, "PATCH", { status: "approved" });
  assert.equal((await call("/vendor/products/vend-widget", t3, "PATCH", { price: 1 })).status, 404, "other vendor cannot edit");
  assert.equal((await call("/vendor/products/vend-widget", t3, "DELETE")).status, 404, "other vendor cannot delete");

  // New vendor products wait for admin approval: not public, not buyable, and vendors cannot approve themselves
  assert.equal(vc.body.approvalStatus, "pending");
  assert.equal((await j("/products/vend-widget")).status, 404, "pending product is not public");
  assert.equal((await j("/products")).body.some((p: { slug: string }) => p.slug === "vend-widget"), false);
  assert.equal((await j("/vendors/shop/dev-tools-shop")).body.products.length, 0, "pending product not in the shop page");
  assert.equal((await order([{ slug: "vend-widget", qty: 1 }])).status, 400, "pending product cannot be bought");
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { approvalStatus: "approved" })).status, 400, "vendor cannot self-approve");
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { approval: "approved" })).status, 400, "vendor cannot use the admin approval field");
  assert.equal((await call("/admin/products/vend-widget", t2, "PATCH", { approval: "approved" })).status, 403);
  assert.equal((await call("/admin/stats", ta)).body.pendingProducts, 1, "dashboard counts pending products");
  assert.equal((await call("/admin/products/vend-widget", ta, "PATCH", { approval: "rejected" })).status, 200);
  assert.equal((await j("/products/vend-widget")).status, 404, "rejected product is not public");
  assert.equal((await call("/admin/products/vend-widget", ta, "PATCH", { approval: "approved" })).status, 200);
  assert.equal((await j("/products/vend-widget")).status, 200, "approved product is public");
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", {})).status, 400, "empty update is rejected");
  assert.equal((await call("/admin/products/vend-widget", ta, "PATCH", {})).status, 400, "empty admin update is rejected");
  // Price/stock edits keep it live; changing what buyers read sends it back for review
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { price: 22.5 })).body.approvalStatus, "approved");
  assert.equal((await j("/products/vend-widget")).status, 200);
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { description: "Totally different text now." })).body.approvalStatus, "pending");
  assert.equal((await j("/products/vend-widget")).status, 404, "edited listing is re-reviewed");
  assert.equal((await call("/admin/products/vend-widget", ta, "PATCH", { approval: "approved" })).status, 200);
  assert.equal((await call("/admin/stats", ta)).body.pendingProducts, 0);

  // Public view: shows "sold by", never the internal vendorId
  const pubv = await j("/products/vend-widget");
  assert.equal(pubv.status, 200);
  assert.equal(pubv.body.price, 22.5);
  assert.deepEqual(pubv.body.vendor, { name: "Dev Tools Shop", slug: "dev-tools-shop" });
  assert.equal(pubv.body.vendorId, undefined, "vendorId not exposed");
  assert.equal((await j("/products/water-bottle")).body.vendor, null, "store products have no vendor");
  const shop = await j("/vendors/shop/dev-tools-shop");
  assert.equal(shop.status, 200);
  assert.equal(shop.body.products.length, 1);
  assert.equal(shop.body.shop.name, "Dev Tools Shop");

  // Orders carry the vendor; each vendor sees only their own items
  const vo = await order([{ slug: "vend-widget", qty: 2 }, { slug: "yoga-mat", qty: 1 }]);
  assert.equal(vo.status, 201, JSON.stringify(vo.body));
  const mineV = await call("/vendor/orders", t2);
  assert.equal(mineV.status, 200);
  assert.equal(mineV.body.length, 1);
  assert.deepEqual(mineV.body[0].items.map((i: { productSlug: string }) => i.productSlug), ["vend-widget"], "vendor sees only own items");
  assert.equal((await call("/vendor/orders", t3)).body.length, 0, "other vendor sees nothing");

  assert.equal((await j("/vendors/fees")).body.percent, 5, "flat fee published");
  assert.ok(!Number.isNaN(Date.parse(pubv.body.updatedAt)), "listings carry an updatedAt date");

  // Hiding a product removes it from the shop and blocks new orders; admin still sees it
  // 1) The vendor can hide and re-list their own product
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { active: false })).status, 200);
  assert.equal((await j("/products/vend-widget")).status, 404, "vendor-hidden");
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { active: true })).status, 200);
  assert.equal((await j("/products/vend-widget")).status, 200, "vendor re-listed");
  // 2) An admin hide is separate: the vendor cannot undo it, and vendors cannot send the admin switch
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { hidden: false })).status, 400, "vendors cannot use the admin switch");
  assert.equal((await call("/admin/products/vend-widget", ta, "PATCH", { hidden: true })).status, 200);
  assert.equal((await j("/products/vend-widget")).status, 404);
  assert.equal((await j("/products")).body.some((p: { slug: string }) => p.slug === "vend-widget"), false);
  assert.equal((await j("/vendors/shop/dev-tools-shop")).body.products.length, 0, "not in the public shop either");
  assert.equal((await order([{ slug: "vend-widget", qty: 1 }])).status, 400, "hidden product cannot be bought");
  assert.equal((await call("/vendor/products/vend-widget", t2, "PATCH", { active: true })).status, 200);
  assert.equal((await j("/products/vend-widget")).status, 404, "vendor cannot override an admin hide");
  assert.equal((await call("/vendor/products", t2)).body[0].hiddenByAdmin, true, "vendor can see it was hidden by admin");
  assert.equal((await call("/admin/products", ta)).body.some((p: { slug: string }) => p.slug === "vend-widget"), true);
  assert.equal((await call("/admin/products/vend-widget", ta, "PATCH", { hidden: false })).status, 200);
  assert.equal((await j("/products/vend-widget")).status, 200, "admin un-hide restores it");

  // Suspending a vendor hides everything and locks the dashboard
  assert.equal((await call(`/admin/vendors/${vrec.id}/status`, ta, "PATCH", { status: "suspended" })).body.status, "suspended");
  assert.equal((await j("/products/vend-widget")).status, 404);
  assert.equal((await j("/vendors/shop/dev-tools-shop")).status, 404);
  assert.equal((await order([{ slug: "vend-widget", qty: 1 }])).status, 400, "suspended vendor's product cannot be bought");
  assert.equal((await call("/vendor/products", t2)).status, 403);

  // Login rate limit: 5 failures, then even the right password is blocked
  const victim = "ratelimit@example.com";
  await reg(victim);
  for (let i = 0; i < 5; i++) {
    assert.equal((await call("/auth/login", null, "POST", { email: victim, password: "bad-password" + i })).status, 401);
  }
  assert.equal((await call("/auth/login", null, "POST", { email: victim, password: "Password123" })).status, 429, "locked after 5 failures");

  await app.close();
  console.log("ALL SMOKE TESTS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
