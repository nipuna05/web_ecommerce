"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL, apiEnabled } from "./api";
import { products as demoProducts, type Product } from "./products";

type Catalog = {
  products: Product[];
  categories: string[];
  getProduct: (slug: string) => Product | undefined;
  source: "demo" | "api";
};

const Ctx = createContext<Catalog | null>(null);

/** Uses the API's products when NEXT_PUBLIC_API_URL is set and reachable, otherwise the demo catalog. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [source, setSource] = useState<"demo" | "api">("demo");

  useEffect(() => {
    if (!apiEnabled) return;
    fetch(`${API_URL}/products`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: Product[]) => {
        if (Array.isArray(list) && list.length) {
          setProducts(list);
          setSource("api");
        }
      })
      .catch(() => {
        /* API unreachable: keep showing demo data */
      });
  }, []);

  const value = useMemo<Catalog>(
    () => ({
      products,
      categories: ["All", ...Array.from(new Set(products.map((p) => p.category)))],
      getProduct: (slug) => products.find((p) => p.slug === slug),
      source,
    }),
    [products, source],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog must be used inside CatalogProvider");
  return c;
}
