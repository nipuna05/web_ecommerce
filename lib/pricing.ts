// True-price promise: one set of rules used by product cards, product pages,
// the cart and checkout, so the price a shopper sees is the price they pay.
// Delivery = zone base price + per-kg charge for every kg above the first, based on total weight.
// All rates below are DEMO values. A later phase loads real tax and carrier rates from the backend.

export type Zone = {
  code: string; // "metro" | "regional" | "remote"
  name: string;
  base: number; // USD for the first kg
  perKg: number; // USD for each extra kg (weight is rounded up to whole kg)
  expressExtra: number; // flat extra USD for express
  freeOver: number; // item subtotal that waives standard delivery
  standardDays: string;
  expressDays: string;
};

export type Region = {
  code: string;
  name: string;
  taxRate: number; // e.g. 0.08 = 8%
  zones: Zone[];
};

const z = (
  code: string,
  name: string,
  base: number,
  perKg: number,
  expressExtra: number,
  freeOver: number,
  standardDays: string,
  expressDays: string,
): Zone => ({ code, name, base, perKg, expressExtra, freeOver, standardDays, expressDays });

export const regions: Region[] = [
  {
    code: "US", name: "United States", taxRate: 0.08,
    zones: [
      z("metro", "Major metro areas", 4.99, 1.0, 8, 75, "2-4 days", "1-2 days"),
      z("regional", "Rest of mainland US", 6.49, 1.3, 9, 90, "3-6 days", "2-3 days"),
      z("remote", "Alaska, Hawaii & territories", 14.99, 3.0, 18, 150, "7-12 days", "3-5 days"),
    ],
  },
  {
    code: "GB", name: "United Kingdom", taxRate: 0.2,
    zones: [
      z("metro", "England & Wales", 5.99, 1.0, 8, 80, "2-4 days", "1-2 days"),
      z("regional", "Scotland", 7.99, 1.4, 9, 90, "3-5 days", "2 days"),
      z("remote", "Northern Ireland & islands", 11.99, 2.2, 12, 120, "5-8 days", "3 days"),
    ],
  },
  {
    code: "AU", name: "Australia", taxRate: 0.1,
    zones: [
      z("metro", "Capital cities", 8.99, 1.5, 10, 90, "3-6 days", "1-3 days"),
      z("regional", "Regional areas", 12.99, 2.2, 13, 120, "5-9 days", "3-4 days"),
      z("remote", "Remote & islands", 19.99, 3.5, 20, 180, "8-14 days", "5-7 days"),
    ],
  },
  {
    code: "LK", name: "Sri Lanka", taxRate: 0.18,
    zones: [
      z("metro", "Colombo & suburbs", 3.99, 0.6, 4, 60, "1-3 days", "1 day"),
      z("regional", "Other cities", 5.99, 0.9, 6, 80, "3-5 days", "2 days"),
      z("remote", "Remote areas", 8.99, 1.4, 9, 120, "5-8 days", "3-4 days"),
    ],
  },
  {
    code: "IN", name: "India", taxRate: 0.18,
    zones: [
      z("metro", "Metro cities", 4.49, 0.8, 5, 70, "2-4 days", "1-2 days"),
      z("regional", "Other cities", 5.99, 1.0, 6, 80, "4-7 days", "2-3 days"),
      z("remote", "Remote & North-East", 9.99, 1.8, 10, 130, "7-12 days", "4-6 days"),
    ],
  },
];

export const defaultRegion = regions[0];

export const getRegion = (code: string) => regions.find((r) => r.code === code) ?? defaultRegion;

export const getZone = (region: Region, zoneCode: string) =>
  region.zones.find((x) => x.code === zoneCode) ?? region.zones[0];

const r2 = (n: number) => Math.round(n * 100) / 100;

export type Totals = {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
  billableKg: number;
};

/** Totals for an order (or one item with qty 1) delivered to a country + zone. */
export function orderTotals(subtotal: number, weightKg: number, region: Region, zone: Zone, express = false): Totals {
  const tax = r2(subtotal * region.taxRate);
  const billableKg = Math.max(1, Math.ceil(weightKg));
  const freeShipping = subtotal >= zone.freeOver;
  const standard = freeShipping ? 0 : zone.base + zone.perKg * (billableKg - 1);
  const shipping = r2(standard + (express ? zone.expressExtra : 0));
  return { subtotal: r2(subtotal), tax, shipping, total: r2(subtotal + tax + shipping), freeShipping, billableKg };
}

/** Delivered price of one unit: what the shopper pays for a one-item order. */
export const deliveredPrice = (price: number, weightKg: number, region: Region, zone: Zone) =>
  orderTotals(price, weightKg, region, zone);
