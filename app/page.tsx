import Link from "next/link";
import { CategoryChips, TopRated } from "@/components/HomeSections";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Everything you need, one store.</h1>
        <p>Electronics, fashion, home, sports and beauty, with clear prices and fast checkout.</p>
        <Link href="/products/" className="btn">Shop now</Link>
      </section>

      <section>
        <h2>Shop by category</h2>
        <CategoryChips />
      </section>

      <section>
        <h2>Top rated</h2>
        <TopRated />
      </section>

      <section className="perks">
        <div>🚚 Delivery info shown before checkout</div>
        <div>↩️ Easy returns</div>
        <div>🔒 Secure checkout</div>
      </section>
    </>
  );
}
