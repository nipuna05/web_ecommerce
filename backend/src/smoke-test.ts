// End-to-end smoke test: boots the API with an in-memory DB and exercises the main flows.
process.env.DB_TYPE = "sqljs";
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

  await app.close();
  console.log("ALL SMOKE TESTS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
