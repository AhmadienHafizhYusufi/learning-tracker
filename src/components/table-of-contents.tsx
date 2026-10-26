"use client";

import { useEffect, useState } from "react";

export type TocItem = {
  id: string;
  label: string;
  /** 0 = Topik / Log sesi, 1 = judul sesi, 2 = H1 di dalam catatan */
  level: 0 | 1 | 2;
};

/** Jarak dari atas layar (tinggi header sticky + sedikit ruang) */
const OFFSET = 96;

/**
 * Daftar isi ala situs dokumentasi:
 * - menempel (sticky) saat halaman di-scroll
 * - item bagian yang sedang dibaca ditandai (scrollspy)
 * - klik → scroll halus ke bagian tersebut
 * Desktop: panel di kiri. Layar kecil: tombol "Daftar isi" yang bisa dibuka-tutup.
 */
export function TableOfContents({ items }: { items: TocItem[] }) {
  const activeId = useActiveSection(items);

  if (items.length === 0) return null;

  return (
    <>
      {/* Layar kecil: collapsible di atas konten */}
      <details className="card group mb-6 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
          Daftar isi
          <span className="text-muted transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-line px-2 py-2">
          <TocList items={items} activeId={activeId} />
        </div>
      </details>

      {/* Desktop: panel sticky di kiri */}
      <nav
        aria-label="Daftar isi"
        className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2 pb-6 lg:block"
      >
        <p className="mb-3 px-2 text-xs font-semibold tracking-wide text-muted uppercase">Daftar isi</p>
        <TocList items={items} activeId={activeId} />
      </nav>
    </>
  );
}

function TocList({ items, activeId }: { items: TocItem[]; activeId: string | null }) {
  function go(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    history.replaceState(null, "", `#${id}`); // URL bisa dibagikan / di-bookmark
    // Mobile: tutup panel DULU, baru scroll — kalau terbalik, panel yang mengecil
    // menggeser konten sehingga posisi scroll meleset.
    const details = e.currentTarget.closest("details");
    if (details?.open) {
      details.open = false;
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <ol className="space-y-0.5 text-sm">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => go(e, item.id)}
              aria-current={active ? "location" : undefined}
              className={[
                "block rounded-md border-l-2 py-1 pr-2 leading-snug transition",
                item.level === 0 && "pl-2 font-medium",
                item.level === 1 && "ml-2 pl-3",
                item.level === 2 && "ml-2 pl-6 text-[13px]",
                active
                  ? "border-accent bg-accent-soft/40 text-accent"
                  : item.level === 0
                    ? "border-transparent text-ink hover:text-accent"
                    : "border-line text-muted hover:border-muted hover:text-ink",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="line-clamp-2">{item.label}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/** Bagian yang sedang dibaca = item terakhir yang sudah melewati batas atas layar */
function useActiveSection(items: TocItem[]) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const key = items.map((i) => i.id).join("|");

  useEffect(() => {
    const ids = key ? key.split("|") : [];
    let frame = 0;

    function update() {
      frame = 0;
      let current = ids[0] ?? null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - OFFSET <= 1) current = id;
      }
      // Sudah mentok di bawah halaman → aktifkan item terakhir yang terlihat
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        const visible = ids.filter((id) => {
          const r = document.getElementById(id)?.getBoundingClientRect();
          return r && r.top < window.innerHeight;
        });
        current = visible.at(-1) ?? current;
      }
      setActiveId(current);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [key]);

  return activeId;
}
