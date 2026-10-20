import { shiftDate } from "./format";

/**
 * Hitung streak: jumlah hari berturut-turut ada sesi belajar.
 * Streak tetap dihitung kalau hari ini belum belajar tapi kemarin sudah
 * (supaya streak tidak "putus" di pagi hari).
 */
export function computeStreak(activeDates: Set<string>, today: string) {
  let cursor = activeDates.has(today) ? today : shiftDate(today, -1);
  let current = 0;
  while (activeDates.has(cursor)) {
    current++;
    cursor = shiftDate(cursor, -1);
  }

  // Streak terpanjang sepanjang waktu
  const sorted = [...activeDates].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && shiftDate(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, studiedToday: activeDates.has(today) };
}

/** Total menit per hari untuk N hari terakhir (urut dari paling lama) */
export function dailyTotals(
  rows: { date: string; minutes: number }[],
  today: string,
  days: number,
) {
  const map = new Map(rows.map((r) => [r.date, r.minutes]));
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDate(today, i - (days - 1));
    return { date, minutes: map.get(date) ?? 0 };
  });
}
