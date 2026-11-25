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
