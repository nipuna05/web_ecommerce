"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiEnabled, apiRequest, type ApiOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, type Product } from "@/lib/products";

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

type Stats = { orders: number; pending: number; revenue: number; lowStock: { slug: string; name: string; stock: number }[] };

export default function AdminPanel() {
  const { user, token, loading } = useAuth();
  const [tab, setTab] = useState<"dashboard" | "orders" | "products">("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fail = (e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : "Request failed" });

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      const [s, o, p] = await Promise.all([
        apiRequest<Stats>("/admin/stats", { token }),
        apiRequest<ApiOrder[]>("/admin/orders", { token }),
        apiRequest<Product[]>("/products"),
      ]);
      setStats(s);
      setOrders(o);
      setProducts(p);
    } catch (e) {
      fail(e);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === "admin") void reload();
  }, [user, reload]);

  if (!apiEnabled) return <><h1>Admin</h1><p>The admin panel needs the backend API, which isn't connected on this demo site.</p></>;
  if (loading) return <p>Loading…</p>;
  if (!user) return <><h1>Admin</h1><p><Link href="/login/">Sign in</Link> with an admin account.</p></>;
  if (user.role !== "admin") return <><h1>Admin</h1><p>This area is for administrators only.</p></>;

  async function run(action: () => Promise<unknown>, okText: string) {
    setMsg(null);
    try {
      await action();
      setMsg({ ok: true, text: okText });
      await reload();
    } catch (e) {
      fail(e);
    }
  }

  const setStatus = (code: string, status: string) =>
    run(() => apiRequest(`/admin/orders/${code}/status`, { method: "PATCH", token, body: { status } }), `Order ${code} is now ${status}`);

  const saveProduct = (p: Product, price: number, stock: number) =>
    run(() => apiRequest(`/admin/products/${p.slug}`, { method: "PATCH", token, body: { price, stock } }), `Saved ${p.name}`);

  const removeProduct = (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    void run(() => apiRequest(`/admin/products/${p.slug}`, { method: "DELETE", token }), `Deleted ${p.name}`);
  };

  const addProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await run(
      () =>
        apiRequest("/admin/products", {
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
      "Product added",
    );
    form.reset();
  };

  return (
    <>
      <h1>Admin</h1>
      <div className="tabs" role="tablist">
        {(["dashboard", "orders", "products"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "tab on" : "tab"} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {msg && <p className={msg.ok ? "ok" : "error"} role="status">{msg.text}</p>}

      {tab === "dashboard" && stats && (
        <>
          <div className="stats">
            <div className="stat"><div className="small muted">Orders</div><strong>{stats.orders}</strong></div>
            <div className="stat"><div className="small muted">Pending</div><strong>{stats.pending}</strong></div>
            <div className="stat"><div className="small muted">Revenue (excl. cancelled)</div><strong>{money(stats.revenue)}</strong></div>
          </div>
          <h2>Low stock (5 or fewer)</h2>
          {stats.lowStock.length === 0 ? <p>All products are well stocked.</p> : (
            <ul>{stats.lowStock.map((p) => <li key={p.slug}>{p.name}: <strong>{p.stock}</strong> left</li>)}</ul>
          )}
        </>
      )}

      {tab === "orders" && (
        orders.length === 0 ? <p>No orders yet.</p> : (
          <div className="tablewrap">
            <table className="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Deliver to</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.code}>
                    <td>{o.code}<div className="small muted">{new Date(o.createdAt).toLocaleString()}</div></td>
                    <td>{o.customerName}<div className="small muted">{o.email}</div></td>
                    <td className="small">{o.regionCode}/{o.zoneCode}<div className="muted">{o.address}</div></td>
                    <td className="small">{o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <select
                        value={o.status}
                        disabled={o.status === "cancelled"}
                        aria-label={`Status for ${o.code}`}
                        onChange={(e) => void setStatus(o.code, e.target.value)}
                      >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "products" && (
        <>
          <h2>Add product</h2>
          <form onSubmit={addProduct} className="form adminform">
            <input name="name" placeholder="Name" required maxLength={150} />
            <input name="slug" placeholder="slug-like-this" required pattern="[a-z0-9]+(-[a-z0-9]+)*" title="lowercase letters, numbers, dashes" />
            <input name="category" placeholder="Category" required maxLength={60} />
            <input name="price" type="number" step="0.01" min="0.01" placeholder="Price (USD)" required />
            <input name="stock" type="number" step="1" min="0" placeholder="Stock" required />
            <input name="weightKg" type="number" step="0.01" min="0.01" placeholder="Weight (kg)" required />
            <input name="emoji" placeholder="Emoji" maxLength={16} />
            <textarea name="description" placeholder="Description" required rows={2} maxLength={2000} />
            <button className="btn" type="submit">Add product</button>
          </form>

          <h2>Products ({products.length})</h2>
          <div className="tablewrap">
            <table className="table">
              <thead><tr><th>Product</th><th>Price (USD)</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                {products.map((p) => <ProductRow key={`${p.slug}:${p.price}:${p.stock}`} p={p} onSave={saveProduct} onDelete={removeProduct} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function ProductRow({ p, onSave, onDelete }: { p: Product; onSave: (p: Product, price: number, stock: number) => void; onDelete: (p: Product) => void }) {
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(String(p.stock));
  const dirty = Number(price) !== p.price || Number(stock) !== p.stock;
  const valid = Number(price) >= 0.01 && Number.isInteger(Number(stock)) && Number(stock) >= 0;
  return (
    <tr>
      <td>{p.emoji} {p.name}<div className="small muted">{p.slug} · {p.category}</div></td>
      <td><input type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} aria-label={`Price for ${p.name}`} className="narrow" /></td>
      <td><input type="number" step="1" min="0" value={stock} onChange={(e) => setStock(e.target.value)} aria-label={`Stock for ${p.name}`} className="narrow" /></td>
      <td>
        <button className="btn btn-sm" disabled={!dirty || !valid} onClick={() => onSave(p, Number(price), Number(stock))}>Save</button>{" "}
        <button className="link-btn" onClick={() => onDelete(p)}>Delete</button>
      </td>
    </tr>
  );
}
