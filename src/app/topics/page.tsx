import Link from "next/link";
import { createTopic, setTopicStatus } from "@/app/actions";
import type { TopicStatus } from "@/db/schema";
import { topicStatus } from "@/db/schema";
import { AutoSubmitSelect, SubmitButton } from "@/components/form-controls";
import { TopicFields } from "@/components/topic-fields";
import { formatDate, formatMinutes, STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { getCategories, getTopicsWithStats } from "@/lib/queries";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_SELECT: Record<TopicStatus, string> = {
  todo: "bg-line/70 text-muted",
  in_progress: "bg-warm-soft text-warm",
  done: "bg-accent-soft text-accent",
};

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const status = (topicStatus.enumValues as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as TopicStatus)
    : undefined;

  const userId = await requirePageUser();
  const [all, categories] = await Promise.all([getTopicsWithStats(userId), getCategories(userId)]);
  const category = sp.category && categories.includes(sp.category) ? sp.category : undefined;

  const filtered = all
    .filter((t) => !status || t.status === status)
    .filter((t) => !category || t.category === category)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  const countBy = (s?: TopicStatus) => (s ? all.filter((t) => t.status === s).length : all.length);
  const href = (next: { status?: string; category?: string }) => {
    const p = new URLSearchParams();
    const st = "status" in next ? next.status : status;
    const ct = "category" in next ? next.category : category;
    if (st) p.set("status", st);
    if (ct) p.set("category", ct);
    const q = p.toString();
    return q ? `/topics?${q}` : "/topics";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Topik belajar</h1>
          <p className="text-sm text-muted">
            {countBy("done")} dari {countBy()} topik selesai
          </p>
        </div>
        <a href="#new" className="btn-primary">
          + Topik baru
        </a>
      </div>

      {/* Filter status */}
      <div className="flex flex-wrap gap-2">
        {[undefined, ...STATUS_ORDER].map((s) => {
          const active = status === s;
          return (
            <Link
              key={s ?? "all"}
              href={href({ status: s })}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                active ? "border-ink bg-ink text-paper" : "border-line text-muted hover:text-ink"
              }`}
            >
              {s ? STATUS_LABEL[s] : "Semua"} <span className="num opacity-70">{countBy(s)}</span>
            </Link>
          );
        })}
        {categories.length > 0 && <span className="mx-1 self-center text-line">|</span>}
        {categories.map((c) => (
          <Link
            key={c}
            href={href({ category: category === c ? undefined : c })}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              category === c ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      {filtered.length ? (
        <ul className="card divide-y divide-line">
          {filtered.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <Link href={`/topics/${t.id}`} className="group min-w-0 flex-1 basis-60">
                <span className="block font-medium group-hover:text-accent">{t.title}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                  {t.category && <span>{t.category}</span>}
                  <span className="num">{formatMinutes(t.totalMinutes)}</span>
                  <span>{t.sessionCount} sesi</span>
                  {t.resourceCount > 0 && (
                    <span>
                      {t.resourceDone}/{t.resourceCount} resource
                    </span>
                  )}
                  {t.lastStudied && <span>terakhir {formatDate(t.lastStudied, { year: undefined })}</span>}
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <form action={setTopicStatus}>
                  <input type="hidden" name="id" value={t.id} />
                  <AutoSubmitSelect
                    name="status"
                    ariaLabel={`Ubah status ${t.title}`}
                    defaultValue={t.status}
                    className={`cursor-pointer rounded-full border-0 py-1 pr-7 pl-3 text-xs font-medium outline-none focus:ring-2 focus:ring-accent/30 ${STATUS_SELECT[t.status]}`}
                    options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card p-8 text-center text-sm text-muted">
          {all.length ? "Tidak ada topik dengan filter ini." : "Belum ada topik. Tambahkan topik pertamamu di bawah."}
        </div>
      )}

      <section id="new" className="card scroll-mt-20 p-5">
        <h2 className="mb-4 font-semibold">Tambah topik baru</h2>
        <form action={createTopic} className="grid gap-3 sm:grid-cols-2">
          <TopicFields categories={categories} />
          <div className="sm:col-span-2">
            <SubmitButton>Simpan topik</SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
