"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiEnabled, apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, type Product } from "@/lib/products";

type VendorOrder = {
  code: string;
  createdAt: string;
  status: string;
  customerName: string;
  email: string;
  address: string;
  regionCode: string;
  zoneCode: string;
  items: { productSlug: string; name: string; qty: number; unitPrice: number }[];
};

export default function VendorDashboard() {
  const { user, token, loading } = useAuth();
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [fee, setFee] = useState(5);
  const [price, setPrice] = useState("");
  const [denied, setDenied] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      const [p, o] = await Promise.all([
        apiRequest<Product[]>("/vendor/products", { token }),
        apiRequest<VendorOrder[]>("/vendor/orders", { token }),
      ]);
      setProducts(p);
      setOrders(o);
    } catch {
      setDenied(true); // not an approved vendor
    }
  }, [token]);

  useEffect(() => {
    if (!apiEnabled || !token) return;
    void reload();
    apiRequest<{ percent: number }>("/vendors/fees").then((f) => setFee(f.percent)).catch(() => {});
  }, [token, reload]);

  if (!apiEnabled) return <><h1>Vendor dashboard</h1><p>This needs the backend API, which isn't connected on this demo site.</p></>;
  if (loading) return <p>Loading…</p>;
  if (!user) return <><h1>Vendor dashboard</h1><p><Link href="/login/">Sign in</Link> first.</p></>;
  if (denied) return <><h1>Vendor dashboard</h1><p>Your shop isn't approved yet. <Link href="/sell/">Check your application</Link>.</p></>;

  async function run(action: () => Promise<unknown>, okText: string) {
    setMsg(null);
    try {
      await action();
      setMsg({ ok: true, text: okText });
      await reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Request failed" });
    }
  }

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await run(
      () =>
        apiRequest("/vendor/products", {
          method: "POST",
          token,
          body: {
            slug: String(f.get("slug")).trim(),
            name: String(f.get("name")).trim(),
            category: String(f.get("category")).trim(),
            price: Number(f.get("price")),
            stock: Number(f.get("stock")),
            weightKg: Number(f.get("weightKg")),
            emoji: String(f.get("emoji")).trim() || "📦",
            description: String(f.get("description")).trim(),
          },
        }),
      "Product listed",
    );
    form.reset();
    setPrice("");
  };

  const patch = (p: Product, body: object, okText: string) =>
    run(() => apiRequest(`/vendor/products/${p.slug}`, { method: "PATCH", token, body }), okText);

  const remove = (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    void run(() => apiRequest(`/vendor/products/${p.slug}`, { method: "DELETE", token }), `Deleted ${p.name}`);
  };

  const priceNum = Number(price);
  const youGet = priceNum > 0 ? priceNum * (1 - fee / 100) : 0;

  return (
    <>
      <h1>Vendor dashboard</h1>
      <div className="tabs" role="tablist">
        {(["products", "orders"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "tab on" : "tab"} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}{t === "orders" ? ` (${orders.length})` : ""}
          </button>
        ))}
      </div>
      {msg && <p className={msg.ok ? "ok" : "error"} role="status">{msg.text}</p>}

      {tab === "products" && (
        <>
          <h2>List a product</h2>
          <form onSubmit={add} className="form adminform">
            <input name="name" placeholder="Name" required maxLength={150} />
            <input name="slug" placeholder="slug-like-this" required pattern="[a-z0-9]+(-[a-z0-9]+)*" title="lowercase letters, numbers, dashes" />
            <input name="category" placeholder="Category" required maxLength={60} />
            <input name="price" type="number" step="0.01" min="0.01" placeholder="Price (USD)" required value={price} onChange={(e) => setPrice(e.target.value)} />
            <input name="stock" type="number" step="1" min="0" placeholder="Stock" required />
            <input name="weightKg" type="number" step="0.01" min="0.01" placeholder="Weight (kg)" required />
            <input name="emoji" placeholder="Emoji" maxLength={16} />
            <textarea name="description" placeholder="Description" required rows={2} maxLength={2000} />
            <p className="small muted" style={{ gridColumn: "1 / -1", margin: 0 }}>
              Fee calculator: platform fee {fee}%{priceNum > 0 && <> · you receive <strong>{money(youGet)}</strong> of {money(priceNum)}</>}. No other charges.
            </p>
            <button className="btn" type="submit">List product</button>
          </form>

          <h2>My products ({products.length})</h2>
          {products.length === 0 ? <p>You haven't listed anything yet.</p> : (
            <div className="tablewrap">
              <table className="table">
                <thead><tr><th>Product</th><th>Price (USD)</th><th>Stock</th><th>Visible</th><th></th></tr></thead>
                <tbody>
                  {products.map((p) => <Row key={`${p.slug}:${p.price}:${p.stock}`} p={p} onSave={(price, stock) => patch(p, { price, stock }, `Saved ${p.name}`)} onToggle={() => patch(p, { active: !p.active }, p.active ? "Hidden from the shop" : "Listed again")} onDelete={() => remove(p)} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "orders" && (
        orders.length === 0 ? <p>No orders for your products yet.</p> : (
          <div className="tablewrap">
            <table className="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Ship to</th><th>Your items</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.code}>
                    <td>{o.code}<div className="small muted">{new Date(o.createdAt).toLocaleString()}</div></td>
                    <td>{o.customerName}<div className="small muted">{o.email}</div></td>
                    <td className="small">{o.regionCode}/{o.zoneCode}<div className="muted">{o.address}</div></td>
                    <td className="small">{o.items.map((i) => `${i.name} × ${i.qty} (${money(i.unitPrice * i.qty)})`).join(", ")}</td>
                    <td><span className={`pill pill-${o.status}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}

function Row({ p, onSave, onToggle, onDelete }: { p: Product; onSave: (price: number, stock: number) => void; onToggle: () => void; onDelete: () => void }) {
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(String(p.stock));
  const dirty = Number(price) !== p.price || Number(stock) !== p.stock;
  const valid = Number(price) >= 0.01 && Number.isInteger(Number(stock)) && Number(stock) >= 0;
  return (
    <tr>
      <td>
        {p.emoji} {p.name}
        {p.approvalStatus === "pending" && <span className="pill pill-paid"> waiting for approval</span>}
        {p.approvalStatus === "rejected" && <span className="pill pill-cancelled"> rejected</span>}
        <div className="small muted">{p.slug} · {p.category}</div>
        {p.approvalStatus === "pending" && <div className="small muted">Not visible to shoppers until an admin approves it.</div>}
        {p.approvalStatus === "rejected" && <div className="small error">Rejected by the store. Delete it and list a corrected version.</div>}
      </td>
      <td><input type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} aria-label={`Price for ${p.name}`} className="narrow" /></td>
      <td><input type="number" step="1" min="0" value={stock} onChange={(e) => setStock(e.target.value)} aria-label={`Stock for ${p.name}`} className="narrow" /></td>
      <td>
        {p.hiddenByAdmin ? (
          <span className="small error">Hidden by admin. Contact the store.</span>
        ) : (
          <button className="link-btn" onClick={onToggle}>{p.active === false ? "Hidden · show" : "Visible · hide"}</button>
        )}
      </td>
      <td>
        <button className="btn btn-sm" disabled={!dirty || !valid} onClick={() => onSave(Number(price), Number(stock))}>Save</button>{" "}
        <button className="link-btn" onClick={onDelete}>Delete</button>
      </td>
    </tr>
  );
}
