"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { INTENT_LABELS, type ChatEvidence, type ChatIntent } from "@/lib/chat";

type Session = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string | null;
  evidence?: { evidence: ChatEvidence[]; followups: string[] } | null;
  createdAt: string;
};

const STARTER_PROMPTS = [
  "Summarize my profile",
  "What projects do I have related to AI?",
  "What's my fit for Northwind AI?",
  "Why am I a good fit for Lattice Capital?",
  "What's in my pipeline?",
  "Show me anything I have about fintech",
  "What courses cover RAG or LLMs?",
  "Help",
];

export function ChatWorkspace({
  initialSessions,
  initialSessionId,
  initialMessages,
}: {
  initialSessions: Session[];
  initialSessionId: string | null;
  initialMessages: Message[];
}) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeId, setActiveId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function ensureSession(): Promise<string> {
    if (activeId) return activeId;
    const res = await fetch("/api/chat/sessions", { method: "POST" });
    const created = (await res.json()) as Session;
    setSessions((arr) => [created, ...arr]);
    setActiveId(created.id);
    return created.id;
  }

  async function selectSession(id: string) {
    setActiveId(id);
    setError(null);
    const res = await fetch(`/api/chat/sessions/${id}`);
    if (!res.ok) {
      setMessages([]);
      return;
    }
    const session = await res.json();
    setMessages(
      (session.messages ?? []).map((m: any) => ({
        ...m,
        evidence: parseEvidence(m.evidence),
      }))
    );
  }

  async function newChat() {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setInput("");
  }

  async function deleteSession(id: string) {
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    setSessions((arr) => arr.filter((s) => s.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    setInput("");

    const tempUser: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUser]);

    try {
      const sessionId = await ensureSession();
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Send failed");
      }
      const data = await res.json();
      setMessages((m) => {
        const withoutTemp = m.filter((msg) => msg.id !== tempUser.id);
        return [
          ...withoutTemp,
          { ...data.userMessage, evidence: null },
          {
            ...data.assistantMessage,
            evidence: parseEvidence(data.assistantMessage.evidence),
          },
        ];
      });
      // Bump session title in the sidebar.
      setSessions((arr) => {
        const idx = arr.findIndex((s) => s.id === sessionId);
        if (idx === -1) return arr;
        const updated = [...arr];
        const titled =
          updated[idx].title === "New chat"
            ? content.slice(0, 60) + (content.length > 60 ? "…" : "")
            : updated[idx].title;
        updated[idx] = { ...updated[idx], title: titled, updatedAt: new Date().toISOString() };
        return [updated[idx], ...updated.filter((_, i) => i !== idx)];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
      setMessages((m) => m.filter((msg) => msg.id !== tempUser.id));
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-[240px,1fr] gap-4">
      {/* Sessions sidebar */}
      <aside className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div className="text-sm font-semibold text-ink-900">Conversations</div>
          <button onClick={newChat} className="btn-ghost !py-1 !px-2 text-xs">＋ New</button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-ink-500">No chats yet — ask something below.</div>
          ) : (
            <ul className="space-y-1">
              {sessions.map((s) => (
                <li key={s.id} className="group flex items-stretch">
                  <button
                    onClick={() => selectSession(s.id)}
                    className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                      s.id === activeId
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink-700 hover:bg-ink-100"
                    }`}
                  >
                    {s.title}
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="ml-1 hidden rounded-lg px-2 text-xs text-ink-400 hover:text-rose-600 group-hover:block"
                    aria-label="Delete chat"
                    title="Delete"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Main chat */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
        <header className="border-b border-ink-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink-900">
                {activeSession?.title ?? "Ask anything about your profile and jobs"}
              </div>
              <p className="muted">
                Retrieval-grounded answers. Every response cites the local records it used — same RAUG pattern as the rest of the app.
              </p>
            </div>
            <span className="chip">RAUG · deterministic mode</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-ink-50/30 px-5 py-6">
          {messages.length === 0 ? (
            <StarterPrompts onPick={(p) => send(p)} disabled={sending} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {messages.map((m) =>
                m.role === "user" ? <UserBubble key={m.id} content={m.content} /> : <AssistantTurn key={m.id} message={m} onFollowup={send} disabled={sending} />
              )}
              {sending && (
                <div className="flex items-center gap-2 text-sm text-ink-500">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                  Retrieving evidence and composing…
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-rose-200 bg-rose-50 px-5 py-2 text-sm text-rose-700">{error}</div>
        )}

        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-ink-100 bg-white px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask: what projects do I have about AI? · what's my fit for Northwind AI? · help"
            className="input"
            disabled={sending}
          />
          <button type="submit" className="btn-primary" disabled={sending || input.trim().length === 0}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}

/* --------------------------- subcomponents ---------------------------- */

function StarterPrompts({ onPick, disabled }: { onPick: (p: string) => void; disabled: boolean }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h3 className="text-lg font-semibold text-ink-900">Try one of these to see grounded retrieval in action</h3>
      <p className="muted mt-1">Each question hits a different intent and pulls a different shape of evidence.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            className="group flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
          >
            <span className="text-ink-800">{p}</span>
            <span className="text-ink-400 group-hover:text-brand-600">→</span>
          </button>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-ink-100 bg-white p-4 text-sm leading-relaxed text-ink-700">
        <span className="font-semibold text-ink-900">How this differs from a generic chatbot:</span>{" "}
        I refuse to answer from outside your local data. If you ask about something not in your profile or jobs, I'll say so — and never invent a project, skill, or fit score.
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
        {content}
      </div>
    </div>
  );
}

function AssistantTurn({
  message,
  onFollowup,
  disabled,
}: {
  message: Message;
  onFollowup: (p: string) => void;
  disabled: boolean;
}) {
  const evidence = message.evidence?.evidence ?? [];
  const followups = message.evidence?.followups ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          R
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          {message.intent && (
            <div className="flex items-center gap-2">
              <span className="chip !bg-violet-50 !text-violet-700">
                intent · {INTENT_LABELS[message.intent as ChatIntent] ?? message.intent}
              </span>
              <span className="chip">
                {evidence.length} evidence record{evidence.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
          <div className="prose prose-sm max-w-none rounded-2xl rounded-tl-md border border-ink-100 bg-white px-4 py-3 text-sm leading-relaxed text-ink-900 shadow-sm">
            {renderMarkdownish(message.content)}
          </div>
          {evidence.length > 0 && (
            <div>
              <div className="label">Grounded in</div>
              <div className="grid gap-2">
                {evidence.map((e, i) => (
                  <EvidenceRow key={`${e.kind}-${e.id}-${i}`} ev={e} />
                ))}
              </div>
            </div>
          )}
          {followups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {followups.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => onFollowup(p)}
                  className="chip !bg-white border border-ink-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  ↳ {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceRow({ ev }: { ev: ChatEvidence }) {
  const kindStyle: Record<ChatEvidence["kind"], string> = {
    profile: "bg-ink-100 text-ink-800",
    experience: "bg-brand-100 text-brand-800",
    project: "bg-violet-100 text-violet-800",
    course: "bg-indigo-100 text-indigo-800",
    skill: "bg-emerald-100 text-emerald-800",
    job: "bg-amber-100 text-amber-800",
    analysis: "bg-rose-100 text-rose-800",
    message: "bg-ink-100 text-ink-800",
  };
  const body = (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-ink-100 bg-white px-3 py-2.5 transition hover:border-brand-200">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`chip ${kindStyle[ev.kind]}`}>{ev.kind}</span>
          <span className="truncate text-sm font-semibold text-ink-900">{ev.title}</span>
        </div>
        {ev.subtitle && <div className="truncate text-xs text-ink-500">{ev.subtitle}</div>}
        {ev.body && <p className="mt-1 line-clamp-2 text-xs text-ink-700">{ev.body}</p>}
        <div className="mt-1 flex flex-wrap gap-1">
          {ev.matchedKeywords?.slice(0, 5).map((k) => (
            <span key={k} className="chip !bg-brand-50 !text-brand-700">
              {k}
            </span>
          ))}
          {ev.meta &&
            Object.entries(ev.meta).map(([k, v]) => (
              <span key={k} className="chip !bg-ink-100 !text-ink-700">
                {k}: {String(v)}
              </span>
            ))}
        </div>
      </div>
      {ev.href && <span className="shrink-0 text-xs text-ink-400">↗</span>}
    </div>
  );
  return ev.href ? (
    <Link href={ev.href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function parseEvidence(s: any): Message["evidence"] {
  if (!s) return null;
  if (typeof s === "object") return s;
  try {
    const parsed = JSON.parse(s);
    return {
      evidence: Array.isArray(parsed?.evidence) ? parsed.evidence : [],
      followups: Array.isArray(parsed?.followups) ? parsed.followups : [],
    };
  } catch {
    return null;
  }
}

/**
 * Minimal **bold** + line-break renderer. We avoid pulling in a markdown
 * dependency since the responses are short and template-driven.
 */
function renderMarkdownish(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    const parts: React.ReactNode[] = [];
    let last = 0;
    const re = /\*\*([^*]+)\*\*/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index));
      parts.push(
        <strong key={`${idx}-${match.index}`} className="font-semibold text-ink-900">
          {match[1]}
        </strong>
      );
      last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <span key={idx}>
        {parts.length ? parts : line}
        {idx < lines.length - 1 && <br />}
      </span>
    );
  });
}
