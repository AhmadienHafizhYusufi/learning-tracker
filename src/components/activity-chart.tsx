import { formatDate, formatMinutes } from "@/lib/format";

/** Bar chart sederhana (tanpa library) untuk menit belajar per hari */
export function ActivityChart({
  data,
  today,
}: {
  data: { date: string; minutes: number }[];
  today: string;
}) {
  const max = Math.max(60, ...data.map((d) => d.minutes));
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Menit belajar 14 hari terakhir">
        {data.map((d) => {
          const h = d.minutes === 0 ? 0 : Math.max(6, (d.minutes / max) * 100);
          const isToday = d.date === today;
          return (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className={`w-full rounded-t-[3px] transition ${
                  d.minutes === 0
                    ? "h-[3px] rounded-[2px] bg-line"
                    : isToday
                      ? "bg-warm"
                      : "bg-accent group-hover:brightness-110"
                }`}
                style={d.minutes ? { height: `${h}%` } : undefined}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-paper opacity-0 transition group-hover:opacity-100">
                <span className="num">{formatMinutes(d.minutes)}</span> ·{" "}
                {formatDate(d.date, { year: undefined })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{formatDate(data[0].date, { year: undefined })}</span>
        <span>Hari ini</span>
      </div>
    </div>
  );
}
