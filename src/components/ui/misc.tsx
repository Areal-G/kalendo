import type * as React from "react";

import { cn, initials } from "@/lib/utils";

export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("bg-border h-px w-full", className)} />;
}

export function Avatar({
  name,
  color,
  className,
}: {
  name: string;
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: color ?? "var(--primary)" }}
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-mono text-3xl font-light">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center">
      {icon ? (
        <div className="bg-accent text-accent-foreground mb-3 rounded-full p-3 [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "primary" | "highlight";
}) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm">{label}</p>
        {icon ? (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4",
              tone === "primary"
                ? "bg-accent text-accent-foreground"
                : "bg-highlight/15 text-highlight",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
