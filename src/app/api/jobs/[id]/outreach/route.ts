import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeJob, generateOutreach } from "@/lib/ai";
import { getOrCreateProfile } from "@/lib/profile";
import type { AnalysisBundle } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { analysis: true },
  });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const profile = await getOrCreateProfile();

  // Always re-analyze (cheap, deterministic) so outreach is grounded in the
  // *current* JD + profile state — no stale evidence ids slipping through.
  const bundle: AnalysisBundle = analyzeJob(profile, job);

  const retrievedBlob = JSON.stringify({
    intelligence: bundle.intelligence,
    evidence: bundle.evidence,
    strategy: bundle.strategy,
  });

  await prisma.jobAnalysis.upsert({
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

  const outreach = generateOutreach(profile, job, bundle);

  // Replace any prior generation so the latest evidence ids are authoritative.
  await prisma.generatedMessage.deleteMany({ where: { jobId: job.id } });
  const messages = await prisma.$transaction([
    prisma.generatedMessage.create({
      data: {
        jobId: job.id,
        kind: outreach.recruiterEmail.kind,
        subject: outreach.recruiterEmail.subject ?? null,
        body: outreach.recruiterEmail.body,
        groundedIn: JSON.stringify(outreach.recruiterEmail.groundedIn),
      },
    }),
    prisma.generatedMessage.create({
      data: {
        jobId: job.id,
        kind: outreach.linkedinNote.kind,
        subject: null,
        body: outreach.linkedinNote.body,
        groundedIn: JSON.stringify(outreach.linkedinNote.groundedIn),
      },
    }),
    prisma.generatedMessage.create({
      data: {
        jobId: job.id,
        kind: outreach.linkedinDm.kind,
        subject: null,
        body: outreach.linkedinDm.body,
        groundedIn: JSON.stringify(outreach.linkedinDm.groundedIn),
      },
    }),
    prisma.generatedMessage.create({
      data: {
        jobId: job.id,
        kind: outreach.followup48h.kind,
        subject: outreach.followup48h.subject ?? null,
        body: outreach.followup48h.body,
        groundedIn: JSON.stringify(outreach.followup48h.groundedIn),
      },
    }),
    prisma.generatedMessage.create({
      data: {
        jobId: job.id,
        kind: outreach.followup7d.kind,
        subject: outreach.followup7d.subject ?? null,
        body: outreach.followup7d.body,
        groundedIn: JSON.stringify(outreach.followup7d.groundedIn),
      },
    }),
  ]);

  return NextResponse.json({ messages, bundle });
}
