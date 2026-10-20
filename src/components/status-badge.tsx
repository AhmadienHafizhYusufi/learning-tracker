import type { TopicStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/format";

const styles: Record<TopicStatus, string> = {
  todo: "bg-line/60 text-muted",
  in_progress: "bg-warm-soft text-warm",
  done: "bg-accent-soft text-accent",
};

const dots: Record<TopicStatus, string> = {
  todo: "bg-muted/60",
  in_progress: "bg-warm",
  done: "bg-accent",
};

export function StatusBadge({ status }: { status: TopicStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${styles[status]}`}
    >
      <span className={`size-1.5 rounded-full ${dots[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
