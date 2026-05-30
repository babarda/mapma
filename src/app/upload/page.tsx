"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Sparkles } from "lucide-react";

import { CATEGORIES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { authEnabled, getAccessToken, useUser } from "@/lib/useUser";
import type { AiSuggestion } from "@/lib/schemas";

const LocationPicker = dynamic(
  () => import("@/components/upload/LocationPicker"),
  { ssr: false },
);

interface FormState {
  title: string;
  description: string;
  city: string;
  year: string;
  yearApproximate: boolean;
  source: string;
  lng: number | null;
  lat: number | null;
  categories: Category[];
  tags: string;
  aiConfidence: number | null;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  city: "",
  year: "",
  yearApproximate: false,
  source: "",
  lng: null,
  lat: null,
  categories: [],
  tags: "",
  aiConfidence: null,
};

export default function UploadPage() {
  const router = useRouter();
  const { user } = useUser();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [analyzing, setAnalyzing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockNote, setMockNote] = useState(false);
  const [verdict, setVerdict] = useState<{ accepted: boolean; reason: string | null } | null>(null);
  const [suspensionRisk, setSuspensionRisk] = useState(false);
  const [cooldown, setCooldown] = useState<string | null>(null);

  function pickFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setForm(EMPTY);
    setError(null);
    setMockNote(false);
    setVerdict(null);
    setCooldown(null);
  }

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setCooldown(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = (await res.json()) as
        | (AiSuggestion & {
            mock?: boolean;
            suspensionRisk?: boolean;
            retryAfter?: number;
          })
        | { error: string; retryAfter?: number };
      if (res.status === 429) {
        setCooldown(
          "error" in data && data.error
            ? data.error
            : "You're going too fast. Please wait a moment before analyzing another image.",
        );
        return;
      }
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Analysis failed");
      }
      const known = new Set<string>(CATEGORIES);
      setForm({
        title: data.title,
        description: data.description,
        city: data.city,
        year: data.year != null ? String(data.year) : "",
        yearApproximate: false,
        source: "",
        lng: data.lng,
        lat: data.lat,
        categories: data.categories.filter((c) => known.has(c)) as Category[],
        tags: data.tags.join(", "),
        aiConfidence: data.confidence,
      });
      setMockNote(Boolean(data.mock));
      setVerdict({ accepted: data.accepted, reason: data.rejectionReason });
      setSuspensionRisk(Boolean(data.suspensionRisk));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleCategory(c: Category) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c)
        ? f.categories.filter((x) => x !== c)
        : [...f.categories, c],
    }));
  }

  async function publish() {
    if (!file) return;
    if (verdict && !verdict.accepted) {
      setError(
        verdict.reason ??
          "This image is outside MAPMA's scope (Morocco, pre-2000 heritage only) and can't be published.",
      );
      return;
    }
    if (form.lng == null || form.lat == null) {
      setError("Set the location on the map.");
      return;
    }
    if (!form.title.trim() || !form.city.trim()) {
      setError("Title and city are required.");
      return;
    }
    const yr = form.year ? Number(form.year) : null;
    if (yr == null || Number.isNaN(yr) || yr >= 2000) {
      setError("A known year before 2000 is required — MAPMA only archives pre-2000 material.");
      return;
    }
    setPublishing(true);
    setError(null);
    setCooldown(null);
    try {
      const meta = {
        title: form.title.trim(),
        description: form.description.trim(),
        city: form.city.trim(),
        region: null,
        lng: form.lng,
        lat: form.lat,
        year: form.year ? Number(form.year) : null,
        yearApproximate: form.yearApproximate,
        categories: form.categories,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        source: form.source.trim() || null,
        aiConfidence: form.aiConfidence,
      };
      const fd = new FormData();
      fd.append("file", file);
      fd.append("meta", JSON.stringify(meta));

      const token = await getAccessToken();
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const data = await res.json();
      if (res.status === 429) {
        setCooldown(data.error ?? "You've published a lot of photos in a row. Please wait a little.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      // Drop the cached homepage RSC payload so the map re-fetches and shows
      // the photo we just published, then navigate to it.
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const field =
    "w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-sepia-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <h1 className="font-display text-3xl text-ink">Upload a photo</h1>
      <p className="mt-1 text-sm text-ink/60">
        {authEnabled && !user
          ? "You're not signed in — sign in to attribute this upload to your account, or continue as a guest."
          : "Add an old photograph, let AI suggest the details, review, and publish."}
      </p>

      {/* Step 1: choose file */}
      <div className="mt-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sepia-300 bg-white/60 py-14 text-sepia-700 hover:bg-sepia-50"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">Choose an image</span>
            <span className="text-xs text-ink/50">JPG or PNG, up to 12MB</span>
          </button>
        ) : (
          <div className="overflow-hidden rounded-xl border border-sepia-300 bg-white shadow-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="max-h-80 w-full object-contain bg-ink/5" />
            <div className="flex items-center justify-between gap-3 p-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="text-sm text-sepia-700 underline hover:text-sepia-900"
              >
                Choose a different image
              </button>
              <button
                onClick={analyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-full bg-sepia-700 px-4 py-2 text-sm font-medium text-parchment hover:bg-sepia-800 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {analyzing ? "Analyzing…" : "Analyze with AI"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cooldown notice (rate limited) */}
      {cooldown && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-medium">Please slow down.</strong> {cooldown}
        </div>
      )}

      {/* Suspension-risk warning (repeated out-of-scope uploads) */}
      {suspensionRisk && (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong className="font-medium">Heads up.</strong> You've submitted
          several images that fall outside MAPMA's scope. Continuing to upload
          unrelated content means you risk having your profile put on hold,
          pending administrator approval. MAPMA archives only pre-2000 Moroccan
          heritage photographs.
        </div>
      )}

      {/* Step 2: review + edit */}
      {preview && (
        <div className="mt-6 space-y-4 rounded-xl border border-sepia-200 bg-white/70 p-5">
          {mockNote && (
            <p className="rounded-lg bg-sepia-50 px-3 py-2 text-xs text-sepia-700">
              AI key not configured — these are placeholder suggestions. Add{" "}
              <code>GEMINI_API_KEY</code> for real analysis. Edit freely.
            </p>
          )}
          {verdict && !verdict.accepted && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              <strong className="font-medium">Out of scope.</strong>{" "}
              {verdict.reason ??
                "This image isn't a pre-2000 Moroccan heritage photograph, so it can't be published."}
            </div>
          )}
          {verdict && verdict.accepted && (
            <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
              This image fits MAPMA's scope. Review the details below and publish.
            </div>
          )}
          {form.aiConfidence != null && (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                form.aiConfidence < 0.5
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-sepia-200 bg-sepia-50 text-sepia-700",
              )}
            >
              <span className="font-medium">
                AI confidence: {(form.aiConfidence * 100).toFixed(0)}%
              </span>
              {form.aiConfidence < 0.5 && (
                <span>
                  {" "}— low confidence. The AI is unsure, so please verify and
                  correct the title, location, and year below with your own
                  knowledge rather than trusting these suggestions.
                </span>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm">
              <span className="text-ink/70">Title</span>
              <input
                className={field}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="text-ink/70">Description</span>
              <textarea
                rows={3}
                className={field}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-ink/70">City</span>
              <input
                className={field}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </label>
            <div className="text-sm">
              <span className="text-ink/70">Year</span>
              <input
                type="number"
                className={field}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
              <label className="mt-1.5 flex items-center gap-2 text-xs text-ink/60">
                <input
                  type="checkbox"
                  checked={form.yearApproximate}
                  onChange={(e) =>
                    setForm({ ...form, yearApproximate: e.target.checked })
                  }
                  className="h-3.5 w-3.5 rounded border-sepia-300 text-sepia-700 focus:ring-sepia-400"
                />
                Approximate date (circa)
              </label>
            </div>
            <label className="sm:col-span-2 text-sm">
              <span className="text-ink/70">Source / credit</span>
              <input
                className={field}
                maxLength={55}
                value={form.source}
                placeholder="e.g. Archives coloniales du Maroc"
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="text-ink/70">Tags (comma separated)</span>
              <input
                className={field}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </label>
          </div>

          <div>
            <span className="text-sm text-ink/70">Categories</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const active = form.categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition",
                      active
                        ? "bg-sepia-700 text-parchment"
                        : "bg-sepia-100 text-sepia-700 hover:bg-sepia-200",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-sm text-ink/70">Location</span>
            <p className="mb-1.5 text-xs text-ink/40">
              Click or drag the pin to set the spot, or type exact coordinates
              below.
            </p>
            <div className="mb-2 grid grid-cols-2 gap-3">
              <label className="text-xs text-ink/60">
                Latitude
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={field}
                  value={form.lat ?? ""}
                  placeholder="e.g. 33.5731"
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      lat: v === "" ? null : Number(v),
                    }));
                  }}
                />
              </label>
              <label className="text-xs text-ink/60">
                Longitude
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={field}
                  value={form.lng ?? ""}
                  placeholder="e.g. -7.5898"
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      lng: v === "" ? null : Number(v),
                    }));
                  }}
                />
              </label>
            </div>
            <LocationPicker
              lng={form.lng}
              lat={form.lat}
              onChange={(lng, lat) => setForm((f) => ({ ...f, lng, lat }))}
            />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            onClick={publish}
            disabled={publishing || (verdict != null && !verdict.accepted)}
            className="w-full rounded-full bg-sepia-700 px-4 py-3 text-sm font-medium text-parchment transition hover:bg-sepia-800 disabled:opacity-50"
          >
            {publishing
              ? "Publishing…"
              : verdict != null && !verdict.accepted
                ? "Cannot publish — out of scope"
                : "Publish to the map"}
          </button>
        </div>
      )}
    </main>
  );
}
