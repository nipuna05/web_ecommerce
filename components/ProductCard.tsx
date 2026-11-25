"use client";

import Link from "next/link";
import type { Product } from "@/lib/products";
import TruePrice from "./TruePrice";
import { useCart } from "@/lib/cart";

export default function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  return (
    <div className="card">
      <Link href={`/products/${p.slug}/`} className="card-img" aria-label={p.name}>
        <span>{p.emoji}</span>
      </Link>
      <div className="card-body">
        <div className="muted small">{p.category}</div>
        <Link href={`/products/${p.slug}/`} className="card-title">{p.name}</Link>
        <div className="small">⭐ {p.rating} <span className="muted">({p.reviews})</span></div>
        <div className="card-row">
          <TruePrice price={p.price} />
          {p.stock > 0 ? (
            <button className="btn btn-sm" onClick={() => add(p.slug)}>Add</button>
          ) : (
            <span className="muted small">Out of stock</span>
          )}
        </div>
      </div>
    </div>
  );
}
