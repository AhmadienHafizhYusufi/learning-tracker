"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/topics", label: "Topik" },
];

export function Nav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  // Pengunjung halaman publik (/p/...) yang belum login
  if (!signedIn) {
    return (
      <Link href="/login" className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-ink">
        Masuk
      </Link>
    );
  }
  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              active ? "bg-ink text-paper" : "text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
