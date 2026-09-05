import "server-only";

import { createHash } from "node:crypto";

import { routing } from "@/i18n/routing";
import { hasSupabaseAdmin } from "./env";
import { getSupabaseAdmin } from "./supabase/server";

// First-party visitor analytics. One row per page view, written by
// /api/track and read by the admin dashboard. No cookies, no IP stored: the
// visitor key is a salted hash of (UTC day + IP + user agent) that changes
// every day, so "visitors" means unique visitors per day.

export type Device = "mobile" | "tablet" | "desktop";
export type Channel =
  | "direct"
  | "search"
  | "social"
  | "ai"
  | "paid"
  | "campaign"
  | "referral";

export interface PageViewInput {
  /** Raw browser pathname, may carry a locale prefix (/fr/about). */
  path: string;
  /** document.referrer, empty for direct traffic and in-site navigation. */
  referrer: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  screenWidth?: number | null;
}

export interface PageViewRow {
  ts: string;
  path: string;
  locale: string | null;
  referrer_host: string | null;
  channel: Channel | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  country: string | null;
  device: Device;
  visitor_hash: string;
  is_entry: boolean;
}

const SESSION_GAP_MS = 30 * 60 * 1000;
const SITE_HOSTS = new Set(["mapma.org", "www.mapma.org", "localhost", "127.0.0.1"]);
const LOCAL_FILE = ".data/page_views.json";
const PAGE_SIZE = 1000;
const MAX_PAGES = 40; // 40k rows per query, plenty for the current traffic

const BOT_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegrambot|discordbot|skypeuripreview|curl\/|wget\/|python-requests|python-urllib|node-fetch|axios\/|go-http-client|java\/|okhttp|libwww|vercel-screenshot|uptime|monitor/i;

const SEARCH_RE = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|ecosia|qwant|baidu|startpage|brave)\./;
const SOCIAL_RE =
  /(^|\.)(facebook|fb|instagram|threads|twitter|x|t|linkedin|reddit|pinterest|tiktok|youtube|snapchat|whatsapp|telegram|messenger|lnkd)\.(com|net|me|co|org|in)$|^l\.(facebook|instagram)\.com$|^lm\.facebook\.com$/;
const AI_RE = /(chatgpt|openai|perplexity|claude|anthropic|gemini\.google|copilot\.microsoft|you)\.(com|ai)$/;

// ---------------------------------------------------------------------------
// Classification helpers (pure, exported for tests)
// ---------------------------------------------------------------------------
export function isBot(ua: string): boolean {
  return !ua || BOT_RE.test(ua);
}

export function deviceFromUa(ua: string, screenWidth?: number | null): Device {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
  if (/Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return "mobile";
  if (screenWidth && screenWidth < 768) return "mobile";
  return "desktop";
}

export function stripLocale(rawPath: string): { path: string; locale: string | null } {
  let path = rawPath.trim() || "/";
  if (!path.startsWith("/")) path = "/" + path;
  path = path.split("?")[0].split("#")[0];
  const m = path.match(/^\/([a-z]{2})(?=\/|$)/);
  if (m && (routing.locales as readonly string[]).includes(m[1])) {
    return { path: path.slice(m[0].length) || "/", locale: m[1] };
  }
  // Trailing slash normalisation, keep "/" as is.
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return { path, locale: routing.defaultLocale };
}

/** Referrer hostname without "www.", or null for direct / in-site traffic. */
export function referrerHost(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (SITE_HOSTS.has(host)) return null;
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function classifyChannel(
  host: string | null,
  utmSource?: string | null,
  utmMedium?: string | null,
): Channel {
  const medium = (utmMedium ?? "").toLowerCase();
  if (utmSource || medium) {
    if (/cpc|ppc|paid|display|cpm|ads?$/.test(medium)) return "paid";
    if (/social/.test(medium)) return "social";
    return "campaign";
  }
  if (!host) return "direct";
  if (SEARCH_RE.test(host)) return "search";
  if (SOCIAL_RE.test(host)) return "social";
  if (AI_RE.test(host)) return "ai";
  return "referral";
}

export function visitorHash(ip: string, ua: string, day: string): string {
  const salt = process.env.ANALYTICS_SALT ?? "mapma-visitors";
  return createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 20);
}

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clean(v: string | null | undefined, max = 120): string | null {
  if (!v) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
}

// ---------------------------------------------------------------------------
// Local JSON fallback (dev only, when Supabase isn't configured)
// ---------------------------------------------------------------------------
async function readLocal(): Promise<PageViewRow[]> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  try {
    const raw = await readFile(path.join(process.cwd(), LOCAL_FILE), "utf8");
    return JSON.parse(raw) as PageViewRow[];
  } catch {
    return [];
  }
}

