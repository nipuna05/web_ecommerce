import Link from "next/link";
import type { Product } from "@/lib/products";

/** "Sold by <shop>" link for vendor products; renders nothing for store products. */
export default function SoldBy({ p }: { p: Pick<Product, "vendor"> }) {
  if (!p.vendor) return null;
  return (
    <div className="small muted">
      Sold by <Link href={`/store/?v=${encodeURIComponent(p.vendor.slug)}`}>{p.vendor.name}</Link>
      {" · "}
      <Link href={`/products/?shop=${encodeURIComponent(p.vendor.slug)}`}>more from this shop</Link>
    </div>
  );
}

/** "Updated 3 days ago" with a warning when a listing looks abandoned (no update for a year). */
export function Freshness({ updatedAt }: { updatedAt?: string }) {
  if (!updatedAt) return null;
  const days = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000));
  const text = days === 0 ? "today" : days === 1 ? "yesterday" : days < 60 ? `${days} days ago` : `${Math.round(days / 30)} months ago`;
  return (
    <p className={days > 365 ? "small error" : "small muted"}>
      Listing updated {text}
      {days > 365 && " · not updated in over a year"}
    </p>
  );
}
