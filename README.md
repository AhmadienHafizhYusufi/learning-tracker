# Learning Tracker

Aplikasi web sederhana untuk mencatat perjalanan belajar: topik + status, log sesi belajar, resource/link, dan statistik (streak, total waktu, progress).

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Docker) · Zod

## Fitur

- **Dashboard** — streak harian (+ streak terpanjang), waktu belajar 7 hari terakhir, total waktu, persentase topik selesai, chart aktivitas 14 hari, form catat sesi cepat, daftar topik yang sedang dipelajari, dan sesi terakhir.
- **Topik** — tambah topik (judul, kategori, status, deskripsi), filter berdasarkan status & kategori, ubah status langsung dari list.
- **Detail topik** — edit/hapus topik, log sesi (tanggal, durasi, catatan), simpan resource (video, artikel, course, docs) dengan checklist selesai.
- Topik berstatus *Belum mulai* otomatis jadi *Sedang dipelajari* saat sesi pertama dicatat.

## Menjalankan

Butuh **Node.js 20+** dan **Docker Desktop**.

```bash
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env
npm run db:up               # jalankan PostgreSQL di Docker (port 5433)
npm run db:push             # buat tabel dari schema
npm run db:seed             # (opsional) isi contoh data
npm run dev                 # buka http://localhost:3000
```

Database memakai port **5433** supaya tidak bentrok dengan Postgres lain (misal project job-tracker). Ubah di `docker-compose.yml` dan `.env` kalau perlu.

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Build & jalankan versi production |
| `npm run db:up` / `db:down` | Start / stop container PostgreSQL |
| `npm run db:push` | Sinkronkan schema Drizzle ke database |
| `npm run db:studio` | Buka Drizzle Studio untuk melihat data |
| `npm run db:seed` | Isi contoh data |
| `npm run typecheck` | Cek TypeScript |

## Struktur

```
src/
  app/
    page.tsx              Dashboard
    topics/page.tsx       Daftar + tambah topik
    topics/[id]/page.tsx  Detail topik: sesi & resource
    actions.ts            Server Actions (create/update/delete) + validasi Zod
  components/             Form controls, chart, badge, nav
  db/
    schema.ts             Tabel topics, study_sessions, resources
    index.ts              Koneksi Drizzle
    seed.ts               Contoh data
  lib/
    queries.ts            Query untuk halaman (agregat, dashboard)
    stats.ts              Hitung streak & total harian
    format.ts             Label, format tanggal/durasi, timezone
```

## Catatan

- Timezone default `Asia/Jakarta` (untuk menentukan "hari ini" & streak). Bisa diubah dengan env `APP_TIMEZONE`.
- **Multi-user:** login dengan GitHub, akun dibuat otomatis di tabel `users`. Setiap tabel data punya `user_id`; semua query di `src/lib/queries.ts` menerima `userId`, dan setiap server action memfilter `id = ? AND user_id = ?` — user tidak bisa membaca/mengubah data user lain walaupun menebak ID.
- `AUTH_ALLOWED_GITHUB` (opsional) membatasi siapa yang boleh mendaftar. Kosong = terbuka untuk semua akun GitHub.
- Upgrade dari versi single-user: jalankan `npm run db:migrate-multiuser -- <username-github>` **sebelum** `npm run db:push`.
- `npm run db:check` untuk mengecek koneksi database & isi tabel.
- Database bisa di Postgres terkelola (Neon, Supabase, Railway) cukup dengan mengganti `DATABASE_URL`. Jalankan impor data / `pg_dump` lewat koneksi langsung, bukan pooler.
