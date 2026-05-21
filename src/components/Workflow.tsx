const STEPS = [
  {
    label: "Job Post",
    sub: "Paste any JD",
    detail: "Parsed into structured role, seniority, skills, requirements, responsibilities.",
    accent: "bg-brand-50 text-brand-700 border-brand-100",
  },
  {
    label: "Retrieved Candidate Evidence",
    sub: "Ranked by relevance",
    detail: "Projects, experiences, courses, and skills are scored against each requirement.",
    accent: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    label: "Fit Reasoning",
    sub: "Why this matches",
    detail: "Score, top matches, risks, and the best positioning angle — derived from evidence only.",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    label: "Tailored Resume + Outreach",
    sub: "Grounded in evidence",
    detail: "Every bullet and message carries the evidence ids it used. Nothing is invented.",
    accent: "bg-amber-50 text-amber-800 border-amber-100",
  },
];

export function Workflow() {
  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div>
          <div className="h2">The RAUG pipeline</div>
          <p className="muted">Four explicit stages — the assistant only generates from what retrieval surfaces.</p>
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.label} className="relative">
              <div className={`flex h-full flex-col rounded-xl border px-4 py-4 ${step.accent}`}>
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white/70 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide">{step.sub}</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-ink-900">{step.label}</div>
                <p className="mt-2 text-xs leading-relaxed text-ink-700">{step.detail}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="pointer-events-none absolute right-[-12px] top-1/2 hidden -translate-y-1/2 md:block">
                  <ArrowRight />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="24" height="14" viewBox="0 0 24 14" fill="none" className="text-ink-400">
      <path
        d="M0 7h22M17 1l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
