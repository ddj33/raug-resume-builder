import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { analysis: true, messages: true },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.title || !body?.company || !body?.description) {
    return NextResponse.json(
      { error: "title, company, and description are required" },
      { status: 400 }
    );
  }
  const job = await prisma.job.create({
    data: {
      title: body.title,
      company: body.company,
      location: body.location ?? null,
      url: body.url ?? null,
      roleType: body.roleType ?? null,
      description: body.description,
      notes: body.notes ?? null,
      contactName: body.contactName ?? null,
      contactEmail: body.contactEmail ?? null,
      contactRole: body.contactRole ?? null,
      status: body.status ?? "saved",
    },
  });
  return NextResponse.json(job, { status: 201 });
}
