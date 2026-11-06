"use client";

import { useEffect, useState, useTransition } from "react";
import { setTopicPublic } from "@/app/actions";

/**
 * Panel "Bagikan": toggle halaman publik read-only + salin link + bagikan ke LinkedIn.
 * Default privat. Mematikan toggle membuat link langsung tidak bisa dibuka (404).
 */
export function ShareTopic({
  topicId,
  initialPublic,
  initialPublicId,
}: {
  topicId: number;
  initialPublic: boolean;
  initialPublicId: string | null;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [publicId, setPublicId] = useState(initialPublicId);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const path = publicId ? `/p/${publicId}` : null;
  const url = path && origin ? origin + path : "";

  function toggle() {
    const next = !isPublic;
    setIsPublic(next); // langsung terlihat
    setError(null);
    setCopied(false);
    startTransition(async () => {
      try {
        const res = await setTopicPublic(topicId, next);
        if (!res.ok) throw new Error(res.error);
        setPublicId(res.publicId);
      } catch (err) {
        setIsPublic(!next); // kembalikan
        setError(err instanceof Error && err.message ? err.message : "Gagal mengubah pengaturan. Coba lagi.");
      }
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard diblokir → biarkan user menyalin manual dari kotak link
      (document.getElementById(`share-url-${topicId}`) as HTMLInputElement | null)?.select();
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-paper/60 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id={`share-label-${topicId}`} className="text-sm font-medium">
            Halaman publik
          </p>
          <p className="text-xs text-muted">
            {isPublic
              ? "Siapa pun yang punya link bisa membaca catatan & referensi topik ini, tanpa bisa mengubahnya."
              : "Privat. Nyalakan untuk mendapat link yang bisa dibagikan, mis. ke LinkedIn."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-labelledby={`share-label-${topicId}`}
          onClick={toggle}
          disabled={pending}
          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            isPublic ? "bg-accent" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-card shadow transition-transform ${
              isPublic ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {isPublic && path && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              id={`share-url-${topicId}`}
              readOnly
              value={url}
              aria-label="Link halaman publik"
              onFocus={(e) => e.currentTarget.select()}
              className="input min-w-0 flex-1 font-mono text-xs"
            />
            <button type="button" onClick={copy} className="btn-ghost shrink-0 text-xs">
              {copied ? "Tersalin ✓" : "Salin"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a66c2] px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
            >
              <LinkedInIcon />
              Bagikan ke LinkedIn
            </a>
            <a
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-2 py-1.5 text-xs text-muted hover:text-ink"
            >
              Lihat tampilan publik ↗
            </a>
          </div>
          <p className="text-xs text-muted">Tanggal, durasi, dan statistik waktu belajar tidak ditampilkan.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
