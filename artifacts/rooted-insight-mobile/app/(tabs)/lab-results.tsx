import { Feather } from "@expo/vector-icons";
import { useGetLabResults, useDeleteLabResult } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import Colors from "@/constants/colors";

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
  analysis?: any;
}

interface MarkerTrend {
  name: string;
  unit: string;
  referenceRangeLow: number | null;
  referenceRangeHigh: number | null;
  points: { date: string; dateLabel: string; value: number; status: string; testName: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  if (status === "normal") return Colors.success;
  if (status.includes("critical")) return Colors.danger;
  return Colors.warning;
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
        date: result.testDate,
        dateLabel: new Date(result.testDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
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

// ─── SVG Mini Chart ───────────────────────────────────────────────────────────

function MarkerChart({ trend, width }: { trend: MarkerTrend; width: number }) {
  const height = 90;
  const padX = 14;
  const padY = 14;
  const chartW = width - 2 * padX;
  const chartH = height - 2 * padY;

  const vals = trend.points.map((p) => p.value);
  const refs = [trend.referenceRangeLow, trend.referenceRangeHigh].filter(
    (v) => v != null
  ) as number[];
  const allVals = [...vals, ...refs];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = (rawMax - rawMin) * 0.2 || Math.abs(rawMax) * 0.15 || 1;
  const minVal = rawMin - pad;
  const maxVal = rawMax + pad;
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    padX + (trend.points.length === 1 ? chartW / 2 : (i / (trend.points.length - 1)) * chartW);
  const toY = (v: number) => padY + (1 - (v - minVal) / range) * chartH;

  const linePath = trend.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
    .join(" ");

  const refY1 =
    trend.referenceRangeHigh != null ? toY(trend.referenceRangeHigh) : null;
  const refY2 =
    trend.referenceRangeLow != null ? toY(trend.referenceRangeLow) : null;

  return (
    <Svg width={width} height={height}>
      {/* Reference range band */}
      {refY1 != null && refY2 != null && (
        <Rect
          x={padX}
          y={Math.min(refY1, refY2)}
          width={chartW}
          height={Math.abs(refY2 - refY1)}
          fill={Colors.success}
          fillOpacity={0.1}
          rx={3}
        />
      )}
      {/* Connecting line */}
      {trend.points.length > 1 && (
        <Path d={linePath} stroke={Colors.gold} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* Dots */}
      {trend.points.map((p, i) => (
        <Circle
          key={i}
          cx={toX(i)}
          cy={toY(p.value)}
          r={4.5}
          fill={statusColor(p.status)}
          stroke="white"
          strokeWidth={1.5}
        />
      ))}
      {/* Date labels (first + last) */}
      {trend.points.length > 1 && (
        <>
          <SvgText
            x={toX(0)}
            y={height - 2}
            textAnchor="middle"
            fill={Colors.textLight}
            fontSize={9}
            fontFamily="Inter_400Regular"
          >
            {trend.points[0].dateLabel}
          </SvgText>
          <SvgText
            x={toX(trend.points.length - 1)}
            y={height - 2}
            textAnchor="middle"
            fill={Colors.textLight}
            fontSize={9}
            fontFamily="Inter_400Regular"
          >
            {trend.points[trend.points.length - 1].dateLabel}
          </SvgText>
        </>
      )}
    </Svg>
  );
}

// ─── Trends List ──────────────────────────────────────────────────────────────

function TrendsList({
  labResults,
  chartWidth,
}: {
  labResults: LabResult[];
  chartWidth: number;
}) {
  const [search, setSearch] = useState("");
  const trends = useMemo(() => buildTrends(labResults), [labResults]);
  const filtered = search
    ? trends.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : trends;

  if (labResults.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="trending-up" size={40} color={Colors.textLight} />
        <Text style={styles.emptyTitle}>No Trends Yet</Text>
        <Text style={styles.emptyText}>
          Add lab results over time and marker trends will appear here as charts.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.searchWrap}>
        <Feather name="search" size={14} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search markers…"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {filtered.map((trend) => {
        const latest = trend.points[trend.points.length - 1];
        const first = trend.points[0];
        const isMulti = trend.points.length > 1;
        const delta = isMulti ? ((latest.value - first.value) / (first.value || 1)) * 100 : 0;
        const latestColor = statusColor(latest.status);

        return (
          <View key={trend.name} style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <View style={styles.trendLeft}>
                <Text style={styles.trendName}>{trend.name}</Text>
                {trend.referenceRangeLow != null && trend.referenceRangeHigh != null && (
                  <Text style={styles.trendRef}>
                    Ref: {trend.referenceRangeLow}–{trend.referenceRangeHigh} {trend.unit}
                  </Text>
                )}
              </View>
              <View style={styles.trendRight}>
                <Text style={[styles.trendValue, { color: latestColor }]}>
                  {latest.value}
                  <Text style={styles.trendUnit}> {trend.unit}</Text>
                </Text>
                {isMulti && (
                  <View style={styles.trendDelta}>
                    <Feather
                      name={delta > 0 ? "trending-up" : delta < 0 ? "trending-down" : "minus"}
                      size={10}
                      color={delta > 0 ? Colors.warning : delta < 0 ? "#3b82f6" : Colors.textLight}
                    />
                    <Text
                      style={[
                        styles.trendDeltaText,
                        {
                          color:
                            delta > 0
                              ? Colors.warning
                              : delta < 0
                              ? "#3b82f6"
                              : Colors.textLight,
                        },
                      ]}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {isMulti ? (
              <MarkerChart trend={trend} width={chartWidth} />
            ) : (
              <View style={styles.singleReadingWrap}>
                <View style={[styles.singleDot, { backgroundColor: latestColor }]} />
                <Text style={styles.singleReadingText}>
                  One reading so far — add more to see a trend
                </Text>
              </View>
            )}

            <Text style={styles.trendReadings}>
              {trend.points.length} reading{trend.points.length !== 1 ? "s" : ""}
            </Text>
          </View>
        );
      })}
    </>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return <View style={[styles.dot, { backgroundColor: statusColor(status) }]} />;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LabResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { data: labResults = [], isLoading, refetch } = useGetLabResults();
  const { mutate: deleteResult } = useDeleteLabResult();

  const [view, setView] = useState<"list" | "trends">("list");

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;
  const chartWidth = screenWidth - 40 - 28; // full width minus horizontal padding and card padding

  const handleDelete = (id: number, name: string) => {
    Alert.alert("Delete Lab Result", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteResult({ id }, { onSuccess: () => refetch() });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: topPadding }]}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Lab Results</Text>
        <View style={styles.headerActions}>
          {labResults.length > 0 && (
            <View style={styles.viewToggle}>
              <Pressable
                style={[styles.toggleBtn, view === "list" && styles.toggleBtnActive]}
                onPress={() => setView("list")}
              >
                <Feather
                  name="list"
                  size={14}
                  color={view === "list" ? Colors.forest : Colors.textLight}
                />
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, view === "trends" && styles.toggleBtnActive]}
                onPress={() => setView("trends")}
              >
                <Feather
                  name="trending-up"
                  size={14}
                  color={view === "trends" ? Colors.forest : Colors.textLight}
                />
              </Pressable>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/add-lab-result");
            }}
          >
            <Feather name="plus" size={22} color={Colors.cream} />
          </Pressable>
        </View>
      </View>

