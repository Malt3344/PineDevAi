"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bookmark, BookmarkCheck, MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const USER_MESSAGE =
  "Write me an opening range breakout strategy. 5 minute opening range, enter long on a break above the range high, short on a break below the range low.";

const ASSISTANT_INTRO =
  "Here's a complete ORB strategy using the first five minutes of the session as the range.";

const CODE = `//@version=6
strategy("ORB Breakout", overlay=true)

sessionStart = "0930-0935"
inSession = not na(time(timeframe.period, sessionStart))

var float orbHigh = na
var float orbLow = na

if inSession
    orbHigh := high
    orbLow := low
else if not na(orbHigh) and close > orbHigh
    strategy.entry("Long", strategy.long)
else if not na(orbLow) and close < orbLow
    strategy.entry("Short", strategy.short)`;

const SIDEBAR_ITEMS = ["ORB breakout strategy", "VWAP mean reversion", "Fix: repainting signal"];

type Phase = "typing-user" | "thinking" | "typing-assistant" | "streaming-code" | "done";

/**
 * A scripted, looping recreation of an actual PineDev conversation — same
 * components and styling as the real chat, just choreographed with GSAP
 * instead of live. Skips straight to the end state for
 * prefers-reduced-motion. GSAP drives timing only; the syntax-highlighted
 * code still has to go through React state to re-render correctly.
 */
export function LandingDemo() {
  const [phase, setPhase] = useState<Phase>("typing-user");
  const [userText, setUserText] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [codeText, setCodeText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setUserText(USER_MESSAGE);
      setAssistantText(ASSISTANT_INTRO);
      setCodeText(CODE);
      setSaved(true);
      setPhase("done");
      return;
    }

    const progress = { user: 0, assistant: 0, code: 0 };

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 4 });

    tl.call(() => {
      setUserText("");
      setAssistantText("");
      setCodeText("");
      setSaved(false);
      setPhase("typing-user");
      progress.user = 0;
      progress.assistant = 0;
      progress.code = 0;
    });

    tl.to(progress, {
      user: USER_MESSAGE.length,
      duration: USER_MESSAGE.length * 0.014,
      ease: "none",
      onUpdate: () => setUserText(USER_MESSAGE.slice(0, Math.floor(progress.user))),
    });

    tl.call(() => setPhase("thinking"));
    tl.to({}, { duration: 0.9 });

    tl.call(() => setPhase("typing-assistant"));
    tl.to(progress, {
      assistant: ASSISTANT_INTRO.length,
      duration: ASSISTANT_INTRO.length * 0.016,
      ease: "none",
      onUpdate: () => setAssistantText(ASSISTANT_INTRO.slice(0, Math.floor(progress.assistant))),
    });

    tl.to({}, { duration: 0.3 });
    tl.call(() => setPhase("streaming-code"));
    tl.to(progress, {
      code: CODE.length,
      duration: CODE.length * 0.0045,
      ease: "none",
      onUpdate: () => setCodeText(CODE.slice(0, Math.floor(progress.code))),
    });

    tl.to({}, { duration: 0.6 });
    tl.call(() => {
      setSaved(true);
      setPhase("done");
    });

    return () => {
      tl.kill();
    };
  }, []);

  const isBusy = phase === "thinking";

  return (
    <div className="mt-10 flex overflow-hidden rounded-lg border border-border bg-card">
      {/* Decorative, static — the real sidebar, for visual context only. */}
      <div className="hidden w-44 shrink-0 flex-col border-r border-border bg-sidebar py-3 sm:flex">
        <div className="flex items-center gap-1.5 px-3 pb-3 text-xs text-muted-foreground">
          <Plus className="size-3.5" />
          New chat
        </div>
        <div className="space-y-0.5 px-2">
          {SIDEBAR_ITEMS.map((item, i) => (
            <div
              key={item}
              className={cn(
                "flex items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-xs",
                i === 0 ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              <MessageSquare className="size-3 shrink-0" />
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-4 p-5">
        {userText && (
          <div className="flex justify-end">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-tr-sm bg-muted px-4 py-3 text-sm">
              {userText}
              {phase === "typing-user" && <Cursor />}
            </div>
          </div>
        )}

        {isBusy && (
          <div className="flex justify-start">
            <div className="text-sm text-muted-foreground">Thinking…</div>
          </div>
        )}

        {assistantText && (
          <div className="flex justify-start">
            <div className="min-w-0 max-w-[90%] space-y-3 text-sm">
              <p className="leading-relaxed">
                {assistantText}
                {phase === "typing-assistant" && <Cursor />}
              </p>

              {codeText && (
                <div className="overflow-hidden rounded-md border border-border">
                  <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">pine</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {saved ? (
                        <>
                          <BookmarkCheck className="size-3.5" /> Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="size-3.5" /> Save strategy
                        </>
                      )}
                    </span>
                  </div>
                  <SyntaxHighlighter
                    language="pine"
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      background: "transparent",
                      fontSize: "0.75rem",
                      padding: "0.875rem",
                      overflowX: "auto",
                    }}
                  >
                    {codeText}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Cursor() {
  return <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle" />;
}
