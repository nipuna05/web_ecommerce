"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function Header() {
  const { count } = useCart();
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">🛍️ ShopEase</Link>
        <nav className="nav">
          <Link href="/products/">Shop</Link>
          <Link href="/account/">Account</Link>
          <Link href="/cart/" className="cart-link">
            Cart <span className="badge">{count}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
