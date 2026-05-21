import Link from "next/link";
import { prisma } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/profile";
import { analyzeJob, generationMode } from "@/lib/ai";
import { Workflow } from "@/components/Workflow";
import { DemoPreview } from "@/components/DemoPreview";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [profile, jobCount, analysisCount, messageCount, demoJob] = await Promise.all([
    getOrCreateProfile(),
    prisma.job.count(),
    prisma.jobAnalysis.count(),
    prisma.generatedMessage.count(),
    prisma.job.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);

  // Run the live RAUG pipeline on a seeded JD so the homepage's demo card is real.
  const bundle = demoJob ? analyzeJob(profile, demoJob) : null;
  const demoRequirement = bundle?.intelligence.requirements[0] ?? null;
  const demoEvidence = bundle?.evidence.find((e) => e.kind !== "skill") ?? bundle?.evidence[0] ?? null;
  const demoBullet =
    bundle?.analysis.bullets.find((b) => b.evidenceId === demoEvidence?.evidenceId) ??
    bundle?.analysis.bullets[0] ??
    null;

  const mode = generationMode();
  const firstName = profile.fullName.split(" ")[0];

  return (
    <div>
      {/* Hero ---------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-200 bg-gradient-to-br from-brand-50 via-white to-violet-50 px-8 py-10 shadow-card">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <span className="chip !bg-white">RAUG · Retrieval-Augmented Application Generation</span>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl">
              Turn any job post into a <span className="text-brand-600">grounded application strategy.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
              Paste a JD. The system parses it into structured requirements, retrieves the most relevant
              facts from your candidate profile, reasons about fit, and generates a tailored resume and
              outreach — every bullet traceable to the evidence it used. No invented experience.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/jobs/new" className="btn-primary">
                Analyze a new job post →
              </Link>
              <Link href="/jobs" className="btn">
                See saved jobs ({jobCount})
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            <HeroStat label="Saved jobs" value={jobCount} />
            <HeroStat label="Analyzed" value={analysisCount} hint="With evidence trail" />
            <HeroStat label="Outreach drafts" value={messageCount} hint="Grounded messages" />
            <HeroStat
              label="Generation mode"
              value={mode === "live" ? "Live LLM" : "Deterministic"}
              hint={mode === "live" ? "API key detected" : "Fallback active"}
            />
          </div>
        </div>
      </section>

      {/* Workflow ------------------------------------------------------ */}
      <div className="mt-8">
        <Workflow />
      </div>

      {/* Live demo preview -------------------------------------------- */}
      {bundle && demoJob && (
        <div className="mt-8">
          <DemoPreview
            jobId={demoJob.id}
            intelligence={bundle.intelligence}
            evidence={demoEvidence}
            bullet={demoBullet}
            requirement={demoRequirement}
          />
        </div>
      )}

      {/* Why different ------------------------------------------------ */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="h1">Why this isn't a normal resume builder</h2>
            <p className="muted mt-1 max-w-2xl">
              Most "AI resume" tools generate fluent text and call it done. They invent experience to
              fill the JD. This system refuses to.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <DiffCard
            badge="Retrieve first"
            title="Structured profile, not free text"
            body="Your experiences, projects, courses, and skills are stored as structured records. The retriever scores each one against every parsed requirement in the JD — like a tiny analyst, not a chatbot."
          />
          <DiffCard
            badge="Reason from evidence"
            title="Fit, risks, and angle from real facts"
            body="The fit score is a function of requirement coverage and skill overlap. Risks call out requirements that retrieval could not cover. Best angle anchors on the highest-ranked evidence — not vibes."
          />
          <DiffCard
            badge="Generate, with citations"
            title="Bullets carry evidence ids"
            body="Every resume bullet records which retrieved evidence it came from and which JD requirement it maps to. Every outreach message lists the evidence ids it referenced. You can audit it."
          />
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
          <div className="text-sm font-semibold text-ink-900">What the system will not do</div>
          <ul className="grid gap-1.5 text-sm leading-relaxed text-ink-700 sm:grid-cols-2">
            <li>✗ Invent a project you don't have</li>
            <li>✗ Claim a skill that isn't in your profile</li>
            <li>✗ Write bullets it can't trace to evidence</li>
            <li>✗ Generate outreach without grounding it in a retrieved fact</li>
          </ul>
        </div>
      </section>

      {/* Quick start --------------------------------------------------- */}
      <section className="mt-10">
        <h2 className="h1">Quick start, {firstName}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <QuickLink href="/profile" n={1} title="Review your profile" hint="Cornell Tech, projects, skills, courses" />
          <QuickLink href="/jobs/new" n={2} title="Add a job" hint="Paste the JD + optional contact" />
          <QuickLink href="/jobs" n={3} title="Run the RAUG pipeline" hint="Intelligence → Evidence → Bullets → Outreach" />
          <QuickLink href="/pipeline" n={4} title="Track outcomes" hint="Saved → Contacted → Interviewing → Offer" />
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white/70 px-4 py-3 backdrop-blur">
      <div className="label">{label}</div>
      <div className="text-2xl font-bold text-ink-900">{value}</div>
      {hint && <div className="text-xs text-ink-500">{hint}</div>}
    </div>
  );
}

function DiffCard({ badge, title, body }: { badge: string; title: string; body: string }) {
  return (
    <div className="card h-full">
      <div className="card-body">
        <span className="chip">{badge}</span>
        <div className="mt-3 text-base font-semibold text-ink-900">{title}</div>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">{body}</p>
      </div>
    </div>
  );
}

function QuickLink({ href, n, title, hint }: { href: string; n: number; title: string; hint: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
        {n}
      </span>
      <div>
        <div className="text-sm font-semibold text-ink-900 group-hover:text-brand-700">{title}</div>
        <div className="mt-0.5 text-xs text-ink-500">{hint}</div>
      </div>
    </Link>
  );
}
