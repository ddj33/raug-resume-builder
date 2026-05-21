import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { analysis: true, messages: true },
  });

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Each saved job becomes a workspace for fit analysis, tailored bullets, and outreach drafts."
        actions={
          <Link href="/jobs/new" className="btn-primary">
            New job application
          </Link>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Add a job by pasting the JD, company, and any contact info. We'll do the analysis once it's saved."
          ctaLabel="Add your first job"
          ctaHref="/jobs/new"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="card transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="card-body">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-ink-900">{j.title}</div>
                    <div className="text-sm text-ink-600">{j.company}</div>
                    {j.location && (
                      <div className="text-xs text-ink-500">{j.location}</div>
                    )}
                  </div>
                  <StatusBadge status={j.status} />
                </div>
                <div className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">
                  {j.description.slice(0, 220)}
                  {j.description.length > 220 && "…"}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {j.roleType && <span className="chip">{j.roleType}</span>}
                  {j.analysis && <span className="chip">fit {j.analysis.fitScore}</span>}
                  {j.messages.length > 0 && (
                    <span className="chip">{j.messages.length} outreach msgs</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
