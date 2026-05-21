import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CopyButton } from "@/components/CopyButton";
import { MESSAGE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const messages = await prisma.generatedMessage.findMany({
    orderBy: { createdAt: "desc" },
    include: { job: { include: { analysis: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Generated messages"
        description="Every outreach draft, grouped by job. Each message lists the retrieved evidence ids it was grounded in."
      />
      {messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Open a saved job and click Generate outreach to draft a recruiter email, LinkedIn note, LinkedIn DM, and follow-ups — each grounded in retrieved evidence."
          ctaLabel="Go to jobs"
          ctaHref="/jobs"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {messages.map((m) => {
            const groundedIds = safeParseArray<string>(m.groundedIn);
            return (
              <div key={m.id} className="card">
                <div className="card-header">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="chip !bg-brand-100 !text-brand-800">
                        {(MESSAGE_LABELS as Record<string, string>)[m.kind] ?? m.kind}
                      </span>
                      <Link
                        href={`/jobs/${m.jobId}`}
                        className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {m.job.title} · {m.job.company}
                      </Link>
                    </div>
                    {m.subject && (
                      <div className="mt-1 text-sm text-ink-700">
                        <span className="text-ink-500">Subject: </span>
                        {m.subject}
                      </div>
                    )}
                  </div>
                  <CopyButton text={m.body} label="Copy" />
                </div>
                <div className="card-body space-y-3">
                  <pre className="whitespace-pre-wrap rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-3 text-sm leading-relaxed text-ink-800">
{m.body}
                  </pre>
                  {m.kind === "linkedin_note" && (
                    <p className="text-xs text-ink-500">{m.body.length}/300 characters</p>
                  )}
                  <div>
                    <div className="label">Grounded in</div>
                    {groundedIds.length === 0 ? (
                      <p className="text-sm text-ink-500">No evidence ids recorded for this message.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {groundedIds.map((id) => (
                          <span key={id} className="chip !bg-violet-50 !text-violet-700 font-mono">
                            {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function safeParseArray<T>(s: string | null | undefined): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}
