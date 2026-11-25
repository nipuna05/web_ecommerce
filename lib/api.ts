// API access. If NEXT_PUBLIC_API_URL is not set (e.g. the GitHub Pages demo), the app uses demo data only.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const apiEnabled = API_URL.length > 0;

export type ApiOrder = {
  code: string;
  createdAt: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  email: string;
  customerName: string;
  address: string;
  regionCode: string;
  zoneCode: string;
  items: { productSlug: string; name: string; qty: number; unitPrice: number }[];
};

/** JSON request to the API. Throws Error(message) with the server's message on failure. */
export async function apiRequest<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(msg || "Something went wrong. Please try again.");
  }
  return data as T;
}

export const createOrder = (
  body: {
    name: string;
    email: string;
    address: string;
    regionCode: string;
    zoneCode: string;
    shippingMethod: "standard" | "express";
    items: { slug: string; qty: number }[];
  },
  token?: string | null,
) => apiRequest<ApiOrder>("/orders", { method: "POST", body, token });
