import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/Badge";
import { JobActions } from "@/components/JobActions";
import type { ApplicationStrategy, EvidenceItem, GroundedBullet, JobIntelligence } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { analysis: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!job) notFound();

  let analysis: {
    fitScore: number;
    summary: string;
    strengths: string[];
    risks: string[];
    angle: string;
    bullets: GroundedBullet[];
  } | null = null;

  let retrieved: {
    intelligence: JobIntelligence;
    evidence: EvidenceItem[];
    strategy: ApplicationStrategy;
  } | null = null;

  if (job.analysis) {
    analysis = {
      fitScore: job.analysis.fitScore,
      summary: job.analysis.summary,
      strengths: safeParseArray<string>(job.analysis.strengths),
      risks: safeParseArray<string>(job.analysis.risks),
      angle: job.analysis.angle,
      bullets: safeParseArray<GroundedBullet>(job.analysis.bullets),
    };
    const parsed = safeParseObject(job.analysis.retrieved);
    if (parsed && parsed.intelligence && parsed.evidence && parsed.strategy) {
      retrieved = parsed as typeof retrieved;
    }
  }

  return (
    <div>
      <PageHeader
        title={job.title}
        description={`${job.company}${job.location ? ` • ${job.location}` : ""}${job.roleType ? ` • ${job.roleType}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            {job.url && (
              <a className="btn" href={job.url} target="_blank" rel="noopener noreferrer">
                Open posting ↗
              </a>
            )}
            <Link href="/jobs" className="btn-ghost">
              ← All jobs
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="h2">Job description</div>
            <span className="muted">Raw input — parsed in section 1 below.</span>
          </div>
          <div className="card-body">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{job.description}</pre>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="h2">Meta</div>
          </div>
          <div className="card-body grid gap-3 text-sm">
            <Meta label="Company" value={job.company} />
            <Meta label="Role type" value={job.roleType ?? "—"} />
            <Meta label="Location" value={job.location ?? "—"} />
            <Meta label="Contact" value={job.contactName ?? "—"} />
            <Meta label="Contact role" value={job.contactRole ?? "—"} />
            <Meta label="Contact email" value={job.contactEmail ?? "—"} />
            {job.notes && (
              <div>
                <div className="label">Notes</div>
                <p className="text-sm leading-relaxed text-ink-700">{job.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <JobActions
          jobId={job.id}
          initialAnalysis={analysis}
          initialRetrieved={retrieved}
          initialMessages={job.messages.map((m) => ({
            id: m.id,
            kind: m.kind,
            subject: m.subject,
            body: m.body,
            groundedIn: safeParseArray<string>(m.groundedIn),
          }))}
        />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-ink-900">{value}</div>
    </div>
  );
}

function safeParseArray<T>(s: string | null | undefined): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function safeParseObject(s: string | null | undefined): any {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
