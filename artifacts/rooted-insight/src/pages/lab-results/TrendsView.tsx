import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { FadeIn, Card, CardContent } from "@/components/shared/UI";
import { TrendingUp, TrendingDown, Minus, Info, ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Marker {
  name: string;
  value: number;
  unit: string;
  referenceRangeLow?: number | null;
  referenceRangeHigh?: number | null;
  status: string;
}

interface LabResult {
  id: number;
  testName: string;
  testDate: string;
  markers: Marker[];
}

interface MarkerTrend {
  name: string;
  unit: string;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  points: {
    dateLabel: string;
    date: string;
    value: number;
    status: string;
    testName: string;
  }[];
}

type TrendStatus =
  | "improving"
  | "worsening"
  | "stable-good"
  | "stable-caution"
  | "neutral";

// ─── Trend Logic ──────────────────────────────────────────────────────────────

const STATUS_RANK: Record<string, number> = {
  normal: 0,
  low: 1,
  high: 1,
  "critical-low": 2,
  "critical-high": 2,
};

function distanceToRange(val: number, low: number, high: number): number {
  if (val >= low && val <= high) return 0;
  return val < low ? low - val : val - high;
}

function getTrendStatus(trend: MarkerTrend): TrendStatus {
  if (trend.points.length < 2) return "neutral";
  const first = trend.points[0];
  const last = trend.points[trend.points.length - 1];
  const firstRank = STATUS_RANK[first.status] ?? 1;
  const lastRank = STATUS_RANK[last.status] ?? 1;

  if (
    trend.referenceRangeLow != null &&
    trend.referenceRangeHigh != null
  ) {
    const low = trend.referenceRangeLow;
    const high = trend.referenceRangeHigh;
    if (lastRank === 0 && firstRank === 0) return "stable-good";
    if (lastRank === 0 && firstRank > 0) return "improving";
    if (lastRank > 0 && firstRank === 0) return "worsening";
    const d1 = distanceToRange(first.value, low, high);
    const d2 = distanceToRange(last.value, low, high);
    if (d2 < d1 - 0.001) return "improving";
    if (d2 > d1 + 0.001) return "worsening";
    return "stable-caution";
  }

  // No reference range — use status ranks
  if (lastRank < firstRank) return "improving";
  if (lastRank > firstRank) return "worsening";
  return lastRank === 0 ? "stable-good" : "stable-caution";
}

const TREND_CONFIG: Record<
  TrendStatus,
  {
    line: string;
    refBand: string;
    badge: string;
    badgeText: string;
    badgeBorder: string;
    label: string;
    icon: React.ReactNode;
    dotColor: (status: string) => string;
  }
> = {
  improving: {
    line: "#16a34a",
    refBand: "#16a34a",
    badge: "#dcfce7",
    badgeText: "#15803d",
    badgeBorder: "#86efac",
    label: "Improving",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    dotColor: () => "#16a34a",
  },
  "stable-good": {
    line: "#16a34a",
    refBand: "#16a34a",
    badge: "#dcfce7",
    badgeText: "#15803d",
    badgeBorder: "#86efac",
    label: "Stable",
    icon: <Minus className="w-3.5 h-3.5" />,
    dotColor: () => "#16a34a",
  },
  "stable-caution": {
    line: "#d97706",
    refBand: "#22c55e",
    badge: "#fef3c7",
    badgeText: "#92400e",
    badgeBorder: "#fcd34d",
    label: "Monitor",
    icon: <ArrowRight className="w-3.5 h-3.5" />,
    dotColor: (s) =>
      s === "normal" ? "#16a34a" : s.includes("critical") ? "#ef4444" : "#d97706",
  },
  worsening: {
    line: "#dc2626",
    refBand: "#22c55e",
    badge: "#fee2e2",
    badgeText: "#991b1b",
    badgeBorder: "#fca5a5",
    label: "Worsening",
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    dotColor: (s) =>
      s === "normal" ? "#16a34a" : s.includes("critical") ? "#7f1d1d" : "#dc2626",
  },
  neutral: {
    line: "#C9A84C",
    refBand: "#22c55e",
    badge: "#f1f5f9",
    badgeText: "#64748b",
    badgeBorder: "#e2e8f0",
    label: "—",
    icon: <Minus className="w-3.5 h-3.5" />,
    dotColor: (s) =>
      s === "normal" ? "#16a34a" : s.includes("critical") ? "#ef4444" : "#d97706",
  },
};

// ─── Build trends from raw data ───────────────────────────────────────────────

function buildTrends(labResults: LabResult[]): MarkerTrend[] {
  const byName = new Map<string, MarkerTrend>();
  const sorted = [...labResults].sort(
    (a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
  );
  for (const result of sorted) {
    for (const marker of result.markers ?? []) {
      const key = marker.name.toLowerCase().trim();
      if (!byName.has(key)) {
        byName.set(key, {
          name: marker.name,
          unit: marker.unit ?? "",
          referenceRangeLow: marker.referenceRangeLow ?? null,
          referenceRangeHigh: marker.referenceRangeHigh ?? null,
          points: [],
        });
      }
      const t = byName.get(key)!;
      t.points.push({
        dateLabel: new Date(result.testDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        }),
        date: result.testDate,
        value: marker.value,
        status: marker.status,
        testName: result.testName,
      });
      if (!t.referenceRangeLow && marker.referenceRangeLow)
        t.referenceRangeLow = marker.referenceRangeLow;
      if (!t.referenceRangeHigh && marker.referenceRangeHigh)
        t.referenceRangeHigh = marker.referenceRangeHigh;
    }
  }
  return Array.from(byName.values()).sort((a, b) => b.points.length - a.points.length);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const cfg = TREND_CONFIG[getTrendStatus({ ...d.__trend }) as TrendStatus];
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl px-4 py-3 text-sm max-w-[200px]">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-xs text-muted-foreground mb-1.5">{d.testName}</p>
      <p className="font-bold text-base" style={{ color: payload[0].stroke }}>
        {d.value}
        {d.unit && <span className="text-xs font-normal text-muted-foreground ml-1">{d.unit}</span>}
      </p>
      <span
        className="inline-block mt-1 text-xs font-medium capitalize px-2 py-0.5 rounded-full"
        style={{ background: cfg?.badge, color: cfg?.badgeText }}
      >
        {d.status?.replace("-", " ")}
      </span>
    </div>
  );
};

