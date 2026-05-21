import type { PipelineStage } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";

const STAGE_STYLES: Record<PipelineStage, string> = {
  saved: "bg-ink-100 text-ink-700",
  applying: "bg-amber-100 text-amber-800",
  applied: "bg-blue-100 text-blue-800",
  contacted: "bg-violet-100 text-violet-800",
  interviewing: "bg-indigo-100 text-indigo-800",
  rejected: "bg-rose-100 text-rose-800",
  offer: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: PipelineStage | string }) {
  const stage = (STAGE_LABELS as Record<string, string>)[status] ? (status as PipelineStage) : "saved";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_STYLES[stage]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="chip">{children}</span>;
}
