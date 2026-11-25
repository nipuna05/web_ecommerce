"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultRegion, getRegion, getZone, type Region, type Zone } from "./pricing";

type Ctx = {
  region: Region;
  zone: Zone;
  setRegionCode: (code: string) => void; // resets the zone to the country's first zone
  setZoneCode: (code: string) => void;
};

const RegionCtx = createContext<Ctx | null>(null);
const KEY = "ecom_delivery_v2";

export function RegionProvider({ children }: { children: ReactNode }) {
  const [sel, setSel] = useState({ region: defaultRegion.code, zone: defaultRegion.zones[0].code });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved) {
        const r = getRegion(saved.region);
        setSel({ region: r.code, zone: getZone(r, saved.zone).code });
      }
    } catch {}
  }, []);

  const value = useMemo<Ctx>(() => {
    const region = getRegion(sel.region);
    const zone = getZone(region, sel.zone);
    const save = (s: { region: string; zone: string }) => {
      setSel(s);
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch {}
    };
    return {
      region,
      zone,
      setRegionCode: (code) => {
        const r = getRegion(code);
        save({ region: r.code, zone: r.zones[0].code });
      },
      setZoneCode: (code) => save({ region: region.code, zone: getZone(region, code).code }),
    };
  }, [sel]);

  return <RegionCtx.Provider value={value}>{children}</RegionCtx.Provider>;
}

export function useRegion() {
  const c = useContext(RegionCtx);
  if (!c) throw new Error("useRegion must be used inside RegionProvider");
  return c;
}
