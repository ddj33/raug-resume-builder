export function FitScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone =
    clamped >= 75 ? "stroke-emerald-500" : clamped >= 55 ? "stroke-brand-600" : clamped >= 35 ? "stroke-amber-500" : "stroke-rose-500";
  const label =
    clamped >= 75 ? "Strong fit" : clamped >= 55 ? "Solid fit" : clamped >= 35 ? "Stretch" : "Long shot";

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="8"
            className="stroke-ink-100 fill-none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            strokeWidth="8"
            strokeLinecap="round"
            className={`fill-none transition-all ${tone}`}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-ink-900">{clamped}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              fit score
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-ink-900">{label}</div>
        <div className="muted max-w-[14rem]">
          Score reflects retrieval overlap between the JD and your grounded profile facts.
        </div>
      </div>
    </div>
  );
}
