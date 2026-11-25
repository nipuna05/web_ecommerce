import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import Header from "@/components/Header";
import { RegionProvider } from "@/lib/region";
import { CatalogProvider } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "ShopEase - Online Store",
  description: "A modern multi-category online store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegionProvider>
          <CatalogProvider>
            <CartProvider>
              <Header />
              <main className="container main">{children}</main>
              <footer className="footer">
                <div className="container small muted">© {new Date().getFullYear()} ShopEase. Demo store, no real payments. Tax and delivery rates are demo values.</div>
              </footer>
            </CartProvider>
          </CatalogProvider>
        </RegionProvider>
      </body>
    </html>
  );
}
