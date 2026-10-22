// Migrasi satu kali: single-user → multi-user.
// Menambahkan tabel `users` dan kolom `user_id` ke topics, study_sessions, resources,
// lalu menjadikan SEMUA data yang sudah ada milik akun GitHub yang kamu sebutkan.
//
// Jalankan SEBELUM `npm run db:push`:
//   npm run db:migrate-multiuser -- <username-github> [github-id-numerik]
//
// Aman dijalankan ulang (idempotent) dan berjalan dalam satu transaksi:
// kalau ada langkah yang gagal, database kembali seperti semula.
import postgres from "postgres";

const login = process.argv[2];
if (!login) {
  console.log("Pemakaian: npm run db:migrate-multiuser -- <username-github>");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.log("❌ DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}
if (url.includes("-pooler.")) {
  console.log("❌ Pakai koneksi langsung (host tanpa -pooler) untuk migrasi.");
  process.exit(1);
}

// Ambil ID numerik GitHub (tidak berubah walau username diganti).
// Opsional: argumen kedua = ID numerik, kalau GitHub API tidak bisa diakses.
let gh;
if (/^\d+$/.test(process.argv[3] ?? "")) {
  gh = { id: Number(process.argv[3]), login, name: null, avatar_url: null };
} else {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "learning-tracker-migration" },
  });
  if (!res.ok) {
    console.log(`❌ Gagal mengambil data GitHub untuk "${login}" (HTTP ${res.status})`);
    process.exit(1);
  }
  gh = await res.json();
}
console.log(`GitHub: ${gh.login} (id ${gh.id})`);

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  await sql.begin(async (tx) => {
    // 1. Tabel users — DDL sama persis dengan yang dihasilkan drizzle-kit dari schema.ts
    await tx`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "github_id" text NOT NULL,
        "login" text NOT NULL,
        "name" text,
        "image" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
      )`;

    // 2. Pemilik data lama
    const [owner] = await tx`
      INSERT INTO "users" ("github_id", "login", "name", "image")
      VALUES (${String(gh.id)}, ${gh.login}, ${gh.name ?? null}, ${gh.avatar_url ?? null})
      ON CONFLICT ("github_id") DO UPDATE SET "login" = EXCLUDED."login"
      RETURNING "id"`;
    console.log(`✔ User pemilik: id ${owner.id}`);

    // 3. Kolom user_id di tiap tabel data
    for (const table of ["topics", "study_sessions", "resources"]) {
      await tx`ALTER TABLE ${tx(table)} ADD COLUMN IF NOT EXISTS "user_id" integer`;
      const filled = await tx`
        UPDATE ${tx(table)} SET "user_id" = ${owner.id} WHERE "user_id" IS NULL`;
      await tx`ALTER TABLE ${tx(table)} ALTER COLUMN "user_id" SET NOT NULL`;

      const fk = `${table}_user_id_users_id_fk`;
      const [exists] = await tx`SELECT 1 FROM pg_constraint WHERE conname = ${fk}`;
      if (!exists) {
        await tx`
          ALTER TABLE ${tx(table)} ADD CONSTRAINT ${tx(fk)}
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
          ON DELETE cascade ON UPDATE no action`;
      }
      await tx`CREATE INDEX IF NOT EXISTS ${tx(`${table}_user_id_idx`)} ON ${tx(table)} USING btree ("user_id")`;
      console.log(`✔ ${table}: ${filled.count} baris dipindahkan ke user ${gh.login}`);
    }
  });
  console.log("\nSelesai. Lanjutkan dengan: npm run db:push  (seharusnya tidak ada perubahan lagi)");
} catch (e) {
  console.log("❌ Migrasi gagal, tidak ada yang diubah:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