// ─── Custom Dot ───────────────────────────────────────────────────────────────

const CustomDot = (props: any) => {
  const { cx, cy, payload, trendStatus } = props;
  if (!cx || !cy) return null;
  const cfg = TREND_CONFIG[trendStatus as TrendStatus] ?? TREND_CONFIG.neutral;
  const color = cfg.dotColor(payload.status);
  return (
    <circle cx={cx} cy={cy} r={5.5} fill={color} stroke="white" strokeWidth={1.5} />
  );
};

// ─── Single Chart Card ────────────────────────────────────────────────────────

function TrendCard({ trend }: { trend: MarkerTrend }) {
  const trendStatus = getTrendStatus(trend);
  const cfg = TREND_CONFIG[trendStatus];
  const latest = trend.points[trend.points.length - 1];
  const first = trend.points[0];
  const isMulti = trend.points.length > 1;
  const delta = isMulti
    ? (((latest.value - first.value) / (Math.abs(first.value) || 1)) * 100).toFixed(1)
    : null;

  // Y domain
  const vals = trend.points.map((p) => p.value);
  const refs = [trend.referenceRangeLow, trend.referenceRangeHigh].filter(
    (v) => v != null
  ) as number[];
  const allVals = [...vals, ...refs];
  const minY = Math.min(...allVals);
  const maxY = Math.max(...allVals);
  const pad = (maxY - minY) * 0.22 || Math.abs(maxY) * 0.15 || 1;
  const domain: [number, number] = [Math.max(0, minY - pad), maxY + pad];

  const chartData = trend.points.map((p) => ({
    ...p,
    unit: trend.unit,
  }));

  return (
    <FadeIn>
      <Card
        className="overflow-hidden border-none bg-white shadow-sm hover:shadow-lg transition-all duration-300"
        style={{
          borderLeft: `4px solid ${cfg.line}`,
        }}
      >
        <CardContent className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-base truncate">{trend.name}</h3>
                {/* Traffic-light badge */}
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: cfg.badge,
                    color: cfg.badgeText,
                    borderColor: cfg.badgeBorder,
                  }}
                >
                  {cfg.icon}
                  {cfg.label}
                </span>
              </div>
              {trend.referenceRangeLow != null && trend.referenceRangeHigh != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Healthy range: {trend.referenceRangeLow}–{trend.referenceRangeHigh}{" "}
                  {trend.unit}
                </p>
              )}
            </div>
            {/* Latest value */}
            <div className="ml-3 text-right flex-shrink-0">
              <p
                className="text-2xl font-bold leading-tight"
                style={{ color: cfg.line }}
              >
                {latest.value}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {trend.unit}
                </span>
              </p>
              {/* Delta indicator */}
              {isMulti && delta !== null && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-1"
                  style={{ color: cfg.badgeText }}
                >
                  {cfg.icon}
                  {Number(delta) > 0 ? "+" : ""}
                  {delta}% since first
                </span>
              )}
            </div>
          </div>

          {/* Chart or single-point placeholder */}
          {isMulti ? (
            <div
              className="rounded-xl p-1"
              style={{ background: cfg.badge + "55" }}
            >
              <ResponsiveContainer width="100%" height={160}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={domain}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {/* Healthy reference band */}
                  {trend.referenceRangeLow != null &&
                    trend.referenceRangeHigh != null && (
                      <ReferenceArea
                        y1={trend.referenceRangeLow}
                        y2={trend.referenceRangeHigh}
                        fill={cfg.refBand}
                        fillOpacity={0.1}
                        ifOverflow="visible"
                      />
                    )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={cfg.line}
                    strokeWidth={2.5}
                    dot={(dotProps: any) => (
                      <CustomDot {...dotProps} trendStatus={trendStatus} />
                    )}
                    activeDot={{ r: 7, stroke: "white", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-5"
              style={{ background: cfg.badge + "66" }}
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: cfg.line }}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                One reading so far — add more tests to reveal a trend
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground mt-3 text-right">
            {trend.points.length} reading{trend.points.length !== 1 ? "s" : ""}
            {isMulti && (
              <>
                {" · "}
                {first.dateLabel} → {latest.dateLabel}
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  labResults: LabResult[];
}

export default function TrendsView({ labResults }: Props) {
  const trends = useMemo(() => buildTrends(labResults), [labResults]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | TrendStatus>("all");

  const withStatus = useMemo(
    () => trends.map((t) => ({ trend: t, status: getTrendStatus(t) })),
    [trends]
  );

  const filtered = withStatus.filter(({ trend, status }) => {
    const matchSearch =
      !searchTerm || trend.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === "all" || status === filter;
    return matchSearch && matchFilter;
  });

  // Sort: worsening first, then stable-caution, then improving/stable-good
  const SORT_ORDER: Record<TrendStatus, number> = {
    worsening: 0,
    "stable-caution": 1,
    improving: 2,
    "stable-good": 3,
    neutral: 4,
  };
  filtered.sort((a, b) => SORT_ORDER[a.status] - SORT_ORDER[b.status]);

  if (labResults.length === 0) {
    return (
      <FadeIn className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2rem] border border-dashed border-border">
        <TrendingUp className="w-12 h-12 text-primary/30 mb-4" />
        <h3 className="text-2xl font-display mb-2">No trends yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Add lab results over time and your marker trends will appear here as color-coded charts.
        </p>
      </FadeIn>
    );
  }

  // Count per status
  const counts = {
    worsening: withStatus.filter((x) => x.status === "worsening").length,
    caution: withStatus.filter((x) => x.status === "stable-caution").length,
    good: withStatus.filter(
      (x) => x.status === "improving" || x.status === "stable-good"
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Improving / Stable",
            count: counts.good,
            bg: "#dcfce7",
            text: "#15803d",
            border: "#86efac",
            icon: <TrendingUp className="w-4 h-4" />,
          },
          {
            label: "Monitor",
            count: counts.caution,
            bg: "#fef3c7",
            text: "#92400e",
            border: "#fcd34d",
            icon: <ArrowRight className="w-4 h-4" />,
          },
          {
            label: "Worsening",
            count: counts.worsening,
            bg: "#fee2e2",
            text: "#991b1b",
            border: "#fca5a5",
            icon: <TrendingDown className="w-4 h-4" />,
          },
        ].map(({ label, count, bg, text, border, icon }) => (
          <div
            key={label}
            className="rounded-2xl p-4 text-center border"
            style={{ backgroundColor: bg, borderColor: border }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1" style={{ color: text }}>
              {icon}
              <span className="text-2xl font-bold">{count}</span>
            </div>
            <p className="text-xs font-medium" style={{ color: text }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          placeholder="Search markers…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 h-10 px-4 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1">
          {(
            [
              ["all", "All"],
              ["worsening", "🔴"],
              ["stable-caution", "🟡"],
              ["improving", "🟢"],
            ] as [string, string][]
          ).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val as any)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all font-medium ${
                filter === val
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No markers match your filter</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(({ trend }) => (
          <TrendCard key={trend.name} trend={trend} />
        ))}
      </div>
    </div>
  );
}
