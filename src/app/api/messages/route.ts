import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const messages = await prisma.generatedMessage.findMany({
    orderBy: { createdAt: "desc" },
    include: { job: true },
  });
  return NextResponse.json(messages);
}
