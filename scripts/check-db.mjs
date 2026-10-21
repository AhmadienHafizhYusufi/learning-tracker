// Cek koneksi database & tabel. Jalankan: npm run db:check
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("❌ DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}
console.log("Host:", new URL(url).host);

const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });
try {
  const [v] = await sql`select version()`;
  console.log("✔ Terhubung:", v.version.split(" ").slice(0, 2).join(" "));

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by 1`;
  console.log("Tabel:", tables.map((r) => r.table_name));

  for (const name of ["topics", "study_sessions", "resources"]) {
    try {
      const [r] = await sql`select count(*)::int as c from ${sql(name)}`;
      console.log(`  ${name}: ${r.c} baris`);
    } catch (e) {
      console.log(`  ${name}: ❌ ${e.message}`);
    }
  }
} catch (e) {
  console.log("❌ Gagal konek:", e.code ?? "", e.message);
} finally {
  await sql.end();
}

// Tiru cara aplikasi: 6 query paralel lewat 1 pool berisi 5 koneksi
console.log("\nTes query paralel (seperti dashboard)...");
const pool = postgres(url, { max: 5, prepare: false, connect_timeout: 15 });
const queries = [
  pool`select status, count(*) from topics group by status`,
  pool`select coalesce(sum(duration_minutes), 0) from study_sessions`,
  pool`select date::text, sum(duration_minutes) from study_sessions group by date`,
  pool`select distinct date::text from study_sessions`,
  pool`select s.id from study_sessions s join topics t on t.id = s.topic_id limit 6`,
  pool`select id from topics where status = 'in_progress'`,
];
const results = await Promise.allSettled(queries);
results.forEach((r, i) =>
  console.log(
    `  query ${i + 1}:`,
    r.status === "fulfilled" ? "✔" : `❌ ${r.reason?.code ?? ""} ${r.reason?.message}`,
  ),
);
await pool.end();
