"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() || email.split("@")[0] },
        },
      });
      setLoading(false);
      if (signErr) {
        setError(signErr.message);
        return;
      }
      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }
      setNotice("Account created. Check your email to confirm, then sign in.");
      setMode("signin");
      return;
    }

    const { error: inErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (inErr) {
      setError(inErr.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function resetPassword() {
    if (!email) {
      setError("Enter your email first, then tap reset.");
      return;
    }
    setError(null);
    const supabase = createClient();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (resetErr) setError(resetErr.message);
    else setNotice("If that email has an account, a reset link is on its way.");
  }

  return (
    <main
      className="flex min-h-dvh items-center justify-center px-5"
      style={{
        backgroundImage:
          "radial-gradient(90% 55% at 100% -10%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 70%)",
      }}
    >
      <div className="card rise w-full max-w-sm p-7 sm:p-8">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
            style={{ background: "var(--grad-primary)", boxShadow: "var(--shadow-primary)" }}
          >
            ৳
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Ledger</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Track spending, split tours, multi-currency
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-2)] p-1">
          <button
            type="button"
            className="rounded-lg py-2 text-sm font-bold"
            style={{
              background: mode === "signin" ? "var(--surface)" : "transparent",
              color: mode === "signin" ? "var(--text)" : "var(--muted)",
              boxShadow: mode === "signin" ? "var(--shadow)" : "none",
            }}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className="rounded-lg py-2 text-sm font-bold"
            style={{
              background: mode === "signup" ? "var(--surface)" : "transparent",
              color: mode === "signup" ? "var(--text)" : "var(--muted)",
              boxShadow: mode === "signup" ? "var(--shadow)" : "none",
            }}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" ? (
            <div>
              <label className="label" htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          ) : null}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-sm text-[var(--expense)]">{error}</p>}
          {notice && <p className="text-sm text-[var(--income)]">{notice}</p>}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading
              ? mode === "signup"
                ? "Creating…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        {mode === "signin" ? (
          <button
            onClick={resetPassword}
            className="mt-4 w-full text-center text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            Forgot password?
          </button>
        ) : (
          <p className="mt-4 text-center text-xs text-[var(--muted)]">
            By creating an account you can track personal expenses and join tour splits.
          </p>
        )}
      </div>
    </main>
  );
}