async function writeLocal(rows: PageViewRow[]): Promise<void> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), LOCAL_FILE);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(rows, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Write path
// ---------------------------------------------------------------------------
export interface RecordResult {
  stored: boolean;
  reason?: "bot" | "no-ua";
}

export async function recordPageView(req: Request, input: PageViewInput): Promise<RecordResult> {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua) return { stored: false, reason: "no-ua" };
  if (isBot(ua)) return { stored: false, reason: "bot" };

  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip") || "0.0.0.0";
  const now = new Date();
  const { path, locale } = stripLocale(input.path);
  const host = referrerHost(input.referrer);
  const utmSource = clean(input.utmSource);
  const utmMedium = clean(input.utmMedium);
  const utmCampaign = clean(input.utmCampaign);
  const hash = visitorHash(ip, ua, utcDay(now));

  const row: PageViewRow = {
    ts: now.toISOString(),
    path: path.slice(0, 300),
    locale,
    referrer_host: host ? host.slice(0, 120) : null,
    channel: classifyChannel(host, utmSource, utmMedium),
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    country: clean(req.headers.get("x-vercel-ip-country"), 2)?.toUpperCase() ?? null,
    device: deviceFromUa(ua, input.screenWidth),
    visitor_hash: hash,
    is_entry: false,
  };

  const since = new Date(now.getTime() - SESSION_GAP_MS).toISOString();

  if (hasSupabaseAdmin) {
    const sb = getSupabaseAdmin()!;
    const { data: recent, error: rErr } = await sb
      .from("page_views")
      .select("id")
      .eq("visitor_hash", hash)
      .gte("ts", since)
      .limit(1);
    if (rErr) throw new Error(rErr.message);
    row.is_entry = !recent || recent.length === 0;
    const { error } = await sb.from("page_views").insert(row);
    if (error) throw new Error(error.message);
    return { stored: true };
  }

  const rows = await readLocal();
  row.is_entry = !rows.some((r) => r.visitor_hash === hash && r.ts >= since);
  rows.push(row);
  await writeLocal(rows);
  return { stored: true };
}

// ---------------------------------------------------------------------------
// Read path: fetch rows for the window and aggregate in memory
// ---------------------------------------------------------------------------
export interface Totals {
  pageviews: number;
  visitors: number;
  sessions: number;
}

export interface DailyPoint extends Totals {
  day: string; // YYYY-MM-DD (UTC)
}

export interface GroupRow {
  key: string;
  count: number;
  visitors: number;
  share: number; // 0..1 of the group's total count
}

export interface AnalyticsSummary {
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

const ROW_COLUMNS =
  "ts,path,locale,referrer_host,channel,utm_source,utm_medium,utm_campaign,country,device,visitor_hash,is_entry";

async function fetchRowsSince(sinceIso: string): Promise<{ rows: PageViewRow[]; truncated: boolean }> {
  if (!hasSupabaseAdmin) {
    const all = await readLocal();
    return { rows: all.filter((r) => r.ts >= sinceIso), truncated: false };
  }
  const sb = getSupabaseAdmin()!;
  const rows: PageViewRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await sb
      .from("page_views")
      .select(ROW_COLUMNS)
      .gte("ts", sinceIso)
      .order("ts", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as unknown as PageViewRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

function totals(rows: PageViewRow[]): Totals {
  const visitors = new Set<string>();
  let sessions = 0;
  for (const r of rows) {
    visitors.add(r.visitor_hash);
    if (r.is_entry) sessions++;
  }
  return { pageviews: rows.length, visitors: visitors.size, sessions };
}

function group(
  rows: PageViewRow[],
  keyOf: (r: PageViewRow) => string | null,
  limit = 12,
): GroupRow[] {
  const map = new Map<string, { count: number; visitors: Set<string> }>();
  let total = 0;
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null) continue;
    total++;
    let g = map.get(k);
    if (!g) {
      g = { count: 0, visitors: new Set() };
      map.set(k, g);
    }
    g.count++;
    g.visitors.add(r.visitor_hash);
  }
  return [...map.entries()]
    .map(([key, g]) => ({
      key,
      count: g.count,
      visitors: g.visitors.size,
      share: total ? g.count / total : 0,
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function aggregate(rows: PageViewRow[], days: number, now = new Date()): AnalyticsSummary {
  const DAY = 24 * 60 * 60 * 1000;
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const fromMs = todayStart - (days - 1) * DAY;
  const prevFromMs = fromMs - days * DAY;
  const fromIso = new Date(fromMs).toISOString();
  const prevFromIso = new Date(prevFromMs).toISOString();

  const current = rows.filter((r) => r.ts >= fromIso);
  const previous = rows.filter((r) => r.ts >= prevFromIso && r.ts < fromIso);

  // Daily series with every day present, zeros included.
  const byDay = new Map<string, PageViewRow[]>();
  for (const r of current) {
    const d = r.ts.slice(0, 10);
    const list = byDay.get(d);
    if (list) list.push(r);
    else byDay.set(d, [r]);
  }
  const daily: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(fromMs + i * DAY).toISOString().slice(0, 10);
    daily.push({ day, ...totals(byDay.get(day) ?? []) });
  }

  const entries = current.filter((r) => r.is_entry);
  const t = totals(current);

  return {
    days,
    from: fromIso.slice(0, 10),
    to: utcDay(now),
    generatedAt: now.toISOString(),
    truncated: false,
    totals: {
      ...t,
      pagesPerSession: t.sessions ? Math.round((t.pageviews / t.sessions) * 10) / 10 : 0,
    },
    previous: totals(previous),
    daily,
    channels: group(entries, (r) => r.channel ?? "direct", 8),
    referrers: group(entries, (r) => r.referrer_host, 12),
    campaigns: group(
      entries,
      (r) => (r.utm_source || r.utm_campaign ? `${r.utm_source ?? "?"} / ${r.utm_campaign ?? "(no campaign)"}` : null),
      12,
    ),
    pages: group(current, (r) => r.path, 12),
    countries: group(entries, (r) => r.country ?? "??", 12),
    devices: group(entries, (r) => r.device, 3),
    locales: group(entries, (r) => r.locale ?? routing.defaultLocale, 3),
  };
}

export async function getAnalyticsSummary(days: number): Promise<AnalyticsSummary> {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // Current window plus the previous one of equal length, for the deltas.
  const since = new Date(todayStart - (2 * days - 1) * DAY).toISOString();
  const { rows, truncated } = await fetchRowsSince(since);
  const summary = aggregate(rows, days, now);
  summary.truncated = truncated;
  return summary;
}
