"use client";

import { useEffect, useMemo, useState } from "react";
import { categories, products } from "@/lib/products";
import ProductCard from "./ProductCard";

export default function ProductBrowser() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState(150);
  const [inStock, setInStock] = useState(false);

  // Support links like /products/?cat=Home (static export: read the URL on the client).
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("cat");
    if (c && categories.includes(c)) setCat(c);
  }, []);

  const list = useMemo(() => {
    let r = products.filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        p.price <= maxPrice &&
        (!inStock || p.stock > 0) &&
        (p.name + " " + p.description + " " + p.category).toLowerCase().includes(q.trim().toLowerCase()),
    );
    if (sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sort === "rating") r = [...r].sort((a, b) => b.rating - a.rating);
    return r;
  }, [q, cat, sort, maxPrice, inStock]);

  return (
    <div>
      <div className="filters">
        <input
          type="search"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
        <label className="small">
          Up to ${maxPrice}
          <input type="range" min={10} max={150} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} />
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
