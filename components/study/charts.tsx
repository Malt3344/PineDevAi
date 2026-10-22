"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/quant/analysis";
import type { FanPoint } from "@/lib/quant/montecarlo";
import { formatMoney, formatPct } from "./format";

/**
 * The protocol's charts. Colour carries meaning, never identity: teal is
 * the strategy's own path or a gain, coral is a loss or a limit, and the
 * simulated band is neutral so it reads as "the range", not "a series".
 * Every chart has a hover readout, and every value in a tooltip is in text
 * ink beside a coloured swatch, so nothing depends on colour alone.
 */

const AXIS = {
  stroke: "var(--border)",
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

const GRID = { stroke: "var(--border)", strokeDasharray: "2 4", vertical: false } as const;

type Row = { label: string; value: string; swatch?: string };

function Readout({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{title}</p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {row.swatch && <span className="size-2 rounded-full" style={{ background: row.swatch }} />}
            {row.label}
          </span>
          <span className="font-mono tabular-nums text-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Account equity after each trade. One series, so the card title names it. */
export function EquityChart({ data, height = 220 }: { data: EquityPoint[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Equity curve">
      <ResponsiveContainer initialDimension={{ width: 600, height }}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="trade" {...AXIS} minTickGap={32} />
          <YAxis {...AXIS} width={52} tickFormatter={formatMoney} domain={["auto", "auto"]} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <Readout
                  title={`After trade ${payload[0].payload.trade}`}
                  rows={[{ label: "Equity", value: formatMoney(payload[0].payload.equity), swatch: "var(--primary)" }]}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * The Monte Carlo fan: the 5–95% and 25–75% bands of simulated equity, the
 * median, and — when given — an actual path laid over it. A path that
 * leaves the band is the chart's whole message, so it is the only teal.
 */
export function FanChart({
  fan,
  path,
  height = 240,
}: {
  fan: FanPoint[];
  path?: { trade: number; equity: number }[];
  height?: number;
}) {
  const byTrade = new Map<number, number>();
  path?.forEach((p) => byTrade.set(p.trade, p.equity - 1));
  const tradeCounts = new Set([...fan.map((f) => f.trade), ...(path?.map((p) => p.trade) ?? [])]);
  const fanByTrade = new Map(fan.map((f) => [f.trade, f]));

  const data = [...tradeCounts]
    .sort((a, b) => a - b)
    .map((trade) => {
      const f = fanByTrade.get(trade);
      return {
        trade,
        outer: f ? [f.p5 - 1, f.p95 - 1] : undefined,
        inner: f ? [f.p25 - 1, f.p75 - 1] : undefined,
        median: f ? f.p50 - 1 : undefined,
        actual: byTrade.get(trade),
      };
    });

  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Monte Carlo equity band">
      <ResponsiveContainer initialDimension={{ width: 600, height }}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="trade" type="number" domain={[0, "dataMax"]} {...AXIS} minTickGap={32} />
          <YAxis {...AXIS} width={52} tickFormatter={(v) => formatPct(v, 0)} />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.4} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as (typeof data)[number];
              const rows: Row[] = [];
              if (row.actual !== undefined)
                rows.push({ label: "Actual", value: formatPct(row.actual), swatch: "var(--primary)" });
              if (row.median !== undefined) rows.push({ label: "Median", value: formatPct(row.median) });
              if (row.outer)
                rows.push({ label: "5–95% band", value: `${formatPct(row.outer[0])} to ${formatPct(row.outer[1])}` });
              return <Readout title={`After trade ${row.trade}`} rows={rows} />;
            }}
          />
          <Area
            dataKey="outer"
            stroke="none"
            fill="var(--muted-foreground)"
            fillOpacity={0.12}
            isAnimationActive={false}
            connectNulls
          />
          <Area
            dataKey="inner"
            stroke="none"
            fill="var(--muted-foreground)"
            fillOpacity={0.22}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            dataKey="median"
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          {path && (
            <Line
              dataKey="actual"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** How deep simulated drawdowns went, with the user's own limit marked. */
export function DrawdownHistogram({
  bins,
  limit,
  p95,
  height = 200,
}: {
  bins: { from: number; to: number; count: number }[];
  limit: number;
  p95: number;
  height?: number;
}) {
  const total = bins.reduce((s, b) => s + b.count, 0) || 1;
  const data = bins.map((b) => ({ ...b, mid: (b.from + b.to) / 2, share: b.count / total }));
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Distribution of simulated maximum drawdowns">
      <ResponsiveContainer initialDimension={{ width: 600, height }}>
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid {...GRID} />
          {/* The limit is the point of the chart, so the axis always reaches it. */}
          <XAxis
            dataKey="mid"
            type="number"
            domain={[0, (dataMax: number) => Math.max(dataMax, limit * 1.08)]}
            {...AXIS}
            tickFormatter={(v) => formatPct(v, 0)}
          />
          <YAxis {...AXIS} width={40} tickFormatter={(v) => formatPct(v, 0)} dataKey="share" />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const b = payload[0].payload as (typeof data)[number];
              return (
                <Readout
                  title={`Drawdown ${formatPct(b.from, 0)}–${formatPct(b.to, 0)}`}
                  rows={[{ label: "Share of paths", value: formatPct(b.share) }]}
                />
              );
            }}
          />
          <Bar dataKey="share" fill="var(--muted-foreground)" fillOpacity={0.55} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <ReferenceLine
            x={p95}
            stroke="var(--foreground)"
            strokeDasharray="3 3"
            label={{ value: "95th pct.", position: "top", fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <ReferenceLine
            x={limit}
            stroke="var(--destructive)"
            strokeWidth={1.5}
            label={{ value: "Your limit", position: "insideTopRight", fill: "var(--destructive)", fontSize: 11 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Net P&L per calendar period. Sign is encoded twice — colour and direction from zero. */
export function PeriodBars({ periods, height = 200 }: { periods: { label: string; pnl: number }[]; height?: number }) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Net P&L by period">
      <ResponsiveContainer initialDimension={{ width: 600, height }}>
        <BarChart data={periods} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} minTickGap={16} />
          <YAxis {...AXIS} width={52} tickFormatter={formatMoney} />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <Readout
                  title={payload[0].payload.label}
                  rows={[
                    {
                      label: "Net P&L",
                      value: formatMoney(payload[0].payload.pnl),
                      swatch: payload[0].payload.pnl >= 0 ? "var(--primary)" : "var(--destructive)",
                    },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="pnl" radius={[4, 4, 4, 4]} isAnimationActive={false}>
            {periods.map((p) => (
              <Cell key={p.label} fill={p.pnl >= 0 ? "var(--primary)" : "var(--destructive)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
