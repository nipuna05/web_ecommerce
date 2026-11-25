"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/products";
import { useCatalog } from "@/lib/catalog";
import { apiEnabled, createOrder } from "@/lib/api";
import { orderTotals } from "@/lib/pricing";
import { useRegion } from "@/lib/region";

export default function CheckoutPage() {
  const { lines, subtotal, weightKg, clear } = useCart();
  const { region, zone } = useRegion();
  const [ship, setShip] = useState<"standard" | "express">("standard");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getProduct } = useCatalog();

  const std = orderTotals(subtotal, weightKg, region, zone, false);
  const exp = orderTotals(subtotal, weightKg, region, zone, true);
  const t = ship === "express" ? exp : std;
  const { tax, shipping, total } = t;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name"));
    const email = String(f.get("email"));
    const address = String(f.get("address"));

    let id = "ORD-" + Date.now().toString(36).toUpperCase();
    let orderTotal = total;
    if (apiEnabled) {
      // The server recomputes prices and checks stock; we only send what was chosen.
      setBusy(true);
      try {
        const saved = await createOrder({
          name,
          email,
          address,
          regionCode: region.code,
          zoneCode: zone.code,
          shippingMethod: ship,
          items: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
        });
        id = saved.code;
        orderTotal = saved.total;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not place the order.");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    const order = {
      id,
      date: new Date().toISOString(),
      name,
      email,
      address,
      total: orderTotal,
      items: lines.map((l) => ({ ...l, name: getProduct(l.slug)?.name })),
    };
    try {
      const prev = JSON.parse(localStorage.getItem("ecom_orders_v1") || "[]");
      localStorage.setItem("ecom_orders_v1", JSON.stringify([order, ...prev]));
    } catch {}
    clear();
    setOrderId(id);
  }

  if (orderId) {
    return (
      <>
        <h1>Thank you!</h1>
        <p>Your demo order <strong>{orderId}</strong> was placed. No real payment was taken.</p>
        <Link href="/account/" className="btn">View my orders</Link>
      </>
    );
  }

  if (lines.length === 0) {
    return (
      <>
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
        <Link href="/products/" className="btn">Continue shopping</Link>
      </>
    );
  }

  return (
    <>
      <h1>Checkout</h1>
      <div className="checkout">
        <form onSubmit={submit} className="form">
          <h2>Guest checkout</h2>
          <label>Full name<input name="name" required autoComplete="name" /></label>
          <label>Email<input name="email" type="email" required autoComplete="email" /></label>
          <p className="small">
            📍 Delivering to <strong>{zone.name}, {region.name}</strong>. To change the area, use the "Deliver to" bar at the top; prices update.
          </p>
          <label>Street address<textarea name="address" required rows={3} autoComplete="street-address" placeholder="House no., street, city, postal code" /></label>
          <fieldset>
            <legend>Delivery</legend>
            <label className="inline"><input type="radio" checked={ship === "standard"} onChange={() => setShip("standard")} /> Standard ({zone.standardDays}) {std.freeShipping ? "Free" : money(std.shipping)}</label>
            <label className="inline"><input type="radio" checked={ship === "express"} onChange={() => setShip("express")} /> Express ({zone.expressDays}) {money(exp.shipping)}</label>
          </fieldset>
          <p className="small muted">Payment is a placeholder in this demo. A real gateway comes with the backend.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Placing order…" : "Place order"}</button>
        </form>
        <aside className="summary">
          <h2>Order summary</h2>
          {lines.map((l) => {
            const p = getProduct(l.slug);
            return p ? <div className="row small" key={l.slug}><span>{p.name} × {l.qty}</span><span>{money(p.price * l.qty)}</span></div> : null;
          })}
          <hr />
          <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="row"><span>Delivery to {zone.name} ({weightKg.toFixed(2)} kg)</span><span>{shipping === 0 ? "Free" : money(shipping)}</span></div>
          <div className="row"><span>Tax ({Math.round(region.taxRate * 100)}%)</span><span>{money(tax)}</span></div>
          <div className="row total"><strong>Total</strong><strong>{money(total)}</strong></div>
        </aside>
      </div>
    </>
  );
}
