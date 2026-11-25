// Server-side copy of the storefront's pricing rules (lib/pricing.ts in the web app).
// The server always recomputes totals itself; it never trusts prices sent by the browser.
// Rates are DEMO values until real tax/delivery rules are added.

export type Region = {
  code: string;
  name: string;
  taxRate: number;
  standardShipping: number;
  expressExtra: number;
  freeShippingOver: number;
};

export const regions: Region[] = [
  { code: "US", name: "United States", taxRate: 0.08, standardShipping: 4.99, expressExtra: 8, freeShippingOver: 75 },
  { code: "GB", name: "United Kingdom", taxRate: 0.2, standardShipping: 6.99, expressExtra: 9, freeShippingOver: 90 },
  { code: "AU", name: "Australia", taxRate: 0.1, standardShipping: 9.99, expressExtra: 12, freeShippingOver: 100 },
  { code: "LK", name: "Sri Lanka", taxRate: 0.18, standardShipping: 5.99, expressExtra: 6, freeShippingOver: 80 },
  { code: "IN", name: "India", taxRate: 0.18, standardShipping: 5.49, expressExtra: 6, freeShippingOver: 80 },
];

export const getRegion = (code: string) => regions.find((r) => r.code === code);

const r2 = (n: number) => Math.round(n * 100) / 100;

export function orderTotals(subtotal: number, region: Region, express = false) {
  const tax = r2(subtotal * region.taxRate);
  const freeShipping = subtotal >= region.freeShippingOver;
  const shipping = r2((freeShipping ? 0 : region.standardShipping) + (express ? region.expressExtra : 0));
  return { subtotal: r2(subtotal), tax, shipping, total: r2(subtotal + tax + shipping) };
}
