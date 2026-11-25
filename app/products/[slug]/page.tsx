import { getProduct, products } from "@/lib/products";
import ProductDetail from "@/components/ProductDetail";

// Pages are pre-built (static export) for the demo catalog's slugs.
// The product content itself comes from the catalog (API or demo) in the browser.
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
  return <ProductDetail slug={slug} />;
}
