"use client";

import { deliveredPrice } from "@/lib/pricing";
import { money } from "@/lib/products";
import { useRegion } from "@/lib/region";

/** Shows the all-in delivered price. `detail` adds the breakdown. */
export default function TruePrice({ price, weightKg, detail = false }: { price: number; weightKg: number; detail?: boolean }) {
  const { region, zone } = useRegion();
  const t = deliveredPrice(price, weightKg, region, zone);

  return (
    <div className="trueprice">
      <div className="tp-main">
        <strong className={detail ? "tp-big" : ""}>{money(t.total)}</strong>
        <span className="small muted"> delivered to {zone.name}</span>
      </div>
      {detail ? (
        <>
          <ul className="tp-break small">
            <li><span>Item</span><span>{money(t.subtotal)}</span></li>
            <li><span>Tax ({Math.round(region.taxRate * 100)}%)</span><span>{money(t.tax)}</span></li>
            <li>
              <span>Delivery to {zone.name}, {region.name} ({zone.standardDays})</span>
              <span>{t.freeShipping ? "Free" : money(t.shipping)}</span>
            </li>
            <li className="tp-total"><span>You pay</span><span>{money(t.total)}</span></li>
          </ul>
          <p className="small muted">Weight {weightKg} kg. Delivery changes with your area and the order's total weight.</p>
          <p className="small ok">True-price promise: this is the final price for a one-item order. Nothing is added at checkout.</p>
        </>
      ) : (
        <div className="small muted">Item {money(t.subtotal)} + tax{t.freeShipping ? "" : " + delivery"}</div>
      )}
    </div>
  );
}
