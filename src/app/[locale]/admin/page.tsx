"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Images, ShieldAlert, Users } from "lucide-react";

import { getAccessToken, useUser } from "@/lib/useUser";
import Logo from "@/components/Logo";

interface Account {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  photoCount: number;
  createdAt: string;
  lastSignInAt: string | null;
}

interface Stats {
  total: number;
  newThisWeek: number;
  activeThisMonth: number;
  contributors: number;
}

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-300",
  moderator: "bg-amber-100 text-amber-800 border-amber-300",
  member: "bg-sepia-100 text-sepia-700 border-sepia-300",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminPage() {
  const { user, loading } = useUser();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    (async () => {
      setFetching(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/admin/accounts", {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        });
        if (active) setStatus(res.status);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load accounts");
        if (active) {
          setAccounts(data.accounts as Account[]);
          setStats(data.stats as Stats);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setFetching(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, loading]);

  async function changeRole(id: string, role: string) {
    setSavingRole(id);
    setRoleError(null);
    // Optimistic update.
    setAccounts((as) =>
      as ? as.map((a) => (a.id === id ? { ...a, role } : a)) : as,
    );
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update role");
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to update role");
      // Reload to resync after a failed change.
      const token = await getAccessToken();
      const res = await fetch("/api/admin/accounts", {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts as Account[]);
      }
    } finally {
      setSavingRole(null);
    }
  }

  const forbidden = status === 403;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/profile"
        className="mb-8 inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-sepia-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>

      <Logo size={30} />

      <h1 className="mt-8 flex items-center gap-2 font-display text-4xl leading-tight text-ink">
        <Users className="h-8 w-8 text-sepia-600" /> Admin dashboard
      </h1>

      {/* Not signed in */}
      {!loading && !user && (
        <div className="mt-6 rounded-xl border border-sepia-200 bg-white/70 p-6 text-sm text-ink/75">
          <p>You need to be signed in as an administrator to view this page.</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-full bg-sepia-700 px-4 py-2 text-sm font-medium text-parchment hover:bg-sepia-800"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* Signed in but not an admin */}
      {user && forbidden && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">This area is restricted to administrators.</p>
            <p className="mt-1 text-red-700/80">
              Your account doesn&apos;t have admin access. If you&apos;re the site
              owner, set your role to <code>admin</code> in the Supabase profiles
              table.
            </p>
          </div>
        </div>
      )}

      {user && fetching && (
        <p className="mt-6 text-sm text-ink/50">Loading accounts…</p>
      )}

      {user && error && !forbidden && (
        <p className="mt-6 text-sm text-red-700">{error}</p>
      )}

      {/* Admin content */}
      {user && stats && accounts && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/admin/photos"
              className="inline-flex items-center gap-2 rounded-full bg-sepia-700 px-4 py-2 text-sm font-medium text-parchment transition hover:bg-sepia-800"
            >
              <Images className="h-4 w-4" /> Manage photos
            </Link>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-2 rounded-full border border-sepia-300 bg-white/70 px-4 py-2 text-sm font-medium text-sepia-800 transition hover:bg-sepia-50"
            >
              <BarChart3 className="h-4 w-4" /> Visitors
            </Link>
          </div>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: "total", label: "Total accounts", value: stats.total },
              { key: "new", label: "New this week", value: stats.newThisWeek },
              {
                key: "active",
                label: "Active (30 days)",
                value: stats.activeThisMonth,
              },
              {
                key: "contrib",
                label: "Contributors",
                value: stats.contributors,
              },
            ].map((c) => (
              <div
                key={c.key}
                className="rounded-xl border border-sepia-200 bg-white/70 px-4 py-4 text-center"
              >
                <div className="font-display text-3xl text-ink">{c.value}</div>
                <div className="mt-1 text-xs text-ink/50">{c.label}</div>
              </div>
            ))}
          </section>

          <section className="mt-8">
            <h2 className="font-display text-xl text-ink">All accounts</h2>
            <p className="mt-1 text-xs text-ink/50">
              Change a member&apos;s role with the dropdown. Admins manage
              everything; moderators are reserved for future review tools.
            </p>
            {roleError && <p className="mt-2 text-sm text-red-700">{roleError}</p>}
            <div className="mt-3 overflow-x-auto rounded-xl border border-sepia-200 bg-white/70">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-sepia-200 text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Display name</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 text-right font-medium">Photos</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-sepia-100 last:border-0 hover:bg-sepia-50/50"
                    >
                      <td className="px-4 py-3 text-ink">{a.email ?? "—"}</td>
                      <td className="px-4 py-3 text-ink/80">
                        {a.username ?? (
                          <span className="text-ink/40">Anonymous</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={a.role}
                          disabled={savingRole === a.id || a.id === user?.id}
                          onChange={(e) => changeRole(a.id, e.target.value)}
                          title={
                            a.id === user?.id
                              ? "You can't change your own role"
                              : "Change role"
                          }
                          className={`rounded-full border px-2 py-1 text-xs font-medium outline-none disabled:opacity-60 ${
                            ROLE_STYLES[a.role] ?? ROLE_STYLES.member
                          }`}
                        >
                          <option value="member">member</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink/80">
                        {a.photoCount}
                      </td>
                      <td className="px-4 py-3 text-ink/60">
                        {fmtDate(a.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-ink/60">
                        {fmtDate(a.lastSignInAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {accounts.length === 0 && (
              <p className="mt-4 text-sm text-ink/50">No accounts yet.</p>
            )}
          </section>
        </>
      )}

      <p className="mt-12 border-t border-sepia-200 pt-6 text-center text-[0.65rem] tracking-wide text-ink/40">
        babardazzou
      </p>
    </main>
  );
}
