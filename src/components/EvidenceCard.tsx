import type { EvidenceItem } from "@/lib/types";

const KIND_STYLES: Record<EvidenceItem["kind"], { chip: string; rail: string; label: string }> = {
  experience: { chip: "bg-brand-100 text-brand-800", rail: "bg-brand-500", label: "Experience" },
  project: { chip: "bg-violet-100 text-violet-800", rail: "bg-violet-500", label: "Project" },
  course: { chip: "bg-indigo-100 text-indigo-800", rail: "bg-indigo-500", label: "Course" },
  skill: { chip: "bg-emerald-100 text-emerald-800", rail: "bg-emerald-500", label: "Skills" },
};

export function EvidenceCard({
  evidence,
  rank,
  highlight,
}: {
  evidence: EvidenceItem;
  rank?: number;
  highlight?: boolean;
}) {
  const style = KIND_STYLES[evidence.kind];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-card transition ${
        highlight ? "border-brand-300 ring-2 ring-brand-200" : "border-ink-200"
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-1.5 ${style.rail}`} />
      <div className="pl-4 pr-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`chip ${style.chip}`}>{style.label}</span>
            {rank !== undefined && <span className="chip">#{rank}</span>}
          </div>
          <div className="flex items-center gap-2">
            <ScoreBar score={evidence.score} />
            <span className="text-xs font-semibold text-ink-700">{evidence.score.toFixed(1)}</span>
          </div>
        </div>
        <div className="mt-2 text-base font-semibold leading-tight text-ink-900">{evidence.title}</div>
        {evidence.subtitle && <div className="text-xs text-ink-500">{evidence.subtitle}</div>}

        <p className="mt-3 text-sm leading-relaxed text-ink-800">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Why it matters · </span>
          {evidence.whyItMatters}
        </p>

        {evidence.matchedKeywords.length > 0 && (
          <div className="mt-3">
            <div className="label">Matched keywords</div>
            <div className="flex flex-wrap gap-1">
              {evidence.matchedKeywords.slice(0, 8).map((k) => (
                <span key={k} className="chip !bg-brand-50 !text-brand-700">
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {evidence.matchedRequirements.length > 0 && (
          <div className="mt-3 text-xs text-ink-500">
            Covers {evidence.matchedRequirements.length} JD requirement
            {evidence.matchedRequirements.length === 1 ? "" : "s"} ·{" "}
            <span className="font-mono">{evidence.matchedRequirements.join(", ")}</span>
          </div>
        )}

        <div className="mt-3 text-[11px] text-ink-400">id: <span className="font-mono">{evidence.evidenceId}</span></div>
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(4, score * 6));
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
