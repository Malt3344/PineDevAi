"use client";

import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, TriangleAlert, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadRun } from "@/app/(app)/studies/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { parseTradeList, type Trade } from "@/lib/quant/trades";
import { tradesOutsideWindow, type RunStage } from "@/lib/quant/protocol";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney, formatPct } from "./format";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

type Parsed = { fileName: string; trades: Trade[]; skipped: number; format: string };

/**
 * Drop a trade list, see what was read, then commit it. Parsing happens
 * here so a wrong file is caught before it becomes a run — an in-sample
 * upload counts as a trial, and a mistaken one cannot be taken back.
 */
export function RunUpload({
  chatId,
  stage,
  window,
  disabledReason,
}: {
  chatId: string;
  stage: RunStage;
  window?: { start: string; end: string };
  disabledReason?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  async function readFile(file: File) {
    setError(null);
    setParsed(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is larger than 4 MB. Narrow the backtest's date range.");
      return;
    }
    const result = parseTradeList(await file.text());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setParsed({ fileName: file.name, trades: result.trades, skipped: result.skipped, format: result.format });
  }

  function commit() {
    if (!parsed) return;
    startTransition(async () => {
      const result = await uploadRun(chatId, { stage, fileName: parsed.fileName, trades: parsed.trades });
      if (result.ok) {
        toast.success(`${parsed.trades.length} trades uploaded`);
        setParsed(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (disabledReason) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {disabledReason}
      </div>
    );
  }

  const outside = parsed && window ? tradesOutsideWindow(parsed.trades.map((t) => t.t), window.start, window.end) : 0;
  const net = parsed?.trades.reduce((s, t) => s + t.p, 0) ?? 0;

  return (
    <div className="space-y-3">
      {!parsed && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void readFile(file);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          <Upload className="size-5 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">Drop the trade list CSV, or click to choose</span>
          <span className="max-w-md text-xs text-muted-foreground">
            TradingView: Strategy Tester → List of trades → Export. Any CSV with a date and a
            profit column also works.
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        aria-label="Trade list file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void readFile(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {parsed && (
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileSpreadsheet className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate text-sm font-medium">{parsed.fileName}</span>
            </div>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setParsed(null)} aria-label="Discard file">
              <X />
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-mono text-foreground tabular-nums">{parsed.trades.length}</span> closed trades,{" "}
            {formatDate(parsed.trades[0].t)} – {formatDate(parsed.trades[parsed.trades.length - 1].t)}, net{" "}
            <span className="font-mono text-foreground tabular-nums">{formatMoney(net)}</span>
            {parsed.skipped > 0 && <> · {parsed.skipped} open or unreadable rows skipped</>}
          </p>
          {outside > 0 && (
            <p className="mt-2 flex items-start gap-2 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {formatPct(outside, 0)} of these trades close outside the pre-registered{" "}
              {stage === "in_sample" ? "in-sample" : stage === "out_of_sample" ? "out-of-sample" : ""} window (
              {window?.start} to {window?.end}). Check the Window start/end inputs in the script.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
              Choose another
            </Button>
            <Button
              onClick={() => (stage === "out_of_sample" ? setConfirming(true) : commit())}
              disabled={pending}
            >
              {pending ? "Uploading…" : stage === "in_sample" ? "Record as a trial" : "Upload"}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open the sealed data?</AlertDialogTitle>
            <AlertDialogDescription>
              The out-of-sample test only means something the first time. Once you have seen
              this result, any change you make and re-test is fitted to it. Uploading again later
              is recorded and lowers the verdict.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false);
                commit();
              }}
            >
              Run the one-shot test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
