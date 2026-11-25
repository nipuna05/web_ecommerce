"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function AddToCart({ slug, stock }: { slug: string; stock: number }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);

  if (stock <= 0) return <p className="muted">Out of stock</p>;

  return (
    <div>
      <div className="qty-row">
        <label>
          Qty{" "}
          <input type="number" min={1} max={stock} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(stock, +e.target.value || 1)))} />
        </label>
        <button
          className="btn"
          onClick={() => {
            add(slug, qty);
            setDone(true);
          }}
        >
          Add to cart
        </button>
      </div>
      {done && (
        <p className="ok">
          Added. <Link href="/cart/">View cart</Link>
        </p>
      )}
    </div>
  );
}
