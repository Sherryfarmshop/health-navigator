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
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

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
  points: { dateLabel: string; date: string; value: number; status: string; testName: string }[];
}

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
      const trend = byName.get(key)!;
      trend.points.push({
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
      if (!trend.referenceRangeLow && marker.referenceRangeLow)
        trend.referenceRangeLow = marker.referenceRangeLow;
      if (!trend.referenceRangeHigh && marker.referenceRangeHigh)
        trend.referenceRangeHigh = marker.referenceRangeHigh;
    }
  }
  return Array.from(byName.values()).sort((a, b) => b.points.length - a.points.length);
}

function statusColor(status: string) {
  if (status === "normal") return "#22c55e";
  if (status.includes("critical")) return "#ef4444";
  return "#f59e0b";
}

function TrendBadge({ first, last }: { first: number; last: number }) {
  const delta = last - first;
  const pct = first !== 0 ? ((delta / first) * 100).toFixed(1) : "0";
  if (Math.abs(delta) < 0.001) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> Stable
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-semibold ${
        up ? "text-amber-600" : "text-blue-600"
      }`}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const color = statusColor(payload.status);
  return (
    <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={1.5} />
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = statusColor(d.status);
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl px-4 py-3 text-sm max-w-[200px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-xs text-muted-foreground mb-1">{d.testName}</p>
      <p className="font-bold text-base" style={{ color }}>
        {d.value} {payload[0]?.unit}
      </p>
      <p className="capitalize text-xs mt-0.5" style={{ color }}>
        {d.status.replace("-", " ")}
      </p>
    </div>
  );
};

interface Props {
  labResults: LabResult[];
}

export default function TrendsView({ labResults }: Props) {
  const trends = useMemo(() => buildTrends(labResults), [labResults]);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = searchTerm
    ? trends.filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : trends;

  if (labResults.length === 0) {
    return (
      <FadeIn className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2rem] border border-dashed border-border">
        <TrendingUp className="w-12 h-12 text-primary/30 mb-4" />
        <h3 className="text-2xl font-display mb-2">No trends yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Add lab results over time and your marker trends will appear here as charts.
        </p>
      </FadeIn>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search markers…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-11 pl-4 pr-4 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No markers match "{searchTerm}"</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((trend) => {
          const latest = trend.points[trend.points.length - 1];
          const first = trend.points[0];
          const isMulti = trend.points.length > 1;
          const latestColor = statusColor(latest.status);

          // Compute Y domain with padding
          const vals = trend.points.map((p) => p.value);
          const refs = [
            trend.referenceRangeLow,
            trend.referenceRangeHigh,
          ].filter((v) => v != null) as number[];
          const allVals = [...vals, ...refs];
          const minY = Math.min(...allVals);
          const maxY = Math.max(...allVals);
          const pad = (maxY - minY) * 0.2 || maxY * 0.1 || 1;
          const domain: [number, number] = [
            Math.max(0, minY - pad),
            maxY + pad,
          ];

          return (
            <FadeIn key={trend.name}>
              <Card className="overflow-hidden border-border bg-white hover:shadow-lg transition-all duration-300">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-base truncate">{trend.name}</h3>
                      {trend.referenceRangeLow != null && trend.referenceRangeHigh != null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ref: {trend.referenceRangeLow}–{trend.referenceRangeHigh} {trend.unit}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <span className="font-bold text-xl" style={{ color: latestColor }}>
                        {latest.value}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          {trend.unit}
                        </span>
                      </span>
                      {isMulti && (
                        <TrendBadge first={first.value} last={latest.value} />
                      )}
                    </div>
                  </div>

                  {/* Chart */}
                  {isMulti ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart
                        data={trend.points.map((p) => ({ ...p, unit: trend.unit }))}
                        margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
                          width={40}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {trend.referenceRangeLow != null && trend.referenceRangeHigh != null && (
                          <ReferenceArea
                            y1={trend.referenceRangeLow}
                            y2={trend.referenceRangeHigh}
                            fill="#22c55e"
                            fillOpacity={0.08}
                            ifOverflow="visible"
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#C9A84C"
                          strokeWidth={2.5}
                          dot={<CustomDot />}
                          activeDot={{ r: 7, stroke: "white", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-20 gap-2 bg-muted/30 rounded-xl">
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: latestColor }}
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        One reading so far — add more to see a trend
                      </p>
                    </div>
                  )}

                  {/* Data points count */}
                  <p className="text-xs text-muted-foreground mt-3 text-right">
                    {trend.points.length} reading{trend.points.length !== 1 ? "s" : ""}
                    {isMulti && (
                      <> · {first.dateLabel} → {latest.dateLabel}</>
                    )}
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
