"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  ArrowUp,
  Check,
  FileCode,
  FilePlus2,
  ListChecks,
  Loader2,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const USER_PROMPT = "Build me an ORB breakout strategy for NQ with a fixed 1:2 risk-reward";

const FILE_NAME = "nq_orb_breakout.pine";

/** The saved strategies shown in the workspace list, before the new file lands. */
const WORKSPACE_FILES = ["vwap_reversion.pine", "repainting_fix.pine"];

const ASSISTANT_LINES = [
  "Opening range breakout on NQ, fixed 1:2 reward-to-risk — writing it as a Pine v6 strategy.",
  "Checking it against the v6 rules I hold every script to.",
];

/** Rule 4 of the system prompt: the v6 pitfalls every script is written against. */
const RULE_CHECK_LABEL = "Pine v6 rule check";
const RULE_CHECK_ITEMS = "repainting · series/simple types · entry semantics · plot limits";
const RULE_CHECK_RESULT =
  "No request.security in this one, so nothing can repaint. The opening range needs var state to survive across bars.";

const REVIEW_RESULT =
  "Reviewed against Pine v6 — no syntax errors. Paste it into the TradingView editor to backtest it.";

const CODE = `//@version=6
strategy("NQ Opening Range Breakout", overlay = true,
     initial_capital = 25000, default_qty_type = strategy.fixed,
     default_qty_value = 1)

// ── Inputs ─────────────────────────────────────────
orMinutes  = input.int(15, "Opening range (minutes)", minval = 1)
riskReward = input.float(2.0, "Reward : risk", minval = 0.5)
tz         = input.string("America/New_York", "Session timezone")

// ── Range state (var, so it persists across bars) ──
var float orHigh    = na
var float orLow     = na
var int   openTs    = na
var box   orBox     = na
var bool  tookLong  = false
var bool  tookShort = false

newSession = session.isfirstbar_regular

if newSession
    openTs    := time
    orHigh    := high
    orLow     := low
    tookLong  := false
    tookShort := false
    orBox     := box.new(bar_index, high, bar_index, low,
          border_color = color.orange,
          bgcolor = color.new(color.orange, 90))

inRange = not na(openTs) and time < openTs + orMinutes * 60 * 1000

if inRange and not newSession
    orHigh := math.max(orHigh, high)
    orLow  := math.min(orLow, low)
    box.set_top(orBox, orHigh)
    box.set_bottom(orBox, orLow)
    box.set_right(orBox, bar_index)

// ── Breakouts, exiting at a fixed multiple of risk ──
armed = not na(orHigh) and not inRange

if armed and not tookLong and ta.crossover(close, orHigh)
    tookLong := true
    risk = close - orLow
    strategy.entry("ORB Long", strategy.long)
    strategy.exit("Long TP/SL", from_entry = "ORB Long",
          stop = orLow, limit = close + risk * riskReward)

if armed and not tookShort and ta.crossunder(close, orLow)
    tookShort := true
    risk = orHigh - close
    strategy.entry("ORB Short", strategy.short)
    strategy.exit("Short TP/SL", from_entry = "ORB Short",
          stop = orHigh, limit = close - risk * riskReward)

plot(armed ? orHigh : na, "OR high", color.teal,
     style = plot.style_linebr)
plot(armed ? orLow : na, "OR low", color.red,
     style = plot.style_linebr)

if session.islastbar_regular
    strategy.close_all(comment = "EOD flat")`;

const CODE_LINES = CODE.split("\n");

/**
 * Every beat of the demo, in order. Each piece of UI names the stage it
 * appears at and stays visible from there on, so the final frame is just
 * the last stage rendered — no separate end-state branch to keep in sync.
 */
const STAGES = [
  "idle",
  "typing",
  "prompt-ready",
  "sending",
  "thinking",
  "line-1",
  "line-2",
  "rules-pending",
  "rules-done",
  "file-created",
  "code-streaming",
  "reviewing",
  "reviewed",
  "done",
] as const;

type Stage = (typeof STAGES)[number];

function reached(current: Stage, target: Stage): boolean {
  return STAGES.indexOf(current) >= STAGES.indexOf(target);
}

const TYPE_MS = 34;
const LINE_MS = 55;

type Beat = { at: number; run: () => void };

/** True only when the browser actually reports a reduced-motion preference. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A scripted recreation of the workspace — the same three panels as the
 * real /chat/[id] page — playing one request end to end. Every step it
 * shows is one the product actually performs: the v6 rule check is rule 4
 * of the system prompt, the review beat is the second pass in
 * lib/agent/self-review.ts, and Run stays disabled exactly as it is in
 * StrategyEditorPanel. Plays once on entering the viewport, then holds its
 * final frame; only leaving the viewport entirely arms a replay.
 */
