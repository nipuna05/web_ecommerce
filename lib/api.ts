// API access. If NEXT_PUBLIC_API_URL is not set (e.g. the GitHub Pages demo), the app uses demo data only.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const apiEnabled = API_URL.length > 0;

export type ApiOrder = {
  code: string;
  createdAt: string;
  total: number;
  items: { productSlug: string; name: string; qty: number }[];
};

export async function createOrder(body: {
  name: string;
  email: string;
  address: string;
  regionCode: string;
  zoneCode: string;
  shippingMethod: "standard" | "express";
  items: { slug: string; qty: number }[];
}): Promise<ApiOrder> {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(msg || "Could not place the order. Please try again.");
  }
  return data;
}
