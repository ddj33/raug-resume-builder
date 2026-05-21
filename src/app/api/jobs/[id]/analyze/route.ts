import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeJob } from "@/lib/ai";
import { getOrCreateProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const profile = await getOrCreateProfile();
  const bundle = analyzeJob(profile, job);

  // `retrieved` holds the full reasoning context (intelligence + evidence + strategy)
  // so the page can render the RAUG breakdown without re-running retrieval.
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
      fitScore: bundle.analysis.fitScore,
      summary: bundle.analysis.summary,
      strengths: JSON.stringify(bundle.analysis.strengths),
      risks: JSON.stringify(bundle.analysis.risks),
      angle: bundle.analysis.angle,
      bullets: JSON.stringify(bundle.analysis.bullets),
      retrieved: retrievedBlob,
    },
  });

  return NextResponse.json({ analysis: saved, bundle });
}
