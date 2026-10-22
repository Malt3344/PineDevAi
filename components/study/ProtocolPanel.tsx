"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { ProtocolInput, StudyAnalysis } from "@/lib/quant/analysis";
import { STAGES, type StageId } from "@/lib/quant/protocol";
import { cn } from "@/lib/utils";
import { HypothesisStage } from "./HypothesisStage";
import { GradeBadge } from "./primitives";
import {
  BuildStage,
  IncubationStage,
  InSampleStage,
  OutOfSampleStage,
  RobustnessStage,
  VerdictStage,
} from "./stages";

export type StudyData = { protocol: ProtocolInput; analysis: StudyAnalysis };

/**
 * The study's protocol, one stage at a time. The stepper shows where the
 * study actually is (derived from the evidence, not a flag the user sets)
 * while still letting them look back at any earlier stage.
 */
export function ProtocolPanel({
  chatId,
  study,
  code,
  onAsk,
  onOpenScript,
}: {
  chatId: string;
  study: StudyData;
  code: string | null;
  onAsk: (text: string, mode?: "plan" | "act") => void;
  onOpenScript: () => void;
}) {
  const { protocol, analysis } = study;
  const [active, setActive] = useState<StageId>(analysis.current);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // When the evidence moves the study forward — a lock, an upload — follow it.
  const current = analysis.current;
  const previousCurrent = useRef(current);
  useEffect(() => {
    if (previousCurrent.current !== current) {
      setActive(current);
      previousCurrent.current = current;
    }
  }, [current]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    // On a phone the stepper scrolls sideways; keep the open stage in it.
    navRef.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const index = STAGES.findIndex((s) => s.id === active);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <nav
        ref={navRef}
        aria-label="Protocol stages"
        className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-surface-raised px-2 [scrollbar-width:none]"
      >
        {STAGES.map((stage, i) => {
          const state = analysis.stageStates[stage.id];
          const isActive = stage.id === active;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActive(stage.id)}
              aria-current={isActive ? "step" : undefined}
              title={stage.short}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[0.8125rem] transition-colors",
                isActive ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border font-mono text-[0.6875rem]",
                  state === "done" && "border-primary bg-primary text-primary-foreground",
                  state === "current" && "border-primary text-primary",
                  state === "todo" && "border-border",
                )}
              >
                {state === "done" ? <Check className="size-3" aria-label="done" /> : i + 1}
              </span>
              {stage.label}
            </button>
          );
        })}
        <div className="ml-auto hidden shrink-0 pl-2 xl:block">
          <GradeBadge grade={analysis.verdict.grade} />
        </div>
      </nav>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          {active === "hypothesis" && <HypothesisStage chatId={chatId} protocol={protocol} onAsk={onAsk} />}
          {active === "build" && (
            <BuildStage code={code} protocol={protocol} onAsk={onAsk} onOpenScript={onOpenScript} />
          )}
          {active === "in_sample" && <InSampleStage chatId={chatId} protocol={protocol} analysis={analysis} />}
          {active === "robustness" && <RobustnessStage protocol={protocol} analysis={analysis} onAsk={onAsk} />}
          {active === "out_of_sample" && <OutOfSampleStage chatId={chatId} protocol={protocol} analysis={analysis} />}
          {active === "verdict" && <VerdictStage analysis={analysis} onAsk={onAsk} />}
          {active === "incubation" && <IncubationStage chatId={chatId} analysis={analysis} />}

          <div className="mt-8 flex justify-between border-t border-border pt-4">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setActive(STAGES[index - 1].id)}
              className="text-sm text-muted-foreground hover:text-foreground disabled:invisible"
            >
              ← {STAGES[index - 1]?.label}
            </button>
            <button
              type="button"
              disabled={index === STAGES.length - 1}
              onClick={() => setActive(STAGES[index + 1].id)}
              className="text-sm text-muted-foreground hover:text-foreground disabled:invisible"
            >
              {STAGES[index + 1]?.label} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
