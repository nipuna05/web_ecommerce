"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCatalog } from "./catalog";

type Line = { slug: string; qty: number };

type CartCtx = {
  lines: Line[];
  count: number;
  subtotal: number;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "ecom_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const { getProduct } = useCatalog();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const value = useMemo<CartCtx>(() => {
    const add = (slug: string, qty = 1) =>
      setLines((prev) => {
        const found = prev.find((l) => l.slug === slug);
        return found
          ? prev.map((l) => (l.slug === slug ? { ...l, qty: l.qty + qty } : l))
          : [...prev, { slug, qty }];
      });
    const setQty = (slug: string, qty: number) =>
      setLines((prev) =>
        qty <= 0 ? prev.filter((l) => l.slug !== slug) : prev.map((l) => (l.slug === slug ? { ...l, qty } : l)),
      );
    const remove = (slug: string) => setLines((prev) => prev.filter((l) => l.slug !== slug));
    const clear = () => setLines([]);
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + (getProduct(l.slug)?.price ?? 0) * l.qty, 0);
    return { lines, count, subtotal, add, setQty, remove, clear };
  }, [lines, getProduct]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
