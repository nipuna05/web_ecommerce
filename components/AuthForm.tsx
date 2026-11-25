"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiEnabled } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  if (!apiEnabled) {
    return (
      <>
        <h1>{isLogin ? "Sign in" : "Create account"}</h1>
        <p>
          Accounts need the backend API, which isn't connected on this demo site. You can still browse and check out as a guest.
        </p>
        <Link href="/products/" className="btn">Continue shopping</Link>
      </>
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const user = isLogin
        ? await login(String(f.get("email")), String(f.get("password")))
        : await register(String(f.get("name")), String(f.get("email")), String(f.get("password")));
      router.push(user.role === "admin" ? "/admin/" : "/account/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="authbox">
      <h1>{isLogin ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit} className="form">
        {!isLogin && (
          <label>Full name<input name="name" required maxLength={100} autoComplete="name" /></label>
        )}
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>
          Password{!isLogin && <span className="small muted"> (at least 8 characters)</span>}
          <input
            name="password"
            type="password"
            required
            minLength={isLogin ? 1 : 8}
            maxLength={128}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="small">
        {isLogin ? (
          <>New here? <Link href="/register/">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login/">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
