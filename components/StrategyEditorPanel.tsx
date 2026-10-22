"use client";

import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bookmark, BookmarkCheck, Check, Copy, FileCode, History, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type DocumentVersion = { createdAt: string; content: string };

/** "2 hours ago", "3 days ago", etc — coarse, good enough for a version list. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * The highlighted layer and the textarea must lay out identically, glyph
 * for glyph, or the caret drifts away from the text under it. Every metric
 * that affects that is declared once here and applied to both.
 */
const CODE_METRICS = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  fontSize: "0.8125rem",
  lineHeight: "1.375rem",
  tabSize: 4,
} as const;

const EDITOR_PADDING = "1rem 1.25rem";

/**
 * The code panel. Editable: the agent writes the first draft, and you fix
 * the last 5% by hand rather than asking for another round trip. What you
 * copy and what you save is what is on screen, edits included.
 *
 * Built as a transparent textarea sitting exactly on top of a highlighted
 * copy of the same text — the standard way to get syntax colouring and a
 * real caret without shipping a full editor engine. The two layers share
 * CODE_METRICS and scroll as one.
 *
 * Run stays disabled because PineDev cannot execute Pine Script; only
 * TradingView's own editor can.
 */
export function StrategyEditorPanel({
  code,
  fileName,
  onSave,
  documentId,
}: {
  code: string | null;
  fileName: string;
  onSave?: (code: string) => Promise<void>;
  /** Once a document exists for this editing session, its id — enables
   * the version-history dropdown. Null before the first successful save. */
  documentId?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [draft, setDraft] = useState(code ?? "");
  const [versions, setVersions] = useState<DocumentVersion[] | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // A new script from the agent replaces the draft. Local edits are only
  // ever lost by the agent writing a newer one, which is the moment the
  // old text stopped being what the conversation is about.
  useEffect(() => {
    setDraft(code ?? "");
  }, [code]);

  // A fresh document (or none yet) invalidates whatever version list was
  // fetched for the previous one.
  useEffect(() => {
    setVersions(null);
  }, [documentId]);

  async function loadVersions() {
    if (!documentId || versionsLoading) return;
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) throw new Error("Failed to load versions");
      const data: { versions: DocumentVersion[] } = await res.json();
      setVersions(data.versions);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  /** Loads a past version into the draft. Does not save — Save is still a
   * separate, explicit step, so looking at an old version is never
   * mistaken for restoring it. */
  function handleSelectVersion(version: DocumentVersion) {
    setDraft(version.content);
  }

  /** Keeps the colour layer and the line numbers under the caret. */
  function syncScroll() {
    const ta = textareaRef.current;
    if (!ta) return;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  }

  /** Tab indents instead of leaving the editor — Pine is indentation-sensitive. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const ta = event.currentTarget;
    const { selectionStart, selectionEnd } = ta;
    const next = draft.slice(0, selectionStart) + "    " + draft.slice(selectionEnd);
    setDraft(next);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = selectionStart + 4;
    });
  }

  async function handleCopy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSave() {
    if (!draft || !onSave || saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      await onSave(draft);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }
  }

  const saveLabel =
    saveStatus === "saved"
      ? "Saved"
      : saveStatus === "error"
        ? "Failed"
        : saveStatus === "saving"
          ? "Saving…"
          : "Save strategy";
  const copyLabel = copied ? "Copied" : "Copy";

  return (
    // w-full min-w-0: as a flex child this panel defaults to
    // min-width:auto and would otherwise stretch to its widest line of
    // code, dragging the whole phone layout wider than the screen.
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface-raised pr-2">
        {/* The tab gives way; the actions do not. On a phone the filename
            would otherwise push Save, Copy and Run off the right edge, where
            they cannot be reached at all. */}
        {/* The tab reads as the front-most sheet: it carries the accent and
            the base surface, while the bar behind it is raised. */}
        <div className="relative flex h-full min-w-0 items-center gap-2 border-r border-border bg-background px-4 text-[0.8125rem] font-medium">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
          <FileCode className="size-4 shrink-0 text-primary/70" />
          <span className="truncate">{fileName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 px-2">
          {code && onSave && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              aria-label={saveLabel}
              className="size-11 sm:h-7 sm:w-auto"
            >
              {saveStatus === "saved" ? <BookmarkCheck /> : <Bookmark />}
              <span className="hidden sm:inline">{saveLabel}</span>
            </Button>
          )}
          {documentId && (
            <DropdownMenu onOpenChange={(open) => open && loadVersions()}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Version history"
                  className="size-11 sm:h-7 sm:w-auto"
                >
                  <History />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {versionsLoading && !versions ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</div>
                ) : !versions || versions.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No saved versions yet.</div>
                ) : (
                  versions.map((version, i) => (
                    <DropdownMenuItem
                      key={version.createdAt}
                      onClick={() => handleSelectVersion(version)}
                    >
                      {i === 0 ? "Current" : relativeTime(version.createdAt)}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {code && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              aria-label={copyLabel}
              className="size-11 sm:h-7 sm:w-auto"
            >
              {copied ? <Check /> : <Copy />}
              <span className="hidden sm:inline">{copyLabel}</span>
            </Button>
          )}
          <Tooltip>
            {/* aria-disabled rather than the native attribute: a natively
                disabled button swallows pointer events, and the tooltip is
                the only place that explains why Run cannot work here. */}
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-disabled="true"
                aria-label="Run"
                onClick={(e) => e.preventDefault()}
                className="size-11 opacity-50 sm:h-7 sm:w-auto"
              >
                <Play />
                <span className="hidden sm:inline">Run</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Pine Script only runs inside TradingView&apos;s own editor — paste the
              script there to run it
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {code !== null ? (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Line numbers: their own column, so the two text layers below
              can share one origin and stay aligned. */}
          <div
            ref={gutterRef}
            aria-hidden="true"
            className="shrink-0 overflow-hidden text-right select-none"
            style={{ ...CODE_METRICS, padding: EDITOR_PADDING, paddingRight: "0.75rem", minWidth: "3.5rem" }}
          >
            {draft.split("\n").map((_, i) => (
              <div key={i} className="text-muted-foreground/35 tabular-nums">
                {i + 1}
              </div>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Colour underneath, inert to the pointer. */}
            <div
              ref={highlightRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <SyntaxHighlighter
                language="pine"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  background: "transparent",
                  padding: EDITOR_PADDING,
                  minHeight: "100%",
                  ...CODE_METRICS,
                }}
                codeTagProps={{ style: { ...CODE_METRICS } }}
              >
                {draft + "\n"}
              </SyntaxHighlighter>
            </div>

            {/* The real thing: transparent text, visible caret, and the
                element that actually scrolls. */}
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onScroll={syncScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label={`${fileName} source`}
              className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent text-transparent caret-primary outline-none selection:bg-primary/30"
              style={{ ...CODE_METRICS, padding: EDITOR_PADDING }}
            />
          </div>
        </div>
      ) : (
        <EmptyState
          className="flex-1"
          icon={FileCode}
          title="No script yet"
          description="Describe the strategy in the chat and the agent writes it here. You can edit it directly once it lands."
        />
      )}
    </div>
  );
}
