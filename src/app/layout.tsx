import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/auth";
import { Nav } from "@/components/nav";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

// URL lengkap untuk og:image dsb. (preview link di LinkedIn butuh URL absolut).
// Di Vercel memakai domain production otomatis (System Environment Variables).
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : `http://localhost:${process.env.PORT ?? 3000}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Learning Tracker",
  description: "Catat topik, sesi, dan resource belajar.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const signedIn = (await getUserId()) !== null;
  return (
    <html lang="id">
      <body className="min-h-dvh">
        <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-md bg-accent font-mono text-sm text-card">
                L
              </span>
              Learning Tracker
            </Link>
            <div className="flex items-center gap-3">
              <Nav signedIn={signedIn} />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
