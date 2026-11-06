import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getUserId } from "@/auth";
import { NoteContent } from "@/components/note-content";
import { TableOfContents, type TocItem } from "@/components/table-of-contents";
import { hostOf, RESOURCE_LABEL, safeHref } from "@/lib/format";
import { extractNoteHeadings, headingId } from "@/lib/headings";
import { getPublicTopic } from "@/lib/queries";
import { noteToText } from "@/lib/sanitize";

/*
 * Halaman publik read-only sebuah topik — bisa dibuka tanpa login.
 * Tidak ada form / tombol ubah sama sekali; semua server action juga tetap
 * mengecek login & kepemilikan, jadi pengunjung tidak bisa mengubah apa pun.
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ publicId: string }> };

// Dipakai generateMetadata & halaman dalam satu request → cukup sekali query
const load = cache((publicId: string) => getPublicTopic(publicId));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).publicId);
  if (!data) return { title: "Topik tidak ditemukan · Learning Tracker" };
  const { topic, sessions } = data;
  const author = topic.ownerName ?? topic.ownerLogin;
  const description =
    topic.description?.trim() ||
    sessions.map((s) => s.title ?? noteToText(s.note)).find(Boolean)?.slice(0, 160) ||
    `Catatan belajar ${author} di Learning Tracker.`;
  const title = `${topic.title} — catatan belajar ${author}`;
  return {
    title,
    description,
    // Gambar preview dibuat otomatis oleh opengraph-image.tsx di folder ini
    openGraph: { title, description, type: "article", siteName: "Learning Tracker" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicTopicPage({ params }: Props) {
  const { publicId } = await params;
  const [data, viewerId] = await Promise.all([load(publicId), getUserId()]);
  // Tidak ada, atau pemiliknya sudah mematikan "Publik" → 404
  if (!data) notFound();
  const { topic, sessions, unattachedResources } = data;
  const author = topic.ownerName ?? topic.ownerLogin;
  const isOwner = viewerId === topic.userId;

  const toc: TocItem[] = [
    { id: "topik", label: topic.title, level: 0 },
    ...sessions.flatMap((s): TocItem[] => [
      { id: `sesi-${s.id}`, label: s.title ?? "Tanpa judul", level: 1 },
      ...extractNoteHeadings(s.note).map((text, i): TocItem => ({ id: headingId(s.id, i), label: text, level: 2 })),
    ]),
  ];

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
      <aside className="lg:pt-2">
        <TableOfContents items={toc} />
      </aside>

      <article className="min-w-0 space-y-6">
        {isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent-soft/40 px-4 py-2.5 text-sm">
            <span>
              <strong className="font-medium">Tampilan publik.</strong>{" "}
              <span className="text-muted">Seperti inilah orang lain melihat topik ini.</span>
            </span>
            <Link href={`/topics/${topic.id}`} className="font-medium text-accent hover:underline">
              ← Kembali ke editor
            </Link>
          </div>
        )}

        <header id="topik" className="card p-5 sm:p-6">
          <div className="flex items-center gap-2.5 text-sm text-muted">
            {topic.ownerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={topic.ownerImage} alt="" className="size-7 rounded-full border border-line" />
            )}
            <span>
              Catatan belajar <span className="font-medium text-ink">{author}</span>
            </span>
            {topic.category && (
              <>
                <span aria-hidden>·</span>
                <span>{topic.category}</span>
              </>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{topic.title}</h1>
          {topic.description && <p className="mt-2 max-w-prose text-muted">{topic.description}</p>}
        </header>

        {sessions.length ? (
          <ol className="space-y-4">
            {sessions.map((s, i) => (
              <li key={s.id} id={`sesi-${s.id}`} className="card p-5 sm:p-6">
                <p className="num text-xs text-muted">Sesi {i + 1}</p>
                <h2 className="mt-0.5 text-lg font-semibold">{s.title ?? <span className="text-muted">Tanpa judul</span>}</h2>
                {s.note && (
                  <div className="mt-3">
                    <NoteContent html={s.note} sessionId={s.id} />
                  </div>
                )}
                {s.resources.length > 0 && (
                  <PublicResources resources={s.resources} className="mt-4 border-t border-line pt-3" />
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="card p-6 text-sm text-muted">Belum ada sesi di topik ini.</p>
        )}

        {unattachedResources.length > 0 && (
          <section className="card p-5 sm:p-6">
            <h2 className="font-semibold">Resource</h2>
            <PublicResources resources={unattachedResources} className="mt-2" />
          </section>
        )}

        {!viewerId && (
          <footer className="py-4 text-center text-sm text-muted">
            Dibuat dengan <span className="font-medium text-ink">Learning Tracker</span> ·{" "}
            <Link href="/login" className="text-accent hover:underline">
              Catat perjalanan belajarmu sendiri →
            </Link>
          </footer>
        )}
      </article>
    </div>
  );
}

function PublicResources({
  resources,
  className = "",
}: {
  resources: { id: number; title: string; url: string; type: keyof typeof RESOURCE_LABEL }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="label">Referensi</p>
      <ul className="space-y-1">
        {resources.map((r) => (
          <li key={r.id} className="text-sm">
            <a
              href={safeHref(r.url)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="hover:text-accent"
            >
              {r.title}
            </a>
            <span className="ml-2 text-xs text-muted">
              {RESOURCE_LABEL[r.type]} · {hostOf(r.url)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
