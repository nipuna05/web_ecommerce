"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiEnabled, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type VendorRecord = { shopName: string; slug: string; status: "pending" | "approved" | "rejected" | "suspended" } | null;

export default function SellPage() {
  const { user, token, loading } = useAuth();
  const [vendor, setVendor] = useState<VendorRecord | undefined>(undefined); // undefined = not loaded yet
  const [fee, setFee] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!apiEnabled) return;
    apiRequest<{ percent: number }>("/vendors/fees").then((f) => setFee(f.percent)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!apiEnabled || loading) return;
    if (!token) {
      setVendor(null);
      return;
    }
    apiRequest<VendorRecord>("/vendors/me", { token }).then(setVendor).catch(() => setVendor(null));
  }, [token, loading]);

  async function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const v = await apiRequest<VendorRecord>("/vendors/apply", {
        method: "POST",
        token,
        body: { shopName: String(f.get("shopName")).trim(), description: String(f.get("description")).trim() },
      });
      setVendor(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your application.");
    }
    setBusy(false);
  }

  return (
    <>
      <h1>Sell on ShopEase</h1>
      <p>Open your own shop and list products, apps and projects. Buyers see one honest, all-in price, and you manage your listings and orders from one dashboard.</p>
      <ul>
        <li>Flat seller fee{fee !== null ? `: ${fee}% of the item price` : ""}. No listing fees and no other charges (demo value).</li>
        <li>Every new shop is reviewed by an admin before it goes live.</li>
        <li>You see only your own orders and customers.</li>
      </ul>

      {!apiEnabled ? (
        <p className="muted">Selling needs the backend API, which isn't connected on this demo site.</p>
      ) : loading || vendor === undefined ? (
        <p>Loading…</p>
      ) : !user ? (
        <p>
          <Link href="/register/" className="btn">Create an account</Link>{" "}
          <Link href="/login/">or sign in</Link> to apply as a vendor.
        </p>
      ) : vendor ? (
        <div className="summary">
          <h2>{vendor.shopName}</h2>
          {vendor.status === "pending" && <p>Your application is <strong>waiting for approval</strong>. Come back soon.</p>}
          {vendor.status === "approved" && (
            <p>
              You're approved. <Link href="/vendor/" className="btn">Open vendor dashboard</Link>{" "}
              <Link href={`/store/?v=${vendor.slug}`}>View my public shop</Link>
            </p>
          )}
          {vendor.status === "rejected" && <p className="error">Your application was not approved.</p>}
          {vendor.status === "suspended" && <p className="error">Your shop is suspended. Your products are hidden.</p>}
        </div>
      ) : (
        <form onSubmit={apply} className="form" style={{ maxWidth: 480 }}>
          <h2>Apply to become a vendor</h2>
          <label>Shop name<input name="shopName" required minLength={2} maxLength={60} /></label>
          <label>
            What will you sell?
            <textarea name="description" required minLength={10} maxLength={1000} rows={4} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send application"}</button>
        </form>
      )}
    </>
  );
}
