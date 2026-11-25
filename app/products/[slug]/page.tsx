import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, money, products } from "@/lib/products";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  return { title: p ? `${p.name} - ShopEase` : "Product not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const related = products.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);

  return (
    <>
      <p className="small"><Link href="/products/">Shop</Link> / {p.category} / {p.name}</p>
      <div className="detail">
        <div className="detail-img"><span>{p.emoji}</span></div>
        <div>
          <h1>{p.name}</h1>
          <div className="small">⭐ {p.rating} <span className="muted">({p.reviews} reviews)</span></div>
          <p className="price">{money(p.price)}</p>
          <p>{p.description}</p>
          <p className="small muted">
            {p.stock > 0 ? (p.stock <= 10 ? `Only ${p.stock} left` : "In stock") : "Out of stock"}
          </p>
          <AddToCart slug={p.slug} stock={p.stock} />
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <h2>You may also like</h2>
          <div className="grid">{related.map((r) => <ProductCard key={r.slug} p={r} />)}</div>
        </section>
      )}
    </>
  );
}
