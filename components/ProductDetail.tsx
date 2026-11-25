"use client";

import Link from "next/link";
import { useCatalog } from "@/lib/catalog";
import AddToCart from "./AddToCart";
import ProductCard from "./ProductCard";
import SoldBy, { Freshness } from "./SoldBy";
import TruePrice from "./TruePrice";

export default function ProductDetail({ slug }: { slug: string }) {
  const { getProduct, products } = useCatalog();
  const p = getProduct(slug);

  if (!p) {
    return (
      <>
        <h1>Product not found</h1>
        <Link href="/products/" className="btn">Back to shop</Link>
      </>
    );
  }

  const related = products.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);

  return (
    <>
      <p className="small"><Link href="/products/">Shop</Link> / {p.category} / {p.name}</p>
      <div className="detail">
        <div className="detail-img"><span>{p.emoji}</span></div>
        <div>
          <h1>{p.name}</h1>
          <SoldBy p={p} />
          <div className="small">⭐ {p.rating} <span className="muted">({p.reviews} reviews)</span></div>
          <TruePrice price={p.price} weightKg={p.weightKg} detail />
          <p>{p.description}</p>
          <Freshness updatedAt={p.vendor ? p.updatedAt : undefined} />
          <p className="small muted">
            {p.stock > 0 ? (p.stock <= 10 ? `Only ${p.stock} left` : "In stock") : "Out of stock"}
          </p>
          <AddToCart slug={p.slug} stock={p.stock} />
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <h2>You may also like</h2>
          <div className="grid">{related.map((r) => <ProductCard key={r.slug} p={r} />)}</div>
        </section>
      )}
    </>
  );
}
