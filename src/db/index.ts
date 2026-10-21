import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Simpan koneksi di globalThis supaya tidak membuat koneksi baru
// setiap kali file di-reload saat `next dev` (hot reload).
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

// `prepare: false` diperlukan untuk connection string "pooled" dari Neon
// (PgBouncer mode transaction tidak mendukung prepared statements).
// Aman juga dipakai dengan Postgres lokal di Docker.
const client =
  globalForDb.pgClient ?? postgres(process.env.DATABASE_URL!, { max: 5, prepare: false });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
