import type { ResourceType, TopicStatus } from "@/db/schema";

export const TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Jakarta";

export const STATUS_LABEL: Record<TopicStatus, string> = {
  todo: "Belum mulai",
  in_progress: "Sedang dipelajari",
  done: "Selesai",
};

export const STATUS_ORDER: TopicStatus[] = ["in_progress", "todo", "done"];

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  video: "Video",
  article: "Artikel",
  course: "Course",
  docs: "Docs",
  other: "Lainnya",
};

/** Tanggal hari ini (YYYY-MM-DD) sesuai timezone aplikasi */
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/** Geser tanggal YYYY-MM-DD sebanyak n hari (negatif = mundur) */
export function shiftDate(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

/** 135 -> "2j 15m", 45 -> "45m" */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}j` : `${h}j ${m}m`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
