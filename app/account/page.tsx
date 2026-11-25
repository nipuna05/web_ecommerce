"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/products";

type Order = { id: string; date: string; total: number; items: { slug: string; qty: number; name?: string }[] };

export default function AccountPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    try {
      setOrders(JSON.parse(localStorage.getItem("ecom_orders_v1") || "[]"));
    } catch {}
  }, []);

  return (
    <>
      <h1>My account</h1>
      <p className="muted small">
        Demo mode: orders are saved in this browser only. Sign-in, saved addresses and wishlist arrive with the backend.
      </p>
      <h2>Order history</h2>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{new Date(o.date).toLocaleDateString()}</td>
                <td>{o.items.map((i) => `${i.name ?? i.slug} × ${i.qty}`).join(", ")}</td>
                <td>{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
