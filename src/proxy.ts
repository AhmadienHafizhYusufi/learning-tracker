// Next.js 16: "proxy" adalah pengganti "middleware".
// Semua halaman & server action wajib login, kecuali halaman login dan endpoint Auth.js.
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
