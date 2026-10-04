"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(error.message);
    else router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-16">
      <p className="label">Daily Hub</p>
      <h1 className="num mt-3 text-5xl leading-[1.05]">
        Food, money, steps.
        <br />
        <span className="text-muted">Five seconds each.</span>
      </h1>

      <div className="mt-auto">
        {!sent ? (
          <form onSubmit={send} className="space-y-3">
            <label className="label block" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-md border border-line bg-surface px-4 text-base outline-none focus:border-accent"
              placeholder="you@example.com"
            />
            <button
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-ink disabled:opacity-60"
            >
              Send sign in link <ArrowRight size={18} strokeWidth={1.75} />
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <p className="text-muted">
              Link sent to <span className="text-ink">{email}</span>. Tap it, or type the 6 digit code from the
              email here (use the code when the app is installed on iOS).
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="num h-14 w-full rounded-md border border-line bg-surface px-4 text-center text-3xl tracking-[0.3em] outline-none focus:border-accent"
              placeholder="000000"
            />
            <button
              disabled={busy || code.trim().length < 6}
              className="h-12 w-full rounded-md bg-accent font-medium text-accent-ink disabled:opacity-60"
            >
              Sign in
            </button>
            <button type="button" onClick={() => setSent(false)} className="h-11 w-full text-muted">
              Use a different email
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    </main>
  );
}
