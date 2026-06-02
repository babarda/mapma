"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Pencil, ShieldAlert, Trash2, X } from "lucide-react";

import type { Photo, VerificationStatus } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getAccessToken, useUser } from "@/lib/useUser";
import Logo from "@/components/Logo";

const LocationPicker = dynamic(
  () => import("@/components/upload/LocationPicker"),
  { ssr: false, loading: () => <div className="h-72 rounded-lg bg-sepia-100" /> },
);

const STATUSES: VerificationStatus[] = ["verified", "pending", "flagged", "draft"];

interface EditForm {
  title: string;
  description: string;
  city: string;
  region: string;
  year: string;
  yearApproximate: boolean;
  categories: string[];
  tagsText: string;
  source: string;
  status: VerificationStatus;
  lng: number;
  lat: number;
}

function toForm(p: Photo): EditForm {
  return {
    title: p.title,
    description: p.description ?? "",
    city: p.city,
    region: p.region ?? "",
    year: p.year != null ? String(p.year) : "",
    yearApproximate: p.yearApproximate,
    categories: [...p.categories],
    tagsText: p.tags.join(", "),
    source: p.source ?? "",
    status: p.status,
    lng: p.lng,
    lat: p.lat,
  };
}

export default function AdminPhotosPage() {
  const { user, loading } = useUser();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const [editing, setEditing] = useState<Photo | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    (async () => {
      setFetching(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/admin/photos", {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        });
        if (active) setStatus(res.status);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load photos");
        if (active) setPhotos(data.photos as Photo[]);
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

  function openEdit(p: Photo) {
    setEditing(p);
    setForm(toForm(p));
    setEditError(null);
  }

  function closeEdit() {
    setEditing(null);
    setForm(null);
  }

  function toggleCategory(c: string) {
    setForm((f) =>
      f
        ? {
            ...f,
            categories: f.categories.includes(c)
              ? f.categories.filter((x) => x !== c)
              : [...f.categories, c],
          }
        : f,
    );
  }

  async function save() {
    if (!editing || !form) return;
    setSaving(true);
    setEditError(null);
    try {
      const yearTrim = form.year.trim();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        city: form.city.trim(),
        region: form.region.trim() || null,
        year: yearTrim === "" ? null : Number(yearTrim),
        yearApproximate: form.yearApproximate,
        categories: form.categories,
        tags: form.tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        source: form.source.trim() || null,
        status: form.status,
        lng: form.lng,
        lat: form.lat,
      };
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/photos/${editing.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      const updated = data.photo as Photo;
      setPhotos((ps) => (ps ? ps.map((p) => (p.id === updated.id ? updated : p)) : ps));
      closeEdit();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Photo) {
    if (
      !window.confirm(
        `Delete "${p.title}"? This permanently removes the photo and its image files. This cannot be undone.`,
      )
    )
      return;
    setDeletingId(p.id);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/photos/${p.id}`, {
        method: "DELETE",
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setPhotos((ps) => (ps ? ps.filter((x) => x.id !== p.id) : ps));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const forbidden = status === 403;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/admin"
        className="mb-8 inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-sepia-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <Logo size={30} />
      <h1 className="mt-8 font-display text-4xl leading-tight text-ink">
        Manage photos
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        Edit any photo&apos;s details and location, approve its status, or remove
        spam and test uploads.
      </p>

      {!loading && !user && (
        <div className="mt-6 rounded-xl border border-sepia-200 bg-white/70 p-6 text-sm text-ink/75">
          <p>You need to be signed in as an administrator.</p>
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
          <p>This area is restricted to administrators.</p>
        </div>
      )}

      {user && fetching && <p className="mt-6 text-sm text-ink/50">Loading photos…</p>}
      {user && error && !forbidden && (
        <p className="mt-6 text-sm text-red-700">{error}</p>
      )}

      {user && photos && (
        <>
          <p className="mt-6 text-xs text-ink/60">{photos.length} photographs</p>
          <ul className="mt-3 space-y-3">
            {photos.map((p) => (
              <li
                key={p.id}
                className="flex gap-4 rounded-xl border border-sepia-200 bg-white/70 p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnailUrl}
                  alt={p.title}
                  className="h-20 w-28 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-base text-ink">{p.title}</h3>
                  <div className="mt-0.5 text-xs text-sepia-600">
                    {p.city}
                    {p.year ? ` · ${p.yearApproximate ? "c. " : ""}${p.year}` : ""} ·{" "}
                    <span className="uppercase tracking-wide">{p.status}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-ink/40">
                    {p.uploaderName ?? "Anonymous"} · {p.lat.toFixed(4)},{" "}
                    {p.lng.toFixed(4)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sepia-700 px-3 py-1.5 text-xs font-medium text-parchment hover:bg-sepia-800"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => remove(p)}
                    disabled={deletingId === p.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingId === p.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Edit modal */}
      {editing && form && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-ink/60 p-0 backdrop-blur-sm sm:p-6"
          onClick={closeEdit}
        >
          <div
            className="relative my-0 w-full max-w-2xl bg-parchment p-5 shadow-frame sm:my-4 sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeEdit}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full bg-ink/10 p-1.5 text-ink/70 hover:bg-ink/20"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="font-display text-2xl text-ink">Edit photo</h2>

            <div className="mt-4 space-y-3">
              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
                  />
                </Field>
                <Field label="Region">
                  <input
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Year (before 2000)">
                  <input
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    inputMode="numeric"
                    placeholder="e.g. 1958"
                    className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as VerificationStatus })
                    }
                    className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={form.yearApproximate}
                  onChange={(e) =>
                    setForm({ ...form, yearApproximate: e.target.checked })
                  }
                />
                Year is approximate (circa)
              </label>

              <Field label="Categories">
                <div className="flex flex-wrap gap-1.5">
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
              </Field>

              <Field label="Tags (comma-separated)">
                <input
                  value={form.tagsText}
                  onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
                  placeholder="medina, market, gate"
                  className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
                />
              </Field>

              <Field label="Source / credit">
                <input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  maxLength={55}
                  className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
                />
              </Field>

              <Field label="Location — search, click, or drag the pin">
                <LocationPicker
                  lng={form.lng}
                  lat={form.lat}
                  onChange={(lng, lat) => setForm({ ...form, lng, lat })}
                />
                <p className="mt-1 text-xs text-ink/50">
                  {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                </p>
              </Field>

              {editError && <p className="text-sm text-red-700">{editError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={closeEdit}
                  className="rounded-full border border-sepia-300 px-4 py-2 text-sm text-sepia-800 hover:bg-sepia-100"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-full bg-sepia-700 px-5 py-2 text-sm font-medium text-parchment hover:bg-sepia-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-12 border-t border-sepia-200 pt-6 text-center text-[0.65rem] tracking-wide text-ink/40">
        babardazzou
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink/60">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
