import Link from "next/link";
import { categories, products } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export default function Home() {
  const featured = [...products].sort((a, b) => b.rating - a.rating).slice(0, 4);
  return (
    <>
      <section className="hero">
        <h1>Everything you need, one store.</h1>
        <p>Electronics, fashion, home, sports and beauty, with clear prices and fast checkout.</p>
        <Link href="/products/" className="btn">Shop now</Link>
      </section>

      <section>
        <h2>Shop by category</h2>
        <div className="chips">
          {categories.filter((c) => c !== "All").map((c) => (
            <Link key={c} href={`/products/?cat=${encodeURIComponent(c)}`} className="chip">{c}</Link>
          ))}
        </div>
      </section>

      <section>
        <h2>Top rated</h2>
        <div className="grid">{featured.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
      </section>

      <section className="perks">
        <div>🚚 Delivery info shown before checkout</div>
        <div>↩️ Easy returns</div>
        <div>🔒 Secure checkout</div>
      </section>
    </>
  );
}
