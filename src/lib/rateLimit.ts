import "server-only";

// In-memory abuse guard. Protects the Gemini API budget from contributors who
// dump irrelevant photos: it rate-limits analyze calls, throttles publish
// bursts, and tracks repeated out-of-scope rejections so the UI can warn the
// contributor that their profile risks being suspended pending admin approval.
//
// State lives in module memory. That is sufficient for the single-process MVP
// dev/preview deployment; a multi-instance deploy would move this to Redis or
// a Postgres table.

const ANALYZE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const ANALYZE_MAX = 15; // analyze calls allowed per window before cooldown
const ANALYZE_COOLDOWN_MS = 5 * 60 * 1000;

const PUBLISH_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const PUBLISH_BURST_MAX = 20; // >20 publishes in a row triggers a waiting time
const PUBLISH_COOLDOWN_MS = 15 * 60 * 1000;

// After this many consecutive rejected (out-of-scope) analyses, the contributor
// is flagged as a suspension risk and shown the admin-approval warning.
const SUSPENSION_REJECTION_THRESHOLD = 5;

interface GuardState {
  analyzeTimes: number[];
  publishTimes: number[];
  consecutiveRejections: number;
  cooldownUntil: number;
}

const store = new Map<string, GuardState>();

function getState(key: string): GuardState {
  let s = store.get(key);
  if (!s) {
    s = { analyzeTimes: [], publishTimes: [], consecutiveRejections: 0, cooldownUntil: 0 };
    store.set(key, s);
  }
  return s;
}

function prune(times: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  return times.filter((t) => t > cutoff);
}

/** Stable per-contributor key: the user id when signed in, else the client IP. */
export function clientKey(req: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}

export interface GuardDecision {
  allowed: boolean;
  /** Seconds the contributor must wait before retrying (when blocked). */
  retryAfter?: number;
  message?: string;
}

/** Call BEFORE running an analyze. Enforces the per-window analyze cap. */
export function checkAnalyze(key: string): GuardDecision {
  const now = Date.now();
  const s = getState(key);

  if (now < s.cooldownUntil) {
    return cooldown(s, now, "You've sent a lot of images in a short time.");
  }

  s.analyzeTimes = prune(s.analyzeTimes, ANALYZE_WINDOW_MS, now);
  if (s.analyzeTimes.length >= ANALYZE_MAX) {
    s.cooldownUntil = now + ANALYZE_COOLDOWN_MS;
    return cooldown(
      s,
      now,
      "You've analyzed too many images in a short time. Please take a short break.",
    );
  }

  s.analyzeTimes.push(now);
  return { allowed: true };
}

export interface VerdictTracking {
  /** True once consecutive out-of-scope uploads cross the suspension threshold. */
  suspensionRisk: boolean;
  consecutiveRejections: number;
}

/**
 * Record the scope verdict of an analyzed image. Repeated rejections build
 * toward a suspension-risk flag; an accepted image resets the streak.
 */
export function recordVerdict(key: string, accepted: boolean): VerdictTracking {
  const s = getState(key);
  if (accepted) {
    s.consecutiveRejections = 0;
  } else {
    s.consecutiveRejections += 1;
  }
  return {
    suspensionRisk: s.consecutiveRejections >= SUSPENSION_REJECTION_THRESHOLD,
    consecutiveRejections: s.consecutiveRejections,
  };
}

/** Call BEFORE publishing. Throttles publish bursts (>20 in a row). */
export function checkPublish(key: string): GuardDecision {
  const now = Date.now();
  const s = getState(key);

  if (now < s.cooldownUntil) {
    return cooldown(s, now, "You've published a lot of photos in a short time.");
  }

  s.publishTimes = prune(s.publishTimes, PUBLISH_WINDOW_MS, now);
  if (s.publishTimes.length >= PUBLISH_BURST_MAX) {
    s.cooldownUntil = now + PUBLISH_COOLDOWN_MS;
    return cooldown(
      s,
      now,
      `You've published ${PUBLISH_BURST_MAX} photos in a row. Please wait a little before adding more so curators can keep up.`,
    );
  }

  return { allowed: true };
}

/** Call AFTER a publish succeeds, to count it toward the burst window. */
export function recordPublish(key: string): void {
  const now = Date.now();
  const s = getState(key);
  s.publishTimes = prune(s.publishTimes, PUBLISH_WINDOW_MS, now);
  s.publishTimes.push(now);
}

function cooldown(s: GuardState, now: number, message: string): GuardDecision {
  const retryAfter = Math.max(1, Math.ceil((s.cooldownUntil - now) / 1000));
  return { allowed: false, retryAfter, message };
}
