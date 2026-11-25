"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiEnabled, apiRequest, type ApiOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/products";

type Row = { id: string; date: string; total: number; status?: string; items: string };

type LocalOrder = { id: string; date: string; total: number; items: { slug: string; qty: number; name?: string }[] };

export default function AccountPage() {
  const { user, token, loading, logout } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (apiEnabled && user && token) {
      apiRequest<ApiOrder[]>("/orders/mine", { token })
        .then((list) =>
          setRows(
            list.map((o) => ({
              id: o.code,
              date: o.createdAt,
              total: o.total,
              status: o.status,
              items: o.items.map((i) => `${i.name} × ${i.qty}`).join(", "),
            })),
          ),
        )
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load orders."));
      return;
    }
    // Guests / demo mode: orders saved in this browser.
    try {
      const local: LocalOrder[] = JSON.parse(localStorage.getItem("ecom_orders_v1") || "[]");
      setRows(
        local.map((o) => ({
          id: o.id,
          date: o.date,
          total: o.total,
          items: o.items.map((i) => `${i.name ?? i.slug} × ${i.qty}`).join(", "),
        })),
      );
    } catch {}
  }, [loading, user, token]);

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1>My account</h1>
      {apiEnabled && user ? (
        <p>
          Signed in as <strong>{user.name}</strong> ({user.email}){" "}
          <button className="link-btn" onClick={logout}>Sign out</button>
          {user.role === "admin" && <> · <Link href="/admin/">Admin panel</Link></>}
        </p>
      ) : apiEnabled ? (
        <p>
          <Link href="/login/">Sign in</Link> or <Link href="/register/">create an account</Link> to keep your orders across devices.
          Orders below were placed on this browser.
        </p>
      ) : (
        <p className="muted small">Demo mode: orders are saved in this browser only.</p>
      )}

      <h2>Order history</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {rows.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="tablewrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Date</th><th>Items</th>{rows.some((r) => r.status) && <th>Status</th>}<th>Total</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{new Date(o.date).toLocaleDateString()}</td>
                  <td>{o.items}</td>
                  {rows.some((r) => r.status) && <td><span className={`pill pill-${o.status}`}>{o.status}</span></td>}
                  <td>{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