      {view === "trends" ? (
        <ScrollView
          contentContainerStyle={[
            styles.trendsContent,
            { paddingBottom: bottomPadding + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <TrendsList labResults={labResults} chartWidth={chartWidth} />
        </ScrollView>
      ) : (
        <FlatList
          data={labResults}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!labResults.length}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="droplet" size={40} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No Lab Results Yet</Text>
              <Text style={styles.emptyText}>
                Add your first lab test to get started with AI-powered health insights.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
                onPress={() => router.push("/add-lab-result")}
              >
                <Text style={styles.emptyBtnText}>Add Lab Result</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const abnormal = (item.markers ?? []).filter((m) => m.status !== "normal");
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                onPress={() => router.push(`/lab-result/${item.id}`)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={styles.iconWrap}>
                      <Feather name="droplet" size={16} color={Colors.gold} />
                    </View>
                    <View>
                      <Text style={styles.cardName}>{item.testName}</Text>
                      <Text style={styles.cardDate}>
                        {new Date(item.testDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => handleDelete(item.id, item.testName)}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={16} color={Colors.danger} />
                    </Pressable>
                    <Feather name="chevron-right" size={16} color={Colors.textLight} />
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.markersSummary}>
                    {(item.markers ?? []).slice(0, 5).map((m, i) => (
                      <StatusDot key={i} status={m.status} />
                    ))}
                    {(item.markers ?? []).length > 5 && (
                      <Text style={styles.moreMarkers}>
                        +{(item.markers ?? []).length - 5}
                      </Text>
                    )}
                  </View>
                  {item.analysis ? (
                    <View style={styles.analyzedChip}>
                      <Feather name="zap" size={11} color={Colors.gold} />
                      <Text style={styles.analyzedText}>Analyzed</Text>
                    </View>
                  ) : null}
                  {abnormal.length > 0 && (
                    <View style={styles.flagChip}>
                      <Text style={styles.flagText}>{abnormal.length} flagged</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.cream },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  title: { fontSize: 26, fontWeight: "700" as const, color: Colors.forest, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    overflow: "hidden",
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toggleBtnActive: {
    backgroundColor: Colors.creamDark,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.forest,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  trendsContent: { paddingHorizontal: 20, paddingTop: 4 },
  // Trend cards
  trendCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: Colors.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  trendHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  trendLeft: { flex: 1, marginRight: 8 },
  trendName: { fontSize: 14, fontWeight: "600" as const, color: Colors.textDark, fontFamily: "Inter_600SemiBold" },
  trendRef: { fontSize: 11, color: Colors.textLight, fontFamily: "Inter_400Regular", marginTop: 2 },
  trendRight: { alignItems: "flex-end" },
  trendValue: { fontSize: 20, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
  trendUnit: { fontSize: 12, color: Colors.textMid, fontFamily: "Inter_400Regular" },
  trendDelta: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  trendDeltaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  trendReadings: { fontSize: 11, color: Colors.textLight, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },
  singleReadingWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 16, paddingHorizontal: 4 },
  singleDot: { width: 12, height: 12, borderRadius: 6 },
  singleReadingText: { fontSize: 12, color: Colors.textLight, fontFamily: "Inter_400Regular" },
  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    paddingHorizontal: 10,
    marginBottom: 14,
    height: 40,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark, fontFamily: "Inter_400Regular" },
  // Lab result cards (list view)
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: Colors.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.forestDark, justifyContent: "center", alignItems: "center" },
  cardName: { fontSize: 14, fontWeight: "600" as const, color: Colors.textDark, fontFamily: "Inter_600SemiBold" },
  cardDate: { fontSize: 12, color: Colors.textLight, fontFamily: "Inter_400Regular", marginTop: 1 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  deleteBtn: { padding: 4 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  markersSummary: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  moreMarkers: { fontSize: 11, color: Colors.textLight, fontFamily: "Inter_400Regular" },
  analyzedChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.forestDark, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  analyzedText: { fontSize: 11, color: Colors.gold, fontFamily: "Inter_500Medium" },
  flagChip: { backgroundColor: Colors.warningLight, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  flagText: { fontSize: 11, color: Colors.warning, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const, color: Colors.textDark, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMid, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.forest, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: Colors.cream, fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
});
