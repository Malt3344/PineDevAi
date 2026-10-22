"use client";

import { useState, useTransition } from "react";
import { Lock, LockOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { amendHypothesis, lockHypothesis, saveHypothesis } from "@/app/chat/study-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProtocolInput } from "@/lib/quant/analysis";
import { lockBlockers, MIN_RATIONALE_LENGTH, type Criteria, type Hypothesis } from "@/lib/quant/protocol";
import { cn } from "@/lib/utils";
import { formatDate } from "./format";
import { Section, StageIntro } from "./primitives";

type TextField = { key: keyof Hypothesis; label: string; placeholder: string; hint?: string };

const TEXT_FIELDS: TextField[] = [
  {
    key: "rationale",
    label: "Why should this edge exist?",
    placeholder:
      "e.g. Overnight gaps in index futures partially fill in the first hour because market makers rebalance inventory taken on in thin pre-market liquidity…",
    hint: "Name the behaviour you are exploiting and who is on the other side. An edge with no reason is usually noise.",
  },
  {
    key: "entryRules",
    label: "Entry rules",
    placeholder: "Mechanical, no discretion. e.g. Long when the 9:30 open gaps down > 0.5% from the prior close…",
  },
  {
    key: "exitRules",
    label: "Exit rules",
    placeholder: "e.g. Take profit at the prior close, stop at 1× ATR(14), flat by 11:00…",
  },
];

type NumberField = { key: keyof Criteria; label: string; suffix?: string; step: number; scale?: number };

const CRITERIA_FIELDS: NumberField[] = [
  { key: "minTrades", label: "Minimum trades", step: 10 },
  { key: "minProfitFactor", label: "Min. in-sample profit factor", step: 0.05 },
  { key: "minDsr", label: "Min. deflated Sharpe", suffix: "%", step: 1, scale: 100 },
  { key: "maxDrawdownPct", label: "Max. tolerable drawdown", suffix: "%", step: 1 },
  { key: "minProfitablePeriodsPct", label: "Min. profitable periods", suffix: "%", step: 5 },
  { key: "minOosEfficiency", label: "Min. out-of-sample efficiency", suffix: "%", step: 5, scale: 100 },
  { key: "minOosProfitFactor", label: "Min. out-of-sample profit factor", step: 0.05 },
];

/**
 * Stage 1. Writing the claim and its pass bar down before any result exists
 * is what separates a test from a story told afterwards. Once locked, the
 * fields go read-only; amending is possible but counted.
 */
export function HypothesisStage({
  chatId,
  protocol,
  onAsk,
}: {
  chatId: string;
  protocol: ProtocolInput;
  onAsk: (text: string, mode?: "plan" | "act") => void;
}) {
  const [hypothesis, setHypothesis] = useState(protocol.hypothesis);
  const [criteria, setCriteria] = useState(protocol.criteria);
  const [pending, startTransition] = useTransition();
  const locked = protocol.lockedAt !== null;
  const blockers = lockBlockers(hypothesis);

  const setH = <K extends keyof Hypothesis>(key: K, value: Hypothesis[K]) =>
    setHypothesis((h) => ({ ...h, [key]: value }));

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-5">
      <StageIntro title="1 · Hypothesis">
        Write down what you believe and how you will judge it <em>before</em> you see a single
        backtest. Once locked, the criteria are fixed: you cannot move the goalposts after the
        results come in.
      </StageIntro>

      {locked ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm">
            <Lock className="size-4 text-primary" aria-hidden />
            Pre-registered on {formatDate(protocol.lockedAt)}
            {protocol.amendments > 0 && (
              <span className="text-muted-foreground">
                · amended {protocol.amendments}×
              </span>
            )}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={pending}>
                <LockOpen />
                Amend
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Amend a pre-registered hypothesis?</AlertDialogTitle>
                <AlertDialogDescription>
                  Changing the rules after seeing results is how backtests get overfit. You can
                  do it, but it is recorded: each amendment counts as another trial and raises
                  the bar the deflated Sharpe has to clear.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it locked</AlertDialogCancel>
                <AlertDialogAction onClick={() => run(() => amendHypothesis(chatId), "Hypothesis unlocked")}>
                  Unlock and record amendment
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Not sure how to phrase it? Describe the idea in the chat and the assistant will draft a
            testable hypothesis.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onAsk(
                `Help me turn this into a testable hypothesis for the protocol. Market: ${hypothesis.market || "?"}, timeframe: ${hypothesis.timeframe || "?"}. Idea: ${hypothesis.rationale || hypothesis.entryRules || "(I'll describe it next)"}`,
                "plan",
              )
            }
          >
            <Sparkles />
            Draft with the assistant
          </Button>
        </div>
      )}

      <Section title="The edge">
        <fieldset disabled={locked || pending} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="h-market">Market</Label>
              <Input
                id="h-market"
                value={hypothesis.market}
                onChange={(e) => setH("market", e.target.value)}
                placeholder="NQ1! futures"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="h-timeframe">Timeframe</Label>
              <Input
                id="h-timeframe"
                value={hypothesis.timeframe}
                onChange={(e) => setH("timeframe", e.target.value)}
                placeholder="5m"
              />
            </div>
          </div>
          {TEXT_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`h-${field.key}`}>{field.label}</Label>
              <Textarea
                id={`h-${field.key}`}
                value={hypothesis[field.key] as string}
                onChange={(e) => setH(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
              />
              {field.key === "rationale" && (
                <p className="text-xs text-muted-foreground">
                  {field.hint}{" "}
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      hypothesis.rationale.length >= MIN_RATIONALE_LENGTH && "text-primary",
                    )}
                  >
                    {hypothesis.rationale.length}/{MIN_RATIONALE_LENGTH}
                  </span>
                </p>
              )}
            </div>
          ))}
        </fieldset>
      </Section>

      <Section
        title="Data split"
        description="The out-of-sample window is sealed until the very end. Put it after the in-sample window; roughly 70/30 is typical."
      >
        <fieldset disabled={locked || pending} className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["inSampleStart", "In-sample start"],
              ["inSampleEnd", "In-sample end"],
              ["outOfSampleStart", "Out-of-sample start"],
              ["outOfSampleEnd", "Out-of-sample end"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`h-${key}`}>{label}</Label>
              <Input
                id={`h-${key}`}
                type="date"
                value={hypothesis[key]}
                onChange={(e) => setH(key, e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="h-account">Account size</Label>
            <Input
              id="h-account"
              type="number"
              min={1}
              value={hypothesis.accountSize}
              onChange={(e) => setH("accountSize", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-cost">Round-trip cost (bps of position)</Label>
            <Input
              id="h-cost"
              type="number"
              min={0}
              step={0.5}
              value={hypothesis.costBps}
              onChange={(e) => setH("costBps", Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="h-trials">Variants already tried before this study</Label>
            <Input
              id="h-trials"
              type="number"
              min={0}
              value={hypothesis.priorTrials}
              onChange={(e) => setH("priorTrials", Math.max(0, Math.round(Number(e.target.value) || 0)))}
              className="sm:max-w-40"
            />
            <p className="text-xs text-muted-foreground">
              Be honest — every parameter set you already looked at raises the bar the result must
              clear. Under-reporting this only fools you.
            </p>
          </div>
        </fieldset>
      </Section>

      <Section
        title="Pass criteria"
        description="Strict defaults. Loosen them only for a reason you would defend to someone else."
      >
        <fieldset disabled={locked || pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRITERIA_FIELDS.map((field) => {
            const scale = field.scale ?? 1;
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`c-${field.key}`}>
                  {field.label}
                  {field.suffix && <span className="text-muted-foreground"> ({field.suffix})</span>}
                </Label>
                <Input
                  id={`c-${field.key}`}
                  type="number"
                  step={field.step}
                  value={Number((criteria[field.key] * scale).toFixed(4))}
                  onChange={(e) =>
                    setCriteria((c) => ({ ...c, [field.key]: (Number(e.target.value) || 0) / scale }))
                  }
                />
              </div>
            );
          })}
        </fieldset>
      </Section>

      {!locked && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            {blockers.length === 0 ? (
              <p className="text-primary">Ready to pre-register.</p>
            ) : (
              <>
                <p className="font-medium">Before you can lock:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => saveHypothesis(chatId, hypothesis, criteria), "Draft saved")}
            >
              Save draft
            </Button>
            <Button
              disabled={pending || blockers.length > 0}
              onClick={() => run(() => lockHypothesis(chatId, hypothesis, criteria), "Hypothesis pre-registered")}
            >
              <Lock />
              Lock &amp; pre-register
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
