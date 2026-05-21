import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeJob } from "@/lib/ai";
import { getOrCreateProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * Re-runs retrieval and grounded-bullet generation. We refresh the full
 * RAUG context (intelligence + evidence + bullets + strategy) so bullets
 * stay traceable to the evidence the user can see on the page.
 */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const profile = await getOrCreateProfile();
  const bundle = analyzeJob(profile, job);

  const retrievedBlob = JSON.stringify({
    intelligence: bundle.intelligence,
    evidence: bundle.evidence,
    strategy: bundle.strategy,
  });

  const saved = await prisma.jobAnalysis.upsert({
    where: { jobId: job.id },
    create: {
      jobId: job.id,
      fitScore: bundle.analysis.fitScore,
      summary: bundle.analysis.summary,
      strengths: JSON.stringify(bundle.analysis.strengths),
      risks: JSON.stringify(bundle.analysis.risks),
      angle: bundle.analysis.angle,
      bullets: JSON.stringify(bundle.analysis.bullets),
      retrieved: retrievedBlob,
    },
    update: {
      bullets: JSON.stringify(bundle.analysis.bullets),
      summary: bundle.analysis.summary,
      retrieved: retrievedBlob,
    },
  });

  return NextResponse.json({ analysis: saved, bundle });
}
