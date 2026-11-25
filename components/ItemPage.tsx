"use client";

import { useEffect, useState } from "react";
import ProductDetail from "./ProductDetail";

/** Product page for products created after the site was built. The slug comes from ?s=slug. */
export default function ItemPage() {
  const [slug, setSlug] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setSlug(new URLSearchParams(window.location.search).get("s"));
  }, []);

  if (slug === undefined) return <p>Loading…</p>;
  return <ProductDetail slug={slug ?? ""} />;
}
