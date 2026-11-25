"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiEnabled, apiRequest } from "./api";

export type User = { id: string; email: string; name: string; role: "customer" | "admin" };

type Ctx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);
const KEY = "ecom_token_v1";

// NOTE: the token is kept in localStorage because the API is on a different origin than the static site.
// When the API and site share a domain, switch to an httpOnly cookie.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(apiEnabled);

  useEffect(() => {
    if (!apiEnabled) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (!saved) {
      setLoading(false);
      return;
    }
    apiRequest<User>("/auth/me", { token: saved })
      .then((u) => {
        setUser(u);
        setToken(saved);
      })
      .catch(() => {
        try {
          localStorage.removeItem(KEY);
        } catch {}
      })
      .finally(() => setLoading(false));
  }, []);

  const finish = useCallback((r: { token: string; user: User }) => {
    setUser(r.user);
    setToken(r.token);
    try {
      localStorage.setItem(KEY, r.token);
    } catch {}
    return r.user;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      token,
      loading,
      login: async (email, password) =>
        finish(await apiRequest("/auth/login", { method: "POST", body: { email, password } })),
      register: async (name, email, password) =>
        finish(await apiRequest("/auth/register", { method: "POST", body: { name, email, password } })),
      logout: () => {
        setUser(null);
        setToken(null);
        try {
          localStorage.removeItem(KEY);
        } catch {}
      },
    }),
    [user, token, loading, finish],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
