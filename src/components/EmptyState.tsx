import Link from "next/link";

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <span className="text-xl">＋</span>
      </div>
      <div>
        <div className="text-base font-semibold text-ink-900">{title}</div>
        <p className="muted mx-auto mt-1 max-w-md">{description}</p>
      </div>
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="btn-primary mt-2">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
