export function SectionShell({
  step,
  title,
  hint,
  actions,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="relative">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-sm">
            {step}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink-900">{title}</h2>
            {hint && <p className="muted">{hint}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
