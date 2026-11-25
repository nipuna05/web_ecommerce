// True-price promise: one set of rules used by product cards, product pages,
// the cart and checkout, so the price a shopper sees is the price they pay.
// Rates below are DEMO values. Phase 2 loads real tax and delivery rules from the backend.

export type Region = {
  code: string;
  name: string;
  taxRate: number; // e.g. 0.08 = 8%
  standardShipping: number; // USD per order
  expressExtra: number; // extra USD for express
  freeShippingOver: number; // item subtotal that waives standard shipping
  standardDays: string;
  expressDays: string;
};

export const regions: Region[] = [
  { code: "US", name: "United States", taxRate: 0.08, standardShipping: 4.99, expressExtra: 8, freeShippingOver: 75, standardDays: "3-5 days", expressDays: "1-2 days" },
  { code: "GB", name: "United Kingdom", taxRate: 0.2, standardShipping: 6.99, expressExtra: 9, freeShippingOver: 90, standardDays: "4-6 days", expressDays: "2 days" },
  { code: "AU", name: "Australia", taxRate: 0.1, standardShipping: 9.99, expressExtra: 12, freeShippingOver: 100, standardDays: "5-8 days", expressDays: "2-3 days" },
  { code: "LK", name: "Sri Lanka", taxRate: 0.18, standardShipping: 5.99, expressExtra: 6, freeShippingOver: 80, standardDays: "3-6 days", expressDays: "1-2 days" },
  { code: "IN", name: "India", taxRate: 0.18, standardShipping: 5.49, expressExtra: 6, freeShippingOver: 80, standardDays: "4-7 days", expressDays: "2-3 days" },
];

export const defaultRegion = regions[0];

export const getRegion = (code: string) => regions.find((r) => r.code === code) ?? defaultRegion;

const r2 = (n: number) => Math.round(n * 100) / 100;

export type Totals = {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
};

/** Totals for an order (or a single item with qty 1) delivered to a region. */
export function orderTotals(subtotal: number, region: Region, express = false): Totals {
  const tax = r2(subtotal * region.taxRate);
  const freeShipping = subtotal >= region.freeShippingOver;
  const base = freeShipping ? 0 : region.standardShipping;
  const shipping = r2(base + (express ? region.expressExtra : 0));
  return { subtotal: r2(subtotal), tax, shipping, total: r2(subtotal + tax + shipping), freeShipping };
}

/** Delivered price of one unit: what the shopper pays for a one-item order. */
export const deliveredPrice = (price: number, region: Region) => orderTotals(price, region);