export function LandingDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const codeScrollRef = useRef<HTMLDivElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [draft, setDraft] = useState("");
  const [visibleLines, setVisibleLines] = useState(0);
  const [pressing, setPressing] = useState(false);

  // 0 means "not started yet"; bumping it replays the whole timeline.
  const [runId, setRunId] = useState(0);
  const runIdRef = useRef(0);
  const finishedRef = useRef(false);
  const leftViewportRef = useRef(false);

  const start = useCallback(() => {
    runIdRef.current += 1;
    finishedRef.current = false;
    setRunId(runIdRef.current);
  }, []);

  // Plays on entering the viewport. Once it has finished, it only replays
  // if it has since scrolled entirely out and come back — never on its own.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver !== "function") {
      start();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (runIdRef.current === 0) {
              start();
            } else if (finishedRef.current && leftViewportRef.current) {
              leftViewportRef.current = false;
              start();
            }
          } else if (entry.intersectionRatio === 0) {
            leftViewportRef.current = true;
          }
        }
      },
      { threshold: [0, 0.3] },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [start]);

  useEffect(() => {
    if (runId === 0) return;

    setStage("idle");
    setDraft("");
    setVisibleLines(0);
    setPressing(false);

    if (prefersReducedMotion()) {
      setStage("done");
      setVisibleLines(CODE_LINES.length);
      finishedRef.current = true;
      return;
    }

    const beats: Beat[] = [];
    let t = 0;
    const at = (delay: number, run: () => void) => {
      t += delay;
      beats.push({ at: t, run });
    };

    // 1 — the prompt types itself into the chat's input field.
    at(500, () => setStage("typing"));
    for (let i = 1; i <= USER_PROMPT.length; i++) {
      at(TYPE_MS, () => setDraft(USER_PROMPT.slice(0, i)));
    }

    // 2 — a beat to read it, then Send visibly depresses.
    at(400, () => setStage("prompt-ready"));
    at(300, () => {
      setStage("sending");
      setPressing(true);
    });
    at(220, () => setPressing(false));

    // 3 — the message lands in the thread and the reply narrates itself.
    at(80, () => {
      setStage("thinking");
      setDraft("");
    });
    at(700, () => setStage("line-1"));
    at(1100, () => setStage("line-2"));

    // 4 — the rule check runs as its own card, then resolves to a result.
    at(650, () => setStage("rules-pending"));
    at(950, () => setStage("rules-done"));

    // 5 — the file is created and fills line by line.
    at(700, () => setStage("file-created"));
    at(450, () => setStage("code-streaming"));
    for (let i = 1; i <= CODE_LINES.length; i++) {
      at(LINE_MS, () => setVisibleLines(i));
    }

    // 6 — the syntax review pass, and its verdict in both panels.
    at(500, () => setStage("reviewing"));
    at(1100, () => setStage("reviewed"));

    // 7 — settled. Nothing further is scheduled.
    at(400, () => {
      setStage("done");
      finishedRef.current = true;
    });

    const timers = beats.map((beat) => setTimeout(beat.run, beat.at));
    return () => timers.forEach(clearTimeout);
  }, [runId]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [stage]);

  useEffect(() => {
    const el = codeScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleLines]);

  const fileCreated = reached(stage, "file-created");
  const reviewing = stage === "reviewing";
  const reviewed = reached(stage, "reviewed");
  const shownCode = CODE_LINES.slice(0, visibleLines).join("\n");

  return (
    <div
      ref={containerRef}
      className="mt-8 flex h-[440px] overflow-hidden rounded-lg border border-border bg-card text-left"
    >
      {/* Workspace — mirrors WorkspacePanel: the file the run creates is
          appended to the list and selected, as a real save would be. */}
      <div className="hidden w-44 shrink-0 flex-col border-r border-border bg-sidebar py-3 lg:flex">
        <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Workspace
        </p>
        <div className="space-y-0.5 px-2">
          {fileCreated && (
            <div className="flex animate-in items-center gap-1.5 truncate rounded-md bg-muted px-2 py-1.5 text-xs text-foreground fade-in slide-in-from-left-2">
              <FileCode className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{FILE_NAME}</span>
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-xs",
              fileCreated ? "text-muted-foreground" : "bg-muted text-foreground",
            )}
          >
            <FileCode className="size-3.5 shrink-0" />
            <span className="truncate">this conversation.pine</span>
          </div>
          {WORKSPACE_FILES.map((file) => (
            <div
              key={file}
              className="flex items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-xs text-muted-foreground"
            >
              <FileCode className="size-3.5 shrink-0" />
              <span className="truncate">{file}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor — mirrors StrategyEditorPanel: file tab, line numbers, and a
          Run button that is disabled here for the same reason it is disabled
          in the real panel. Hidden below lg, as in the real product. */}
      <div className="hidden min-w-0 flex-1 flex-col lg:flex">
        <div className="flex h-[41px] items-center justify-between border-r border-b border-border bg-sidebar">
          {fileCreated ? (
            <div className="flex animate-in items-center gap-1.5 border-t-2 border-t-primary bg-background px-4 py-2.5 text-sm fade-in slide-in-from-left-2">
              <FileCode className="size-4 text-muted-foreground" />
              {FILE_NAME}
            </div>
          ) : (
            <span className="px-4 py-2.5 text-sm text-muted-foreground">No file open</span>
          )}
          <div className="flex items-center gap-2 px-2">
            {reviewing && (
              <span className="flex animate-in items-center gap-1.5 text-xs text-muted-foreground fade-in">
                <Loader2 className="size-3 animate-spin" />
                Checking v6 syntax…
              </span>
            )}
            {reviewed && (
              <span className="flex animate-in items-center gap-1.5 text-xs text-primary fade-in">
                <Check className="size-3.5" />
                v6 syntax OK
              </span>
            )}
            <Button variant="outline" size="sm" disabled>
              <Play />
              Run
            </Button>
          </div>
        </div>

        <div ref={codeScrollRef} className="flex-1 overflow-hidden border-r border-border">
          {shownCode ? (
            <SyntaxHighlighter
              language="pine"
              style={oneDark}
              showLineNumbers
              lineNumberStyle={{
                minWidth: "2.5em",
                paddingRight: "1em",
                color: "var(--muted-foreground)",
                opacity: 0.5,
                userSelect: "none",
              }}
              customStyle={{
                margin: 0,
                background: "transparent",
                fontSize: "0.72rem",
                padding: "1rem",
                overflow: "hidden",
              }}
            >
              {shownCode}
            </SyntaxHighlighter>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <FileCode className="size-7 text-muted-foreground" />
              <p className="mt-3 text-xs text-muted-foreground">
                The Pine Script PineDev writes for you will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat — mirrors ChatView: title bar with the model badge, the thread,
          and the composer the prompt types itself into. */}
      <div className="flex min-w-0 flex-1 flex-col lg:w-[360px] lg:flex-none">
        <div className="flex h-[41px] items-center justify-between gap-3 border-b border-border px-4">
          <p className="truncate text-sm font-medium">NQ ORB breakout</p>
          <Badge variant="secondary" className="shrink-0">
            Claude Sonnet
          </Badge>
        </div>

        <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-hidden p-4">
          {reached(stage, "sending") && (
            <div className="flex animate-in justify-end fade-in slide-in-from-bottom-2">
              <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-muted px-3 py-2.5 text-sm">
                {USER_PROMPT}
              </div>
            </div>
          )}

          {stage === "thinking" && <p className="text-sm text-muted-foreground">Thinking…</p>}

          {ASSISTANT_LINES.map((line, i) => {
            const lineStage: Stage = i === 0 ? "line-1" : "line-2";
            if (!reached(stage, lineStage)) return null;
            return (
              <p
                key={line}
                className="animate-in text-sm leading-relaxed fade-in slide-in-from-bottom-1"
              >
                {line}
              </p>
            );
          })}

          {reached(stage, "rules-pending") && (
            <div className="animate-in rounded-lg border border-border bg-background p-3 fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                {reached(stage, "rules-done") ? (
                  <Check className="size-3.5 shrink-0 text-primary" />
                ) : (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                )}
                <ListChecks className="size-3.5 shrink-0 text-muted-foreground" />
                {RULE_CHECK_LABEL}
              </div>
              <p className="mt-1.5 pl-[1.6rem] text-[0.7rem] leading-relaxed text-muted-foreground">
                {RULE_CHECK_ITEMS}
              </p>
            </div>
          )}

          {reached(stage, "rules-done") && (
            <p className="animate-in text-sm leading-relaxed fade-in slide-in-from-bottom-1">
              {RULE_CHECK_RESULT}
            </p>
          )}

          {reached(stage, "file-created") && (
            <div className="flex animate-in items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs fade-in slide-in-from-bottom-2">
              <FilePlus2 className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">
                Created <span className="font-medium">{FILE_NAME}</span>
              </span>
              <span className="ml-auto shrink-0 text-muted-foreground">
                {CODE_LINES.length} lines
              </span>
            </div>
          )}

          {reviewed && (
            <p className="animate-in text-sm leading-relaxed fade-in slide-in-from-bottom-1">
              {REVIEW_RESULT}
            </p>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div
            className={cn(
              "rounded-md border bg-background px-3 py-2 transition-colors",
              stage === "typing" ? "border-ring" : "border-border",
            )}
          >
            <p className="min-h-[2.5rem] text-xs leading-relaxed break-words">
              {draft ? (
                <>
                  <span>{draft}</span>
                  {stage === "typing" && (
                    <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-current align-middle" />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">
                  Describe a strategy, or paste a compiler error…
                </span>
              )}
            </p>
            <div className="mt-1 flex items-center justify-end">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground transition-transform duration-150",
                  pressing && "scale-90 ring-2 ring-primary/40",
                  !draft && "opacity-50",
                )}
              >
                <ArrowUp className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
