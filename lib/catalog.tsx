"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { API_URL, apiEnabled } from "./api";
import { products as demoProducts, type Product } from "./products";

type Catalog = {
  products: Product[];
  categories: string[];
  getProduct: (slug: string) => Product | undefined;
  source: "demo" | "api";
  refresh: () => void;
};

const Ctx = createContext<Catalog | null>(null);

/**
 * Uses the API's products when NEXT_PUBLIC_API_URL is set and reachable, otherwise the demo catalog.
 * The list is reloaded on every page change and when the tab regains focus, so products that a
 * vendor or admin just added or hid show up without a full page reload.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [source, setSource] = useState<"demo" | "api">("demo");
  const pathname = usePathname();

  const refresh = useCallback(() => {
    if (!apiEnabled) return;
    fetch(`${API_URL}/products`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: Product[]) => {
        if (Array.isArray(list) && list.length) {
          setProducts(list);
          setSource("api");
        }
      })
      .catch(() => {
        /* API unreachable: keep showing what we have */
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const value = useMemo<Catalog>(
    () => ({
      products,
      categories: ["All", ...Array.from(new Set(products.map((p) => p.category)))],
      getProduct: (slug) => products.find((p) => p.slug === slug),
      source,
      refresh,
    }),
    [products, source, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog must be used inside CatalogProvider");
  return c;
}
