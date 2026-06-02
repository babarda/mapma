"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Send } from "lucide-react";

import type { Comment } from "@/lib/types";
import { getAccessToken, useUser } from "@/lib/useUser";

export default function Comments({ photoId }: { photoId: string }) {
  const t = useTranslations("Comments");
  const { user } = useUser();

  function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const s = Math.floor((Date.now() - then) / 1000);
    if (s < 60) return t("justNow");
    const m = Math.floor(s / 60);
    if (m < 60) return t("minutesAgo", { m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("hoursAgo", { h });
    const d = Math.floor(h / 24);
    if (d < 30) return t("daysAgo", { d });
    return new Date(iso).toLocaleDateString();
  }

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setComments(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/comments?photoId=${encodeURIComponent(photoId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load comments");
        if (active) setComments(data.comments as Comment[]);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load comments");
      }
    })();
    return () => {
      active = false;
    };
  }, [photoId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          photoId,
          body: text,
          authorName: user ? undefined : name.trim() || undefined,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post comment");
      if (data.comment) {
        setComments((prev) => [...(prev ?? []), data.comment as Comment]);
      }
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-display text-lg text-ink">
        <MessageCircle className="h-4 w-4 text-sepia-600" />
        {t("title")}
        {comments && comments.length > 0 && (
          <span className="text-sm font-normal text-ink/40">({comments.length})</span>
        )}
      </h3>

      {/* Existing comments */}
      <ul className="mt-3 space-y-3">
        {comments === null && <li className="text-sm text-ink/40">{t("loading")}</li>}
        {comments && comments.length === 0 && (
          <li className="text-sm text-ink/50">{t("empty")}</li>
        )}
        {comments?.map((c) => (
          <li key={c.id} className="rounded-lg border border-sepia-200 bg-white/70 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-ink">
                {c.authorName || t("anonymous")}
              </span>
              <span className="shrink-0 text-[11px] text-ink/40">{timeAgo(c.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink/75">{c.body}</p>
          </li>
        ))}
      </ul>

      {/* New comment form */}
      <form onSubmit={submit} className="mt-4 space-y-2">
        {/* Honeypot: hidden from humans, tempting to bots. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
          aria-hidden
        />
        {!user && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
          />
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t("bodyPlaceholder")}
          className="w-full rounded-lg border border-sepia-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sepia-400"
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-sepia-700 px-4 py-2 text-sm font-medium text-parchment transition hover:bg-sepia-800 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {posting ? t("posting") : t("post")}
          </button>
        </div>
      </form>
    </section>
  );
}
