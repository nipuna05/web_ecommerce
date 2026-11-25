"use client";

import { useRegion } from "@/lib/region";
import { regions } from "@/lib/pricing";

/** Delivery location bar: country, then the area within it. Every price on the site follows this. */
export default function RegionPicker() {
  const { region, zone, setRegionCode, setZoneCode } = useRegion();
  return (
    <div className="deliverbar">
      <div className="container deliverbar-inner">
        <span className="small">📍 Deliver to</span>
        <select value={region.code} onChange={(e) => setRegionCode(e.target.value)} aria-label="Delivery country">
          {regions.map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
        <select value={zone.code} onChange={(e) => setZoneCode(e.target.value)} aria-label="Delivery area">
          {region.zones.map((x) => (
            <option key={x.code} value={x.code}>{x.name}</option>
          ))}
        </select>
        <span className="small muted deliverbar-note">Prices include tax and delivery</span>
      </div>
    </div>
  );
}
