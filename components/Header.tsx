"use client";

import Link from "next/link";
import { apiEnabled } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import RegionPicker from "./RegionPicker";

export default function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">🛍️ ShopEase</Link>
        <nav className="nav">
          <Link href="/products/">Shop</Link>
          {user?.role === "admin" && <Link href="/admin/">Admin</Link>}
          {apiEnabled && !user ? <Link href="/login/">Sign in</Link> : <Link href="/account/">{user ? "Account" : "Orders"}</Link>}
          <Link href="/cart/" className="cart-link">
            Cart <span className="badge">{count}</span>
          </Link>
        </nav>
      </div>
      <RegionPicker />
    </header>
  );
}
