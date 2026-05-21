import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { answerQuestion } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const session = await prisma.chatSession.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content,
    },
  });

  const answer = await answerQuestion(content);

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: answer.content,
      intent: answer.intent,
      evidence: JSON.stringify({ evidence: answer.evidence, followups: answer.followups ?? [] }),
    },
  });

  // Title the session from the first user turn if it's still the default.
  if (session.title === "New chat") {
    const title = content.slice(0, 60) + (content.length > 60 ? "…" : "");
    await prisma.chatSession.update({ where: { id: session.id }, data: { title, updatedAt: new Date() } });
  } else {
    await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });
  }

  return NextResponse.json({ userMessage, assistantMessage, answer });
}
