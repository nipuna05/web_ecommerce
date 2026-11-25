"use client";

import { useRegion } from "@/lib/region";
import { regions } from "@/lib/pricing";

export default function RegionPicker() {
  const { region, setRegionCode } = useRegion();
  return (
    <label className="region">
      <span className="small muted">Deliver to</span>
      <select value={region.code} onChange={(e) => setRegionCode(e.target.value)} aria-label="Delivery country">
        {regions.map((r) => (
          <option key={r.code} value={r.code}>{r.name}</option>
        ))}
      </select>
    </label>
  );
}
