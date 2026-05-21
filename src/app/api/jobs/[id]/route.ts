import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { analysis: true, messages: { orderBy: { createdAt: "desc" } } },
  });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const job = await prisma.job.update({
    where: { id: params.id },
    data: {
      title: body.title,
      company: body.company,
      location: body.location,
      url: body.url,
      roleType: body.roleType,
      description: body.description,
      notes: body.notes,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactRole: body.contactRole,
      status: body.status,
    },
  });
  return NextResponse.json(job);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.job.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
