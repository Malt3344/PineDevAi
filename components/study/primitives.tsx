import { CircleCheck, CircleDashed, CircleX, ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX } from "lucide-react";
import type { Check, Grade } from "@/lib/quant/analysis";
import { cn } from "@/lib/utils";

/** A titled block inside a stage. The cards are the protocol's paper. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** One headline number. When a number is the whole story it is a tile, not a chart. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-medium tabular-nums",
          tone === "good" && "text-primary",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</div>;
}

const CHECK_ICON = { pass: CircleCheck, fail: CircleX, pending: CircleDashed } as const;
const CHECK_TEXT = { pass: "Pass", fail: "Fail", pending: "Pending" } as const;

/** A single pre-registered test: icon and word for state, never colour alone. */
export function CheckRow({ check }: { check: Check }) {
  const Icon = CHECK_ICON[check.status];
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          check.status === "pass" && "text-primary",
          check.status === "fail" && "text-destructive",
          check.status === "pending" && "text-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm">
            {check.label}
            {check.critical && (
              <span className="ml-2 rounded border border-border px-1 py-px text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                Critical
              </span>
            )}
          </p>
          <p className="font-mono text-xs tabular-nums">
            <span className={cn(check.status === "fail" && "text-destructive")}>{check.value}</span>
            <span className="text-muted-foreground"> / {check.threshold}</span>
            <span className="sr-only"> — {CHECK_TEXT[check.status]}</span>
          </p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{check.explain}</p>
      </div>
    </li>
  );
}

export function CheckList({ checks }: { checks: Check[] }) {
  return <ul className="divide-y divide-border">{checks.map((c) => <CheckRow key={c.id} check={c} />)}</ul>;
}

export const GRADE_META: Record<Grade, { label: string; icon: typeof ShieldCheck; className: string }> = {
  validated: { label: "Validated", icon: ShieldCheck, className: "border-primary/40 bg-primary/10 text-primary" },
  promising: { label: "Promising", icon: ShieldCheck, className: "border-primary/30 bg-primary/5 text-primary" },
  fragile: { label: "Fragile", icon: ShieldAlert, className: "border-warning/40 bg-warning/10 text-warning" },
  rejected: { label: "Rejected", icon: ShieldX, className: "border-destructive/40 bg-destructive/10 text-destructive" },
  incomplete: { label: "In progress", icon: ShieldQuestion, className: "border-border bg-muted text-muted-foreground" },
};

export function GradeBadge({ grade, className }: { grade: Grade; className?: string }) {
  const meta = GRADE_META[grade];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      <meta.icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

/** The paragraph every stage opens with: what this step is for, in the protocol's own words. */
export function StageIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
