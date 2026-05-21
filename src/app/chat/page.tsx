import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { ChatWorkspace } from "@/components/ChatWorkspace";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const active = sessions[0] ?? null;
  const messages = active
    ? await prisma.chatMessage.findMany({
        where: { sessionId: active.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Ask the assistant"
        description="A retrieval-grounded chatbot over your candidate profile and saved jobs. Every answer cites the local records it used — and refuses to invent any."
      />
      <ChatWorkspace
        initialSessions={sessions.map((s) => ({
          id: s.id,
          title: s.title,
          updatedAt: s.updatedAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
        }))}
        initialSessionId={active?.id ?? null}
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          intent: m.intent,
          evidence: safeParse(m.evidence),
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

function safeParse(s: string | null | undefined) {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    if (typeof v !== "object" || v === null) return null;
    return {
      evidence: Array.isArray(v.evidence) ? v.evidence : [],
      followups: Array.isArray(v.followups) ? v.followups : [],
    };
  } catch {
    return null;
  }
}
