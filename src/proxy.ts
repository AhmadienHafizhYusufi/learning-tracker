// Next.js 16: "proxy" adalah pengganti "middleware".
// Semua halaman & server action wajib login, kecuali halaman login, endpoint Auth.js,
// halaman publik read-only (/p/...) dan file upload lokal saat development (/uploads/...).
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  // Cookie login lama tanpa user id (sebelum multi-user) → wajib login ulang
  if (!req.auth?.user?.id) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api/auth|login|p/|uploads/|_next/static|_next/image|favicon.ico).*)"],
};
