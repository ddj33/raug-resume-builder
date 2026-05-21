import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { PipelineBoard } from "@/components/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { analysis: true },
  });

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Drag-free Kanban — change a job's stage from the dropdown to move it across the board."
      />
      {jobs.length === 0 ? (
        <EmptyState
          title="Pipeline is empty"
          description="Add a job to start tracking it through stages from Saved to Offer."
          ctaLabel="Add a job"
          ctaHref="/jobs/new"
        />
      ) : (
        <PipelineBoard
          jobs={jobs.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            status: j.status,
            location: j.location,
            roleType: j.roleType,
            analysis: j.analysis ? { fitScore: j.analysis.fitScore } : null,
          }))}
        />
      )}
    </div>
  );
}
