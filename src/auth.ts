import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Username GitHub yang boleh login, dipisah koma (case-insensitive).
 * Contoh di .env: AUTH_ALLOWED_GITHUB=ahhayu
 * Kalau kosong, TIDAK ADA yang bisa login (fail-closed).
 */
function isAllowed(login: unknown): boolean {
  if (typeof login !== "string") return false;
  const allowed = (process.env.AUTH_ALLOWED_GITHUB ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(login.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Membaca AUTH_GITHUB_ID & AUTH_GITHUB_SECRET dari environment
  providers: [GitHub],
  pages: { signIn: "/login", error: "/login" },
  // Session disimpan di cookie terenkripsi (JWT) — tidak perlu tabel di database
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    // Tolak login dari akun GitHub selain milikmu
    signIn({ profile }) {
      return isAllowed(profile?.login);
    },
    jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login;
      return token;
    },
    session({ session, token }) {
      if (typeof token.login === "string") session.user.login = token.login;
      return session;
    },
  },
});

declare module "next-auth" {
  interface User {
    login?: string;
  }
}
