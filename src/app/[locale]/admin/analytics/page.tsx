"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, ShieldAlert } from "lucide-react";

import { getAccessToken, useUser } from "@/lib/useUser";
import Logo from "@/components/Logo";

// Mirrors AnalyticsSummary in src/lib/analytics.ts (server-only module, so the
// shape is repeated here rather than imported).
interface Totals {
  pageviews: number;
  visitors: number;
  sessions: number;
}
interface DailyPoint extends Totals {
  day: string;
}
interface GroupRow {
  key: string;
  count: number;
  visitors: number;
  share: number;
}
interface Summary {
  days: number;
  from: string;
  to: string;
  generatedAt: string;
  truncated: boolean;
  totals: Totals & { pagesPerSession: number };
  previous: Totals;
  daily: DailyPoint[];
  channels: GroupRow[];
  referrers: GroupRow[];
  campaigns: GroupRow[];
  pages: GroupRow[];
  countries: GroupRow[];
  devices: GroupRow[];
  locales: GroupRow[];
}

const RANGES = [7, 30, 90] as const;

const CHANNEL_LABELS: Record<string, string> = {
  direct: "Direct (typed, bookmark, app)",
  search: "Search engines",
  social: "Social networks",
  ai: "AI assistants",
  paid: "Paid ads",
  campaign: "Campaign links (UTM)",
  referral: "Other websites",
};

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
};

type DisplayNamesCtor = new (
  locales: string[],
  options: { type: "region" },
) => { of(code: string): string | undefined };

