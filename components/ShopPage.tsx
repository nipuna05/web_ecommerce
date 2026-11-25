"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiEnabled, apiRequest } from "@/lib/api";
import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

type Shop = { shop: { name: string; slug: string; description: string }; products: Product[] };

/** Public vendor shop. Static export can't pre-build unknown shops, so the slug comes from ?v=slug. */
export default function ShopPage() {
  const [data, setData] = useState<Shop | null>(null);
  const [state, setState] = useState<"loading" | "missing">("loading");

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("v");
    if (!apiEnabled || !slug) {
      setState("missing");
      return;
    }
    apiRequest<Shop>(`/vendors/shop/${encodeURIComponent(slug)}`)
      .then(setData)
      .catch(() => setState("missing"));
  }, []);

  if (data) {
    return (
      <>
        <h1>{data.shop.name}</h1>
        <p className="muted">{data.shop.description}</p>
        {data.products.length === 0 ? <p>No products listed yet.</p> : (
          <div className="grid">{data.products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        )}
      </>
    );
  }
  if (state === "loading") return <p>Loading…</p>;
  return (
    <>
      <h1>Shop not found</h1>
      <Link href="/products/" className="btn">Back to shop</Link>
    </>
  );
}
