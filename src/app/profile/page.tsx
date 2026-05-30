"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";

import type { Photo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { authEnabled, getAccessToken, useUser } from "@/lib/useUser";
import Logo from "@/components/Logo";

const STATUS_STYLES: Record<string, string> = {
  verified: "bg-green-100 text-green-800 border-green-300",
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  flagged: "bg-red-100 text-red-800 border-red-300",
  draft: "bg-sepia-100 text-sepia-700 border-sepia-300",
};

const STATUS_LABEL: Record<string, string> = {
  verified: "Verified",
  pending: "Pending review",
  flagged: "Flagged",
  draft: "Draft",
};

export default function ProfilePage() {
  const { user, loading } = useUser();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    (async () => {
      setFetching(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/my-photos", {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load your contributions");
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

  const counts = (photos ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-sepia-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <Logo size={30} />

      <h1 className="mt-8 font-display text-4xl leading-tight text-ink">
        My contributions
      </h1>

      {/* Not signed in */}
      {!loading && authEnabled && !user && (
        <div className="mt-6 rounded-xl border border-sepia-200 bg-white/70 p-6 text-sm text-ink/75">
          <p>You need to be signed in to see your profile and contributions.</p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/login"
              className="rounded-full bg-sepia-700 px-4 py-2 text-sm font-medium text-parchment hover:bg-sepia-800"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-sepia-100 px-4 py-2 text-sm text-sepia-800 hover:bg-sepia-200"
            >
              Create an account
            </Link>
          </div>
        </div>
      )}

      {/* Signed in */}
      {user && (
        <>
          {/* Account */}
          <section className="mt-6 rounded-xl border border-sepia-200 bg-white/70 p-5">
            <h2 className="font-display text-xl text-ink">Account</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink/50">Email</dt>
                <dd className="text-ink">{user.email}</dd>
              </div>
              <div>
                <dt className="text-ink/50">Contributor level</dt>
                <dd className="text-ink">Contributor</dd>
              </div>
            </dl>
          </section>

          {/* Summary counts */}
          <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: "total", label: "Total", value: photos?.length ?? 0 },
              { key: "verified", label: "Verified", value: counts.verified ?? 0 },
              { key: "pending", label: "Pending", value: counts.pending ?? 0 },
              { key: "flagged", label: "Flagged", value: counts.flagged ?? 0 },
            ].map((c) => (
              <div
                key={c.key}
                className="rounded-xl border border-sepia-200 bg-white/70 px-4 py-3 text-center"
              >
                <div className="font-display text-2xl text-ink">{c.value}</div>
                <div className="text-xs text-ink/50">{c.label}</div>
              </div>
            ))}
          </section>

          {/* Submissions */}
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">Submissions</h2>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 rounded-full bg-sepia-700 px-3 py-1.5 text-xs font-medium text-parchment hover:bg-sepia-800"
              >
                <Upload className="h-3.5 w-3.5" /> Upload a photo
              </Link>
            </div>

            {fetching && <p className="mt-4 text-sm text-ink/50">Loading your contributions…</p>}
            {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

            {photos && photos.length === 0 && (
              <p className="mt-4 rounded-xl border border-sepia-200 bg-white/70 p-5 text-sm text-ink/60">
                You haven&apos;t submitted any photographs yet. Upload your first
                historical photo to start building the archive.
              </p>
            )}

            {photos && photos.length > 0 && (
              <ul className="mt-4 space-y-3">
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
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-display text-base text-ink">{p.title}</h3>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
                            STATUS_STYLES[p.status] ?? STATUS_STYLES.draft,
                          )}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-sepia-600">
                        {p.city}
                        {p.year ? ` · ${p.year}` : ""}
                      </div>
                      {p.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-ink/60">{p.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Comments & feedback */}
          <section className="mt-8">
            <h2 className="font-display text-xl text-ink">Comments &amp; feedback</h2>
            <p className="mt-2 rounded-xl border border-sepia-200 bg-white/70 p-5 text-sm text-ink/60">
              Curator and community feedback on your submissions will appear here
              once the collaborative review process picks up your contributions.
              Keep documenting — accurate sources and context help your photos get
              verified faster.
            </p>
          </section>
        </>
      )}

      <p className="mt-12 border-t border-sepia-200 pt-6 text-center text-[0.65rem] tracking-wide text-ink/40">
        babardazzou
      </p>
    </main>
  );
}
