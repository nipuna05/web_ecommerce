"use client";

import Link from "next/link";
import { useCatalog } from "@/lib/catalog";
import ProductCard from "./ProductCard";

export function CategoryChips() {
  const { categories } = useCatalog();
  return (
    <div className="chips">
      {categories.filter((c) => c !== "All").map((c) => (
        <Link key={c} href={`/products/?cat=${encodeURIComponent(c)}`} className="chip">{c}</Link>
      ))}
    </div>
  );
}

export function TopRated() {
  const { products } = useCatalog();
  const top = [...products].sort((a, b) => b.rating - a.rating).slice(0, 4);
  return <div className="grid">{top.map((p) => <ProductCard key={p.slug} p={p} />)}</div>;
}