function countryName(code: string): string {
  if (code === "??") return "Unknown";
  const Ctor = (Intl as unknown as { DisplayNames?: DisplayNamesCtor }).DisplayNames;
  if (!Ctor) return code;
  try {
    return new Ctor(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtDay(iso: string, withYear = false): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

function delta(current: number, previous: number): { text: string; dir: "up" | "down" | "flat" } {
  if (!previous) return current ? { text: "new", dir: "up" } : { text: "no change", dir: "flat" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: "no change", dir: "flat" };
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, dir: pct > 0 ? "up" : "down" };
}

// ---------------------------------------------------------------------------
// Daily bar chart: one series (visitors), hover tooltip carries the rest.
// ---------------------------------------------------------------------------
function DailyChart({ daily }: { daily: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const padL = 36;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = Math.max(1, ...daily.map((d) => d.visitors));
  // Round the axis top to a friendly number.
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = [0, step, step * 2, step * 3].filter((t) => t <= top);
  if (ticks[ticks.length - 1] !== top) ticks.push(top);
  const n = daily.length;
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(28, slot - 2));
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const labelEvery = n > 60 ? 15 : n > 14 ? 7 : 1;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Visitors per day"
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              stroke="#d9c9b4"
              strokeWidth={t === 0 ? 1 : 0.6}
              strokeDasharray={t === 0 ? undefined : "2 3"}
            />
            <text
              x={padL - 6}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="#75604a"
              className="tabular-nums"
            >
              {fmt(t)}
            </text>
          </g>
        ))}
        {daily.map((d, i) => {
          const cx = padL + slot * i + slot / 2;
          const x = cx - barW / 2;
          const h = Math.max(d.visitors > 0 ? 2 : 0, (d.visitors / top) * plotH);
          const yTop = padT + plotH - h;
          const r = Math.min(4, barW / 2, h);
          const active = hover === i;
          return (
            <g key={d.day}>
              {/* Hit target bigger than the mark */}
              <rect
                x={padL + slot * i}
                y={padT}
                width={slot}
                height={plotH}
                fill={active ? "#ece3d6" : "transparent"}
                opacity={active ? 0.6 : 1}
                onMouseEnter={() => setHover(i)}
              />
              {h > 0 && (
                <path
                  d={`M${x},${padT + plotH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${padT + plotH} Z`}
                  fill={active ? "#5d4c3b" : "#8f7559"}
                  pointerEvents="none"
                />
              )}
              {i % labelEvery === 0 && (
                <text
                  x={cx}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#75604a"
                >
                  {fmtDay(d.day)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && daily[hover] && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-sepia-200 bg-parchment px-3 py-2 text-xs text-ink shadow-frame"
          style={{
            left: `${((padL + slot * hover + slot / 2) / W) * 100}%`,
            transform: hover > daily.length / 2 ? "translateX(-105%)" : "translateX(8px)",
          }}
        >
          <div className="font-medium">{fmtDay(daily[hover].day, true)}</div>
          <div className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 tabular-nums">
            <span className="text-ink/60">Visitors</span>
            <span className="text-right">{fmt(daily[hover].visitors)}</span>
            <span className="text-ink/60">Sessions</span>
            <span className="text-right">{fmt(daily[hover].sessions)}</span>
            <span className="text-ink/60">Page views</span>
            <span className="text-right">{fmt(daily[hover].pageviews)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function niceStep(max: number): number {
  const raw = max / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))));
  const unit = raw / pow;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return Math.max(1, nice * pow);
}

// ---------------------------------------------------------------------------
// Ranked table with a proportion bar (single hue, share of the table total)
// ---------------------------------------------------------------------------
function RankTable({
  title,
  hint,
  rows,
  countLabel,
  label,
  empty,
}: {
  title: string;
  hint?: string;
  rows: GroupRow[];
  countLabel: string;
  label?: (key: string) => string;
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-sepia-200 bg-white/70 p-5">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink/50">{hint}</p>}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-ink/50">
              <th className="pb-2 text-left font-medium">Source</th>
              <th className="pb-2 text-right font-medium">{countLabel}</th>
              <th className="pb-2 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="align-middle">
                <td className="py-1.5 pr-3">
                  <div className="truncate text-ink" title={r.key}>
                    {label ? label(r.key) : r.key}
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sepia-100">
                    <div
                      className="h-full rounded-full bg-sepia-500"
                      style={{ width: `${Math.max(2, r.share * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="py-1.5 text-right tabular-nums text-ink">{fmt(r.count)}</td>
                <td className="py-1.5 pl-3 text-right tabular-nums text-ink/60">
                  {Math.round(r.share * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const { user, loading } = useUser();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    (async () => {
      setFetching(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/admin/analytics?days=${days}`, {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        });
        if (active) setStatus(res.status);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load analytics");
        if (active) setSummary(data as Summary);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setFetching(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, loading, days]);

  const forbidden = status === 403;

  const kpis = useMemo(() => {
    if (!summary) return [];
    const t = summary.totals;
    const p = summary.previous;
    return [
      { label: "Visitors", value: t.visitors, d: delta(t.visitors, p.visitors) },
      { label: "Sessions", value: t.sessions, d: delta(t.sessions, p.sessions) },
      { label: "Page views", value: t.pageviews, d: delta(t.pageviews, p.pageviews) },
      {
        label: "Pages per session",
        value: t.pagesPerSession,
        d: null as ReturnType<typeof delta> | null,
      },
    ];
  }, [summary]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/admin"
        className="mb-8 inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-sepia-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>

      <Logo size={30} />

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="flex items-center gap-2 font-display text-4xl leading-tight text-ink">
          <BarChart3 className="h-8 w-8 text-sepia-600" /> Visitors
        </h1>
        {user && !forbidden && (
          <div className="inline-flex rounded-full border border-sepia-200 bg-white/70 p-1 text-sm">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                aria-pressed={days === r}
                className={`rounded-full px-3 py-1 transition ${
                  days === r
                    ? "bg-sepia-700 text-parchment"
                    : "text-sepia-700 hover:bg-sepia-50"
                }`}
              >
                {r} days
              </button>
            ))}
          </div>
        )}
      </div>

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

      {user && forbidden && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-medium">This area is restricted to administrators.</p>
        </div>
      )}

      {user && fetching && !summary && (
        <p className="mt-6 text-sm text-ink/50">Loading visitors…</p>
      )}

      {user && error && !forbidden && (
        <p className="mt-6 text-sm text-red-700">{error}</p>
      )}

      {user && summary && !forbidden && (
        <div className={fetching ? "opacity-60 transition" : "transition"}>
          <p className="mt-2 text-xs text-ink/50">
            {fmtDay(summary.from, true)} to {fmtDay(summary.to, true)}, compared with the
            previous {summary.days} days.
            {summary.truncated && " Data capped at 40,000 views for this range."}
          </p>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-sepia-200 bg-white/70 px-4 py-4 text-center"
              >
                <div className="font-display text-3xl tabular-nums text-ink">{fmt(k.value)}</div>
                <div className="mt-1 text-xs text-ink/50">{k.label}</div>
                {k.d && (
                  <div className="mt-1 text-xs tabular-nums text-ink/60">
                    {k.d.dir === "up" && "▲ "}
                    {k.d.dir === "down" && "▼ "}
                    {k.d.text}
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-xl border border-sepia-200 bg-white/70 p-5">
            <h2 className="font-display text-lg text-ink">Visitors per day</h2>
            <p className="mt-0.5 text-xs text-ink/50">
              Hover a day for sessions and page views.
            </p>
            <div className="mt-4">
              <DailyChart daily={summary.daily} />
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <RankTable
              title="Where visits come from"
              hint="Channel of each session's first page."
              rows={summary.channels}
              countLabel="Sessions"
              label={(k) => CHANNEL_LABELS[k] ?? k}
              empty="No sessions yet."
            />
            <RankTable
              title="Referring websites"
              hint="Sites that sent a visitor, by sessions."
              rows={summary.referrers}
              countLabel="Sessions"
              empty="No referrals yet. Direct and search traffic has no referrer."
            />
            <RankTable
              title="Campaign links"
              hint="utm_source / utm_campaign on the landing URL."
              rows={summary.campaigns}
              countLabel="Sessions"
              empty="No UTM-tagged visits yet."
            />
            <RankTable
              title="Most viewed pages"
              rows={summary.pages}
              countLabel="Views"
              empty="No page views yet."
            />
            <RankTable
              title="Countries"
              hint="From the visitor's network location."
              rows={summary.countries}
              countLabel="Sessions"
              label={countryName}
              empty="No sessions yet."
            />
            <div className="grid gap-4">
              <RankTable
                title="Devices"
                rows={summary.devices}
                countLabel="Sessions"
                label={(k) => DEVICE_LABELS[k] ?? k}
                empty="No sessions yet."
              />
              <RankTable
                title="Languages"
                hint="Site language the visitor landed on."
                rows={summary.locales}
                countLabel="Sessions"
                label={(k) => LOCALE_LABELS[k] ?? k}
                empty="No sessions yet."
              />
            </div>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-ink/50">
            Counted by MAPMA itself, no cookies and no third-party script. A visitor is
            unique within one day. A session starts after 30 minutes without activity.
            Bots, crawlers and admin pages are excluded. Counting began when this
            dashboard went live, earlier traffic is not shown.
          </p>
        </div>
      )}

      <p className="mt-12 border-t border-sepia-200 pt-6 text-center text-[0.65rem] tracking-wide text-ink/40">
        babardazzou
      </p>
    </main>
  );
}
