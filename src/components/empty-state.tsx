import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  hint,
  className = "mt-6",
}: {
  icon: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-dashed border-line-strong px-6 py-14 text-center ${className}`}
    >
      <span
        aria-hidden
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-seal-wash text-seal"
      >
        {icon}
      </span>
      <p className="mt-5 font-serif text-lg text-ink-soft">{title}</p>
      {hint ? <p className="mt-1.5 text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}
