/**
 * One closed trade, the unit every test in the protocol is computed from.
 * Stored as-is (jsonb) on trade_run, so the field names are short on
 * purpose — a run can hold thousands of these.
 */
export type Trade = {
  /** Entry time, ISO string. Null when the source only had one timestamp. */
  e: string | null;
  /** Exit time, ISO string. Trades are ordered by this. */
  t: string;
  d: "long" | "short";
  /** Net profit in account currency, after the costs the backtest charged. */
  p: number;
  /** Position value at entry, when the export has it — what cost stress is
   * charged against. Null when unknown. */
  v: number | null;
};

export const MAX_TRADES_PER_RUN = 5000;

export type ParseResult =
  | { ok: true; trades: Trade[]; format: "tradingview" | "generic"; skipped: number }
  | { ok: false; error: string };

/**
 * TradingView exports minus signs as U+2212 in some locales, and thousands
 * separators as commas or narrow spaces. A trade whose P&L silently parsed
 * as NaN — or worse, as a positive number — would poison every statistic
 * downstream, so numbers are normalised before parsing, not after.
 */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim().replace(/[−‒–]/g, "-").replace(/[\s  ]/g, "");
  if (!s) return null;
  // "(123.45)" is accounting notation for a negative number.
  const parenthesised = /^\((.*)\)$/.exec(s);
  if (parenthesised) s = `-${parenthesised[1]}`;
  s = s.replace(/[$€£¥%]/g, "");
  // "1.234,56" (comma decimal) vs "1,234.56" (comma thousands): whichever
  // separator comes last is the decimal point.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Accepts "2024-01-02 09:30", ISO strings, and "02/01/2024"-style dates. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  // TradingView's "YYYY-MM-DD HH:mm" has no zone; treat it as UTC so the
  // same file parses to the same instants on every machine.
  const tv = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (tv) {
    const [, y, mo, d, h = "00", mi = "00", sec = "00"] = tv;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec)).toISOString();
  }
  const slash = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s);
  if (slash) {
    const [, a, b, y, h = "0", mi = "0"] = slash;
    // Ambiguous day/month: assume month-first unless that is impossible.
    const [month, day] = +a > 12 ? [+b, +a] : [+a, +b];
    return new Date(Date.UTC(+y, month - 1, day, +h, +mi)).toISOString();
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Minimal RFC 4180 reader: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
  const delimiter = [",", ";", "\t"]
    .map((d) => ({ d, n: firstLine.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

function findColumn(headers: string[], test: (h: string) => boolean): number {
  return headers.findIndex(test);
}

const isPnlHeader = (h: string) =>
  /(net p&l|profit|p&l|pnl|net profit)/.test(h) && !/%|cum|run-up|drawdown/.test(h);

/**
 * Reads a trade list. Two shapes are understood:
 *
 * - TradingView's Strategy Tester export ("List of trades" → Export). Each
 *   trade is two rows sharing a "Trade #" — an entry row and an exit row —
 *   and column names have changed between TradingView releases ("Profit
 *   USD" became "Net P&L USD"), so columns are found by pattern, not name.
 * - A generic one-row-per-trade CSV with a date column and a P&L column,
 *   for anyone exporting from somewhere else.
 *
 * Open trades (an entry with no exit yet) are skipped: their P&L is
 * unrealised and would change between two exports of the same backtest.
 */
export function parseTradeList(text: string): ParseResult {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (rows.length < 2) {
    return { ok: false, error: "The file has no data rows." };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const tradeCol = findColumn(headers, (h) => /^trade\s*(#|no|number|id)?$/.test(h));
  const typeCol = findColumn(headers, (h) => h === "type");
  const dateCol = findColumn(headers, (h) => /date|time/.test(h));
  const pnlCol = findColumn(headers, isPnlHeader);
  const valueCol = findColumn(headers, (h) => /position size \(value\)|position value|notional/.test(h));
  const signalCol = findColumn(headers, (h) => h === "signal");
  const dirCol = findColumn(headers, (h) => /^(direction|side)$/.test(h));

  if (dateCol === -1 || pnlCol === -1) {
    return {
      ok: false,
      error:
        "Couldn't find a date column and a P&L column. Export the trade list from TradingView's Strategy Tester (List of trades → Export), or use a CSV with a date and a profit column.",
    };
  }

  const trades: Trade[] = [];
  let skipped = 0;

  if (tradeCol !== -1 && typeCol !== -1) {
    type Partial = { entry?: string[]; exit?: string[] };
    const byTrade = new Map<string, Partial>();
    for (const row of rows.slice(1)) {
      const id = row[tradeCol]?.trim();
      if (!id) continue;
      const type = (row[typeCol] ?? "").toLowerCase();
      const slot = byTrade.get(id) ?? {};
      if (type.includes("entry")) slot.entry = row;
      else if (type.includes("exit")) slot.exit = row;
      byTrade.set(id, slot);
    }

    for (const { entry, exit } of byTrade.values()) {
      const signal = signalCol === -1 ? "" : (exit?.[signalCol] ?? "").toLowerCase();
      if (!exit || signal === "open") {
        skipped++;
        continue;
      }
      const t = parseDate(exit[dateCol]);
      const p = parseNumber(exit[pnlCol]) ?? parseNumber(entry?.[pnlCol]);
      if (!t || p === null) {
        skipped++;
        continue;
      }
      const type = (exit[typeCol] ?? "").toLowerCase();
      trades.push({
        e: entry ? parseDate(entry[dateCol]) : null,
        t,
        d: type.includes("short") ? "short" : "long",
        p,
        v: valueCol === -1 ? null : Math.abs(parseNumber((entry ?? exit)[valueCol]) ?? 0) || null,
      });
    }
  } else {
    for (const row of rows.slice(1)) {
      const t = parseDate(row[dateCol]);
      const p = parseNumber(row[pnlCol]);
      if (!t || p === null) {
        skipped++;
        continue;
      }
      const dir = dirCol === -1 ? "" : (row[dirCol] ?? "").toLowerCase();
      trades.push({
        e: null,
        t,
        d: /short|sell/.test(dir) ? "short" : "long",
        p,
        v: valueCol === -1 ? null : Math.abs(parseNumber(row[valueCol]) ?? 0) || null,
      });
    }
  }

  if (trades.length === 0) {
    return { ok: false, error: "No closed trades found in that file." };
  }
  if (trades.length > MAX_TRADES_PER_RUN) {
    return {
      ok: false,
      error: `That run has ${trades.length} trades; the limit is ${MAX_TRADES_PER_RUN}. Narrow the date range.`,
    };
  }

  trades.sort((a, b) => a.t.localeCompare(b.t));
  return {
    ok: true,
    trades,
    format: tradeCol !== -1 && typeCol !== -1 ? "tradingview" : "generic",
    skipped,
  };
}
