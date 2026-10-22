import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Opsional: batasi siapa yang boleh login (username GitHub, pisahkan koma).
 * Kosong / tidak di-set = siapa pun dengan akun GitHub boleh mendaftar.
 */
function isAllowed(login: unknown): boolean {
  const allowed = (process.env.AUTH_ALLOWED_GITHUB ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  return typeof login === "string" && allowed.includes(login.toLowerCase());
}

/** Simpan / perbarui user di database, kembalikan id internal-nya */
async function upsertUser(profile: {
  id?: unknown;
  login?: unknown;
  name?: unknown;
  avatar_url?: unknown;
}) {
  const githubId = String(profile.id);
  const values = {
    login: String(profile.login),
    name: typeof profile.name === "string" ? profile.name : null,
    image: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
    lastLoginAt: new Date(),
  };
  const [row] = await db
    .insert(users)
    .values({ githubId, ...values })
    .onConflictDoUpdate({ target: users.githubId, set: values })
    .returning({ id: users.id });
  return row.id;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Membaca AUTH_GITHUB_ID & AUTH_GITHUB_SECRET dari environment
  providers: [GitHub],
  pages: { signIn: "/login", error: "/login" },
  // Session disimpan di cookie terenkripsi (JWT) — tidak perlu tabel session
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    signIn({ profile }) {
      return Boolean(profile?.id) && isAllowed(profile?.login);
    },
    // `profile` hanya ada saat login pertama di sesi ini → saat itu user di-upsert
    async jwt({ token, profile }) {
      if (profile?.id) {
        token.uid = await upsertUser(profile);
        token.login = profile.login;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "number") session.user.id = String(token.uid);
      if (typeof token.login === "string") session.user.login = token.login;
      return session;
    },
  },
});

/**
 * ID user yang sedang login, atau null.
 * Cookie login lama (sebelum fitur multi-user) tidak punya uid → dianggap belum login.
 */
export async function getUserId(): Promise<number | null> {
  const session = await auth();
  const uid = Number(session?.user?.id);
  return Number.isInteger(uid) && uid > 0 ? uid : null;
}

declare module "next-auth" {
  interface User {
    login?: string;
  }
}
