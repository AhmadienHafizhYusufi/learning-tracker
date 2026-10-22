import Link from "next/link";
import { ActivityChart } from "@/components/activity-chart";
import { LogSessionForm } from "@/components/log-session-form";
import { formatDate, formatMinutes } from "@/lib/format";
import { getAllTopicOptions, getDashboard } from "@/lib/queries";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requirePageUser();
  const [d, topicOptions] = await Promise.all([getDashboard(userId), getAllTopicOptions(userId)]);
  const openTopics = topicOptions.filter((t) => t.status !== "done");

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-muted">{formatDate(d.today, { weekday: "long", month: "long" })}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {d.streak.studiedToday
            ? "Mantap, hari ini sudah belajar."
            : d.streak.current > 0
              ? `Jaga streak ${d.streak.current} harimu — belum ada sesi hari ini.`
              : "Yuk mulai sesi belajar hari ini."}
        </h1>
      </section>

      {/* Statistik utama */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Streak" value={`${d.streak.current}`} unit="hari" hint={`Terpanjang ${d.streak.longest} hari`} tone="warm" />
        <Stat label="7 hari terakhir" value={formatMinutes(d.time.weekMinutes)} hint={`${d.time.sessionCount} sesi total`} />
        <Stat label="Total waktu" value={formatMinutes(d.time.totalMinutes)} hint="Sejak awal" />
        <Stat
          label="Topik selesai"
          value={`${d.topics.done}/${d.topics.total}`}
          hint={`${d.topics.percentDone}% selesai`}
          tone="accent"
          progress={d.topics.percentDone}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">Aktivitas 14 hari</h2>
            <span className="text-xs text-muted">menit / hari</span>
          </div>
          <ActivityChart data={d.last14} today={d.today} />
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Catat sesi belajar</h2>
          {openTopics.length ? (
            <LogSessionForm topics={openTopics} />
          ) : (
            <EmptyHint text="Buat topik dulu sebelum mencatat sesi." />
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Sedang dipelajari</h2>
            <Link href="/topics?status=in_progress" className="text-xs text-muted hover:text-ink">
              Lihat semua →
            </Link>
          </div>
          {d.inProgress.length ? (
            <ul className="divide-y divide-line">
              {d.inProgress.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link href={`/topics/${t.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-accent">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      {t.category && <span className="text-xs text-muted">{t.category}</span>}
                    </span>
                    <span className="num shrink-0 text-xs text-muted">{formatMinutes(t.totalMinutes)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="Belum ada topik yang sedang dipelajari." />
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Sesi terakhir</h2>
          {d.recent.length ? (
            <ul className="divide-y divide-line">
              {d.recent.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <Link href={`/topics/${s.topicId}`} className="block truncate text-sm font-medium hover:text-accent">
                      {s.topicTitle}
                    </Link>
                    {(s.title || s.note) && (
                      <span className="block truncate text-xs text-muted">{s.title ?? s.note}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    <span className="num block text-ink">{formatMinutes(s.durationMinutes)}</span>
                    {formatDate(s.date, { year: undefined })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="Belum ada sesi tercatat." />
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  hint,
  tone,
  progress,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "warm" | "accent";
  progress?: number;
}) {
  const color = tone === "warm" ? "text-warm" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className={`num text-2xl font-semibold ${color}`}>
        {value}
        {unit && <span className="ml-1 font-sans text-sm font-normal text-muted">{unit}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      )}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">
      {text}{" "}
      <Link href="/topics#new" className="text-accent hover:underline">
        Tambah topik
      </Link>
    </div>
  );
}
