"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { getProduct, money } from "@/lib/products";

export default function CartPage() {
  const { lines, subtotal, setQty, remove } = useCart();

  if (lines.length === 0) {
    return (
      <>
        <h1>Your cart</h1>
        <p>Your cart is empty.</p>
        <Link href="/products/" className="btn">Continue shopping</Link>
      </>
    );
  }

  return (
    <>
      <h1>Your cart</h1>
      <div className="cart">
        {lines.map((l) => {
          const p = getProduct(l.slug);
          if (!p) return null;
          return (
            <div className="cart-line" key={l.slug}>
              <span className="cart-emoji">{p.emoji}</span>
              <div className="cart-info">
                <Link href={`/products/${p.slug}/`}>{p.name}</Link>
                <div className="small muted">{money(p.price)} each</div>
              </div>
              <input
                type="number"
                min={1}
                max={p.stock}
                value={l.qty}
                aria-label={`Quantity for ${p.name}`}
                onChange={(e) => setQty(l.slug, Math.min(p.stock, +e.target.value || 1))}
              />
              <strong>{money(p.price * l.qty)}</strong>
              <button className="link-btn" onClick={() => remove(l.slug)}>Remove</button>
            </div>
          );
        })}
      </div>
      <div className="summary">
        <div className="row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        <p className="small muted">Delivery and tax are shown at checkout.</p>
        <Link href="/checkout/" className="btn">Checkout</Link>
      </div>
    </>
  );
}
