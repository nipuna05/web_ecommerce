"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultRegion, getRegion, type Region } from "./pricing";

type Ctx = { region: Region; setRegionCode: (code: string) => void };

const RegionCtx = createContext<Ctx | null>(null);
const KEY = "ecom_region_v1";

export function RegionProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(defaultRegion.code);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setCode(getRegion(saved).code);
    } catch {}
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      region: getRegion(code),
      setRegionCode: (c: string) => {
        setCode(getRegion(c).code);
        try {
          localStorage.setItem(KEY, c);
        } catch {}
      },
    }),
    [code],
  );

  return <RegionCtx.Provider value={value}>{children}</RegionCtx.Provider>;
}

export function useRegion() {
  const c = useContext(RegionCtx);
  if (!c) throw new Error("useRegion must be used inside RegionProvider");
  return c;
}
