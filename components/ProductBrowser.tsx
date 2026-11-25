"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog";
import ProductCard from "./ProductCard";

const STORE = "store"; // products sold by the store itself (no vendor)

export default function ProductBrowser() {
  const { products, categories } = useCatalog();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [shop, setShop] = useState("all"); // "all" | "store" | <vendor slug>
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState<number | null>(null); // null = no limit
  const [inStock, setInStock] = useState(false);

  // Shops that currently have products. The shop filter only shows when there is at least one vendor.
  const shops = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) if (p.vendor) m.set(p.vendor.slug, p.vendor.name);
    return [...m].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // The slider always covers the most expensive product, so nothing is hidden by default.
  const topPrice = useMemo(() => Math.max(10, Math.ceil(Math.max(0, ...products.map((p) => p.price)))), [products]);
  const limit = maxPrice === null ? topPrice : Math.min(maxPrice, topPrice);

  // Support links like /products/?cat=Home and /products/?shop=<slug> (static export: read the URL on the client).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("cat");
    if (c && categories.includes(c)) setCat(c);
    const s = params.get("shop");
    if (s && (s === STORE || shops.some((x) => x.slug === s))) setShop(s);
  }, [categories, shops]);

  const list = useMemo(() => {
    let r = products.filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        (shop === "all" || (shop === STORE ? !p.vendor : p.vendor?.slug === shop)) &&
        p.price <= limit &&
        (!inStock || p.stock > 0) &&
        (p.name + " " + p.description + " " + p.category + " " + (p.vendor?.name ?? ""))
          .toLowerCase()
          .includes(q.trim().toLowerCase()),
    );
    if (sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sort === "rating") r = [...r].sort((a, b) => b.rating - a.rating);
    return r;
  }, [products, q, cat, shop, sort, limit, inStock]);

  return (
    <div>
      <div className="filters">
        <input
          type="search"
          placeholder="Search products or shops…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        {shops.length > 0 && (
          <select value={shop} onChange={(e) => setShop(e.target.value)} aria-label="Shop">
            <option value="all">All shops</option>
            <option value={STORE}>ShopEase (store)</option>
            {shops.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
        <label className="small">
          Up to ${limit}
          <input type="range" min={1} max={topPrice} value={limit} onChange={(e) => setMaxPrice(+e.target.value)} />
        </label>
        <label className="small">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /> In stock only
        </label>
      </div>
      <p className="muted small">{list.length} product{list.length === 1 ? "" : "s"}</p>
      {list.length === 0 ? (
        <p>No products match. Try clearing a filter.</p>
      ) : (
        <div className="grid">{list.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
      )}
    </div>
  );
}
