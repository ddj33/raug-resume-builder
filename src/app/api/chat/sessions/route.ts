import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const session = await prisma.chatSession.create({
    data: { title: body?.title ?? "New chat" },
  });
  return NextResponse.json(session, { status: 201 });
}
