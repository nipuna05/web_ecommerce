"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { getProduct, money } from "@/lib/products";

const SHIPPING = { standard: 4.99, express: 12.99 };
const TAX_RATE = 0.08;

export default function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const [ship, setShip] = useState<"standard" | "express">("standard");
  const [orderId, setOrderId] = useState<string | null>(null);

  const shipping = lines.length ? SHIPPING[ship] : 0;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = "ORD-" + Date.now().toString(36).toUpperCase();
    const order = {
      id,
      date: new Date().toISOString(),
      name: String(f.get("name")),
      email: String(f.get("email")),
      address: String(f.get("address")),
      total,
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
          <label>Delivery address<textarea name="address" required rows={3} autoComplete="street-address" /></label>
          <fieldset>
            <legend>Delivery</legend>
            <label className="inline"><input type="radio" checked={ship === "standard"} onChange={() => setShip("standard")} /> Standard (3-5 days) {money(SHIPPING.standard)}</label>
            <label className="inline"><input type="radio" checked={ship === "express"} onChange={() => setShip("express")} /> Express (1-2 days) {money(SHIPPING.express)}</label>
          </fieldset>
          <p className="small muted">Payment is a placeholder in this demo. A real gateway comes with the backend.</p>
          <button className="btn" type="submit">Place order</button>
        </form>
        <aside className="summary">
          <h2>Order summary</h2>
          {lines.map((l) => {
            const p = getProduct(l.slug);
            return p ? <div className="row small" key={l.slug}><span>{p.name} × {l.qty}</span><span>{money(p.price * l.qty)}</span></div> : null;
          })}
          <hr />
          <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="row"><span>Delivery</span><span>{money(shipping)}</span></div>
          <div className="row"><span>Tax (8%)</span><span>{money(tax)}</span></div>
          <div className="row total"><strong>Total</strong><strong>{money(total)}</strong></div>
        </aside>
      </div>
    </>
  );
}
