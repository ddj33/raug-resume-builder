"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "./CopyButton";
import { FitScoreRing } from "./FitScoreRing";
import { EvidenceCard } from "./EvidenceCard";
import { SectionShell } from "./SectionShell";
import { MESSAGE_LABELS, type MessageKind } from "@/lib/types";
import type {
  ApplicationStrategy,
  EvidenceItem,
  GroundedBullet,
  JobIntelligence,
  Requirement,
} from "@/lib/types";

type AnalysisPayload = {
  fitScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  angle: string;
  bullets: GroundedBullet[];
};

type RetrievedBlob = {
  intelligence: JobIntelligence;
  evidence: EvidenceItem[];
  strategy: ApplicationStrategy;
};

type GeneratedMessage = {
  id: string;
  kind: string;
  subject: string | null;
  body: string;
  groundedIn: string[];
};

export function JobActions({
  jobId,
  initialAnalysis,
  initialRetrieved,
  initialMessages,
}: {
  jobId: string;
  initialAnalysis: AnalysisPayload | null;
  initialRetrieved: RetrievedBlob | null;
  initialMessages: GeneratedMessage[];
}) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(initialAnalysis);
  const [retrieved, setRetrieved] = useState<RetrievedBlob | null>(initialRetrieved);
  const [messages, setMessages] = useState<GeneratedMessage[]>(initialMessages);
  const [busy, setBusy] = useState<"analyze" | "bullets" | "outreach" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evidenceById = useMemo(() => {
    const m = new Map<string, EvidenceItem>();
    for (const e of retrieved?.evidence ?? []) m.set(e.evidenceId, e);
    return m;
  }, [retrieved]);

  const requirementById = useMemo(() => {
    const m = new Map<string, Requirement>();
    for (const r of retrieved?.intelligence.requirements ?? []) m.set(r.id, r);
    return m;
  }, [retrieved]);

  async function run(kind: "analyze" | "bullets" | "outreach") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/${kind}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      const data = await res.json();
      if (data.bundle) {
        setAnalysis({
          fitScore: data.bundle.analysis.fitScore,
          summary: data.bundle.analysis.summary,
          strengths: data.bundle.analysis.strengths,
          risks: data.bundle.analysis.risks,
          angle: data.bundle.analysis.angle,
          bullets: data.bundle.analysis.bullets,
        });
        setRetrieved({
          intelligence: data.bundle.intelligence,
          evidence: data.bundle.evidence,
          strategy: data.bundle.strategy,
        });
      }
      if (data.messages) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            kind: m.kind,
            subject: m.subject,
            body: m.body,
            groundedIn: safeParse(m.groundedIn),
          }))
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const hasAnalysis = analysis && retrieved;

  return (
    <div className="space-y-12">
      {/* Action bar */}
      <div className="card sticky top-2 z-10 !rounded-2xl backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="card-body flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ink-700">
            <span className="font-semibold text-ink-900">RAUG pipeline</span> · {hasAnalysis ? "ready" : "not yet run"}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => run("analyze")} disabled={busy !== null} className="btn-primary">
              {busy === "analyze" ? "Analyzing…" : hasAnalysis ? "Re-run analysis" : "Analyze fit"}
            </button>
            <button onClick={() => run("bullets")} disabled={busy !== null} className="btn">
              {busy === "bullets" ? "Regenerating…" : "Regenerate resume bullets"}
            </button>
            <button onClick={() => run("outreach")} disabled={busy !== null} className="btn">
              {busy === "outreach" ? "Generating outreach…" : "Generate outreach"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {!hasAnalysis ? (
        <EmptyAnalysis />
      ) : (
        <>
          <Section1Intelligence intelligence={retrieved!.intelligence} />
          <Section2Evidence
            evidence={retrieved!.evidence}
            leadEvidenceId={retrieved!.strategy.leadEvidenceId}
          />
          <Section3Reasoning analysis={analysis!} evidenceById={evidenceById} />
          <Section4Bullets
            bullets={analysis!.bullets}
            evidenceById={evidenceById}
            requirementById={requirementById}
          />
          <Section5Outreach messages={messages} evidenceById={evidenceById} />
          <Section6Strategy strategy={retrieved!.strategy} evidenceById={evidenceById} />
        </>
      )}
    </div>
  );
}

/* --------------------------- Section 1 -------------------------------- */

