import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const status = body.status as PipelineStage;
  if (!PIPELINE_STAGES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const job = await prisma.job.update({
    where: { id: params.id },
    data: { status },
  });
  return NextResponse.json(job);
}
