"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { FanChart } from "@/components/study/charts";
import { formatPct, formatRatio } from "@/components/study/format";
import { GradeBadge } from "@/components/study/primitives";
import type { SampleStudy } from "@/lib/quant/sample";
import { cn } from "@/lib/utils";

/**
 * Two studies side by side, computed by the real engine: one that holds up
 * and one that looked better in its backtest and still fails. The point of
 * the hero is that second card.
 */
export function SampleVerdicts({ studies }: { studies: SampleStudy[] }) {
  return (
    <div className="grid gap-4 text-left lg:grid-cols-2">
      {studies.map((study) => {
        const { analysis } = study;
        const is = analysis.inSample?.metrics;
        const oos = analysis.outOfSample?.metrics;
        return (
          <article key={study.title} className="flex min-w-0 flex-col rounded-xl border border-border bg-surface-raised">
            <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium">{study.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {study.market} · {analysis.trials} trials counted
                </p>
              </div>
              <GradeBadge grade={analysis.verdict.grade} />
            </header>

            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              {[
                ["Backtest PF", formatRatio(is?.profitFactor ?? 0)],
                ["Deflated Sharpe", formatPct(analysis.robustness?.dsr)],
                ["Out-of-sample PF", formatRatio(oos?.profitFactor ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-3">
                  <p className="text-[0.6875rem] text-muted-foreground">{label}</p>
                  <p className="mt-0.5 font-mono text-base tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            <div className="px-4 pt-3">
              <p className="text-xs text-muted-foreground">Monte Carlo band, in-sample trades</p>
              {analysis.robustness && <FanChart fan={analysis.robustness.monteCarlo.fan} height={150} />}
            </div>

            <ul className="mt-auto grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-border px-4 py-3 sm:grid-cols-2">
              {analysis.checks.map((check) => (
                <li key={check.id} className="flex min-w-0 items-center gap-1.5 text-xs">
                  {check.status === "pass" ? (
                    <CircleCheck className="size-3.5 shrink-0 text-primary" aria-label="Pass" />
                  ) : (
                    <CircleX className="size-3.5 shrink-0 text-destructive" aria-label="Fail" />
                  )}
                  <span className={cn("truncate", check.status === "fail" ? "text-foreground" : "text-muted-foreground")}>
                    {check.label}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
