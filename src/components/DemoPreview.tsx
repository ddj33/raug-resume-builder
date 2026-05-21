import Link from "next/link";
import type { EvidenceItem, GroundedBullet, JobIntelligence, Requirement } from "@/lib/types";

export function DemoPreview({
  jobId,
  intelligence,
  evidence,
  bullet,
  requirement,
}: {
  jobId: string;
  intelligence: JobIntelligence;
  evidence: EvidenceItem | null;
  bullet: GroundedBullet | null;
  requirement: Requirement | null;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div>
          <div className="h2">Live demo — one requirement, one evidence, one grounded bullet</div>
          <p className="muted">
            Real data: parsed from a seeded JD, retrieved from your real profile. Not a screenshot.
          </p>
        </div>
        <span className="chip">{intelligence.company} · {intelligence.roleTitle}</span>
      </div>
      <div className="card-body grid gap-4 lg:grid-cols-3">
        <DemoColumn
          label="① JD Requirement"
          accent="border-brand-100 bg-brand-50/60"
          chip={requirement?.kind === "must" ? "must have" : "nice to have"}
          title={requirement?.text ?? "No structured requirements parsed yet."}
          body={
            requirement
              ? `Keywords lifted from this line: ${requirement.keywords.slice(0, 6).join(", ") || "—"}.`
              : "Add a JD with explicit asks (\"must have\", \"experience with\") to see structured parsing."
          }
        />
        <DemoColumn
          label="② Retrieved Evidence"
          accent="border-violet-100 bg-violet-50/60"
          chip={evidence?.kind ?? "—"}
          title={evidence?.title ?? "—"}
          body={evidence?.whyItMatters ?? "No evidence retrieved for this JD."}
          footer={
            evidence
              ? `Matched: ${evidence.matchedKeywords.slice(0, 4).join(", ")} · score ${evidence.score}`
              : undefined
          }
        />
        <DemoColumn
          label="③ Grounded Bullet"
          accent="border-amber-100 bg-amber-50/60"
          chip="resume bullet"
          title={bullet?.text ?? "Click below to generate."}
          body={
            bullet
              ? `Source evidence: ${evidence?.title ?? "—"}. This bullet would not exist without that retrieved fact.`
              : "Open a job to generate evidence-grounded bullets."
          }
          footer={bullet ? `Evidence id: ${bullet.evidenceId}` : undefined}
        />
      </div>
      <div className="border-t border-ink-100 bg-ink-50/40 px-5 py-3 text-right">
        <Link href={`/jobs/${jobId}`} className="btn-primary">
          Open the full analysis →
        </Link>
      </div>
    </div>
  );
}

function DemoColumn({
  label,
  accent,
  chip,
  title,
  body,
  footer,
}: {
  label: string;
  accent: string;
  chip?: string;
  title: string;
  body: string;
  footer?: string;
}) {
  return (
    <div className={`flex h-full flex-col rounded-xl border px-4 py-4 ${accent}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-700">{label}</span>
        {chip && <span className="chip !bg-white/70">{chip}</span>}
      </div>
      <div className="mt-2 text-sm font-semibold text-ink-900">{title}</div>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-700">{body}</p>
      {footer && <div className="mt-3 border-t border-white/60 pt-2 text-[11px] text-ink-500">{footer}</div>}
    </div>
  );
}