function Section1Intelligence({ intelligence }: { intelligence: JobIntelligence }) {
  return (
    <SectionShell
      step={1}
      title="Job Intelligence"
      hint="The JD parsed into structured signals — what the retriever scores against."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard label="Role title" value={intelligence.roleTitle} />
        <InfoCard label="Company" value={intelligence.company} />
        <InfoCard label="Role category" value={intelligence.roleCategory} />
        <InfoCard label="Seniority level" value={intelligence.seniority} />
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="h2">Top required skills</div>
            <span className="chip">{intelligence.topSkills.length}</span>
          </div>
          <div className="card-body">
            {intelligence.topSkills.length === 0 ? (
              <p className="muted">No vocabulary skills detected.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {intelligence.topSkills.map((s) => (
                  <span key={s} className="chip !bg-brand-50 !text-brand-700">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card lg:col-span-3">
          <div className="card-header">
            <div>
              <div className="h2">Parsed requirements</div>
              <p className="muted">Each gets an id ({"req-#"}) that bullets and evidence map back to.</p>
            </div>
            <span className="chip">{intelligence.requirements.length}</span>
          </div>
          <div className="card-body grid gap-2">
            {intelligence.requirements.length === 0 ? (
              <p className="muted">No structured requirements parsed from this JD.</p>
            ) : (
              intelligence.requirements.map((r) => (
                <div key={r.id} className="flex items-start gap-3 rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2">
                  <span className="mt-0.5 chip !bg-white font-mono">{r.id}</span>
                  <span className={`chip ${r.kind === "must" ? "!bg-rose-100 !text-rose-800" : "!bg-amber-100 !text-amber-800"}`}>
                    {r.kind}
                  </span>
                  <span className="flex-1 text-sm text-ink-800">{r.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card lg:col-span-3">
          <div className="card-header">
            <div className="h2">Key responsibilities</div>
            <span className="chip">{intelligence.responsibilities.length}</span>
          </div>
          <div className="card-body">
            {intelligence.responsibilities.length === 0 ? (
              <p className="muted">No responsibility-style lines detected.</p>
            ) : (
              <ul className="space-y-2 text-sm leading-relaxed text-ink-800">
                {intelligence.responsibilities.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="label">{label}</div>
        <div className="text-base font-semibold text-ink-900">{value}</div>
      </div>
    </div>
  );
}

/* --------------------------- Section 2 -------------------------------- */

function Section2Evidence({
  evidence,
  leadEvidenceId,
}: {
  evidence: EvidenceItem[];
  leadEvidenceId: string | null;
}) {
  return (
    <SectionShell
      step={2}
      title="Retrieved Candidate Evidence"
      hint="Ranked profile facts. Every downstream bullet and message will reference one of these by id."
      actions={<span className="chip">{evidence.length} items</span>}
    >
      {evidence.length === 0 ? (
        <div className="card">
          <div className="card-body muted">No evidence scored above zero for this JD.</div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {evidence.map((ev, i) => (
            <EvidenceCard key={ev.evidenceId} evidence={ev} rank={i + 1} highlight={ev.evidenceId === leadEvidenceId} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

/* --------------------------- Section 3 -------------------------------- */

function Section3Reasoning({
  analysis,
  evidenceById,
}: {
  analysis: AnalysisPayload;
  evidenceById: Map<string, EvidenceItem>;
}) {
  return (
    <SectionShell
      step={3}
      title="Fit Reasoning"
      hint="Derived from evidence coverage — never from vibes."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header">
            <div className="h2">Fit score</div>
          </div>
          <div className="card-body">
            <FitScoreRing score={analysis.fitScore} />
            <div className="mt-4">
              <div className="label">Tailored summary</div>
              <p className="text-sm leading-relaxed text-ink-800">{analysis.summary}</p>
              <div className="mt-3">
                <CopyButton text={analysis.summary} label="Copy summary" />
              </div>
            </div>
          </div>
        </div>
        <div className="card lg:col-span-1">
          <div className="card-header">
            <div className="h2">3 strongest matches</div>
          </div>
          <div className="card-body">
            <ul className="space-y-3">
              {analysis.strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink-800">
                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card lg:col-span-1">
          <div className="card-header">
            <div className="h2">Risks & gaps</div>
          </div>
          <div className="card-body">
            <ul className="space-y-3">
              {analysis.risks.slice(0, 4).map((s, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink-800">
                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card lg:col-span-3">
          <div className="card-header">
            <div className="h2">Best positioning angle</div>
            <CopyButton text={analysis.angle} label="Copy angle" />
          </div>
          <div className="card-body">
            <p className="text-sm leading-relaxed text-ink-800">{analysis.angle}</p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* --------------------------- Section 4 -------------------------------- */

function Section4Bullets({
  bullets,
  evidenceById,
  requirementById,
}: {
  bullets: GroundedBullet[];
  evidenceById: Map<string, EvidenceItem>;
  requirementById: Map<string, Requirement>;
}) {
  const copyAll = bullets.map((b) => `• ${b.text}`).join("\n");
  return (
    <SectionShell
      step={4}
      title="Resume Bullet Builder"
      hint="Every bullet shows the source evidence used and the JD requirement it maps to."
      actions={<CopyButton text={copyAll} label="Copy all bullets" />}
    >
      <div className="grid gap-3">
        {bullets.map((b, i) => {
          const ev = evidenceById.get(b.evidenceId);
          const req = b.requirementId ? requirementById.get(b.requirementId) : null;
          return (
            <div key={i} className="card overflow-hidden">
              <div className="flex flex-col gap-0 lg:flex-row">
                <div className="flex-1 px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="chip">Grounded bullet · #{i + 1}</span>
                    <CopyButton text={b.text} label="Copy" />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-900">• {b.text}</p>
                </div>
                <div className="grid gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4 lg:w-[28rem] lg:border-l lg:border-t-0">
                  <div>
                    <div className="label">Source evidence</div>
                    {ev ? (
                      <div className="rounded-lg border border-ink-100 bg-white px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="chip !bg-violet-100 !text-violet-800">{ev.kind}</span>
                          <span className="text-[11px] text-ink-500 font-mono">{ev.evidenceId}</span>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-ink-900">{ev.title}</div>
                        {ev.subtitle && <div className="text-xs text-ink-500">{ev.subtitle}</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-ink-500">Evidence not found in current retrieval.</div>
                    )}
                  </div>
                  <div>
                    <div className="label">Requirement match</div>
                    {req ? (
                      <div className="rounded-lg border border-ink-100 bg-white px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="chip font-mono">{req.id}</span>
                          <span className={`chip ${req.kind === "must" ? "!bg-rose-100 !text-rose-800" : "!bg-amber-100 !text-amber-800"}`}>
                            {req.kind}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-ink-800">{req.text}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-ink-500">Bullet maps to a general theme, not a specific requirement.</div>
                    )}
                  </div>
                  {b.matchedKeywords.length > 0 && (
                    <div>
                      <div className="label">Evidence keywords used</div>
                      <div className="flex flex-wrap gap-1">
                        {b.matchedKeywords.map((k) => (
                          <span key={k} className="chip !bg-brand-50 !text-brand-700">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* --------------------------- Section 5 -------------------------------- */

function Section5Outreach({
  messages,
  evidenceById,
}: {
  messages: GeneratedMessage[];
  evidenceById: Map<string, EvidenceItem>;
}) {
  const ordered: GeneratedMessage[] = [...messages].sort((a, b) => orderForKind(a.kind) - orderForKind(b.kind));
  const copyAll =
    ordered.length === 0
      ? ""
      : ordered
          .map((m) => `[${labelFor(m.kind)}]${m.subject ? `\nSubject: ${m.subject}` : ""}\n\n${m.body}\n`)
          .join("\n———\n\n");

  return (
    <SectionShell
      step={5}
      title="Outreach Generator"
      hint="Each message lists the retrieved evidence ids it leaned on."
      actions={ordered.length > 0 ? <CopyButton text={copyAll} label="Copy all" /> : undefined}
    >
      {ordered.length === 0 ? (
        <div className="card">
          <div className="card-body muted">
            No outreach generated yet. Click <span className="font-semibold">Generate outreach</span> above.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ordered.map((m) => (
            <OutreachCard key={m.id} message={m} evidenceById={evidenceById} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function OutreachCard({
  message,
  evidenceById,
}: {
  message: GeneratedMessage;
  evidenceById: Map<string, EvidenceItem>;
}) {
  const grounded = (message.groundedIn ?? []).map((id) => evidenceById.get(id)).filter(Boolean) as EvidenceItem[];
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span className="chip !bg-brand-100 !text-brand-800">{labelFor(message.kind)}</span>
          {message.kind === "linkedin_note" && (
            <span className={`chip ${message.body.length <= 300 ? "!bg-emerald-100 !text-emerald-800" : "!bg-rose-100 !text-rose-800"}`}>
              {message.body.length}/300
            </span>
          )}
        </div>
        <CopyButton text={message.body} label="Copy" />
      </div>
      <div className="card-body space-y-3">
        {message.subject && (
          <div>
            <div className="label">Subject</div>
            <div className="text-sm font-medium text-ink-900">{message.subject}</div>
          </div>
        )}
        <pre className="whitespace-pre-wrap rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-3 text-sm leading-relaxed text-ink-800">
{message.body}
        </pre>
        <div>
          <div className="label">Grounded in</div>
          {grounded.length === 0 ? (
            <p className="text-sm text-ink-500">No evidence ids attached to this message.</p>
          ) : (
            <div className="grid gap-2">
              {grounded.map((ev) => (
                <div key={ev.evidenceId} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="chip !bg-violet-100 !text-violet-800">{ev.kind}</span>
                      <span className="truncate text-sm font-semibold text-ink-900">{ev.title}</span>
                    </div>
                    {ev.matchedKeywords.length > 0 && (
                      <div className="text-xs text-ink-500">
                        keywords: {ev.matchedKeywords.slice(0, 4).join(", ")}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-ink-400">{ev.evidenceId}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function orderForKind(kind: string): number {
  const order: Record<string, number> = {
    recruiter_email: 0,
    linkedin_note: 1,
    linkedin_dm: 2,
    followup_48h: 3,
    followup_7d: 4,
  };
  return order[kind] ?? 99;
}

/* --------------------------- Section 6 -------------------------------- */

function Section6Strategy({
  strategy,
  evidenceById,
}: {
  strategy: ApplicationStrategy;
  evidenceById: Map<string, EvidenceItem>;
}) {
  const leadEv = strategy.leadEvidenceId ? evidenceById.get(strategy.leadEvidenceId) : null;
  return (
    <SectionShell
      step={6}
      title="Application Strategy"
      hint="How to actually apply, given the retrieval and reasoning above."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <div className="h2">What to emphasize</div>
          </div>
          <div className="card-body">
            <ul className="space-y-2 text-sm leading-relaxed text-ink-800">
              {strategy.emphasize.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="h2">What not to emphasize</div>
          </div>
          <div className="card-body">
            <ul className="space-y-2 text-sm leading-relaxed text-ink-800">
              {strategy.deemphasize.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card lg:col-span-1">
          <div className="card-header">
            <div className="h2">Lead with this project</div>
          </div>
          <div className="card-body">
            {leadEv ? (
              <div className="rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="chip !bg-violet-100 !text-violet-800">{leadEv.kind}</span>
                  <span className="text-[11px] font-mono text-ink-400">{leadEv.evidenceId}</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-ink-900">{leadEv.title}</div>
                {leadEv.subtitle && <div className="text-xs text-ink-500">{leadEv.subtitle}</div>}
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{leadEv.whyItMatters}</p>
              </div>
            ) : (
              <p className="muted">No lead project identified — try adding more projects to your profile.</p>
            )}
          </div>
        </div>
        <div className="card lg:col-span-1">
          <div className="card-header">
            <div className="h2">Recommended channel</div>
          </div>
          <div className="card-body">
            <span className="chip !bg-brand-100 !text-brand-800">{labelForChannel(strategy.recommendedChannel)}</span>
            <p className="mt-3 text-sm leading-relaxed text-ink-800">{strategy.channelReason}</p>
          </div>
        </div>
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="h2">Suggested next step</div>
          </div>
          <div className="card-body">
            <p className="text-sm leading-relaxed text-ink-800">{strategy.nextStep}</p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function labelForChannel(c: ApplicationStrategy["recommendedChannel"]): string {
  switch (c) {
    case "linkedin":
      return "LinkedIn first (no email yet)";
    case "email":
      return "Direct email";
    case "both":
      return "LinkedIn + email, same day";
    case "linkedin-then-email":
      return "LinkedIn first, email after 48h";
  }
}

/* --------------------------- helpers --------------------------------- */

function EmptyAnalysis() {
  return (
    <div className="card overflow-hidden">
      <div className="card-body grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <span className="chip">RAUG pipeline · idle</span>
          <h3 className="mt-3 text-xl font-semibold text-ink-900">No retrieval has run for this JD yet.</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Click <span className="font-semibold">Analyze fit</span> above to parse the JD into structured
            requirements, retrieve the most relevant items from your profile, and reason about fit. Every
            generated bullet and message will carry the evidence ids it used.
          </p>
        </div>
        <ol className="space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-sm text-ink-700">
          <li><span className="font-semibold">1.</span> Parse JD → Job Intelligence</li>
          <li><span className="font-semibold">2.</span> Retrieve evidence (ranked)</li>
          <li><span className="font-semibold">3.</span> Reason about fit</li>
          <li><span className="font-semibold">4.</span> Build grounded bullets</li>
          <li><span className="font-semibold">5.</span> Generate outreach</li>
          <li><span className="font-semibold">6.</span> Recommend strategy</li>
        </ol>
      </div>
    </div>
  );
}

function labelFor(kind: string): string {
  return (MESSAGE_LABELS as Record<MessageKind, string>)[kind as MessageKind] ?? kind;
}

function safeParse(s: any): string[] {
  if (Array.isArray(s)) return s;
  if (typeof s !== "string") return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
