"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { authEnabled } from "@/lib/useUser";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Auth is not configured yet.");
      setBusy(false);
      return;
    }
    const { data, error } = await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is required, there is no active session yet.
    if (data.session) {
      router.push("/");
    } else {
      setNotice("Check your email to confirm your account, then sign in.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-sepia-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <div className="rounded-xl border border-sepia-300 bg-white p-8 shadow-frame">
        <h1 className="font-display text-2xl text-ink">Create an account</h1>

        {!authEnabled && (
          <p className="mt-3 rounded-lg bg-sepia-50 px-4 py-3 text-sm text-sepia-700">
            Accounts require Supabase. Add your Supabase keys to{" "}
            <code>.env.local</code> to enable registration.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}
          <button
            type="submit"
            disabled={busy || !authEnabled}
            className="w-full rounded-full bg-sepia-700 px-4 py-2.5 text-sm font-medium text-parchment transition hover:bg-sepia-800 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="text-sepia-700 underline hover:text-sepia-900">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
