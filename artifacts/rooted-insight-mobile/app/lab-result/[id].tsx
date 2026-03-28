import { Feather } from "@expo/vector-icons";
import {
  useGetLabResult,
  useAnalyzeLabResult,
} from "@workspace/api-client-react";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

function MarkerRow({ marker }: { marker: any }) {
  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    normal: { color: Colors.success, bg: Colors.successLight, label: "Normal" },
    low: { color: Colors.warning, bg: Colors.warningLight, label: "Low" },
    high: { color: Colors.warning, bg: Colors.warningLight, label: "High" },
    "critical-low": { color: Colors.danger, bg: Colors.dangerLight, label: "Critical Low" },
    "critical-high": { color: Colors.danger, bg: Colors.dangerLight, label: "Critical High" },
  };
  const cfg = statusConfig[marker.status] ?? statusConfig.normal;

  return (
    <View style={markerStyles.row}>
      <View style={markerStyles.rowLeft}>
        <Text style={markerStyles.name}>{marker.name}</Text>
        <View style={[markerStyles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[markerStyles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <View style={markerStyles.rowRight}>
        <Text style={[markerStyles.value, { color: cfg.color }]}>
          {marker.value} {marker.unit}
        </Text>
        {marker.referenceRange ? (
          <Text style={markerStyles.ref}>Ref: {marker.referenceRange}</Text>
        ) : null}
      </View>
    </View>
  );
}

const markerStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  rowLeft: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textDark,
    fontFamily: "Inter_500Medium",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
  },
  rowRight: {
    alignItems: "flex-end",
  },
  value: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  ref: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});

export default function LabResultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: result, isLoading, refetch } = useGetLabResult(Number(id));
  const { mutate: analyze, isPending: analyzing } = useAnalyzeLabResult();

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleAnalyze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analyze({ id: Number(id) }, { onSuccess: () => refetch() });
  };

  if (isLoading || !result) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  const abnormalMarkers = (result.markers ?? []).filter((m) => m.status !== "normal");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topCard}>
        <Text style={styles.testName}>{result.testName}</Text>
        <Text style={styles.testDate}>
          {new Date(result.testDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        {result.labName ? (
          <View style={styles.labRow}>
            <Feather name="map-pin" size={13} color={Colors.textLight} />
            <Text style={styles.labName}>{result.labName}</Text>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{(result.markers ?? []).length}</Text>
            <Text style={styles.summaryLabel}>Markers</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, abnormalMarkers.length > 0 && { color: Colors.warning }]}>
              {abnormalMarkers.length}
            </Text>
            <Text style={styles.summaryLabel}>Flagged</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: result.analysis ? Colors.success : Colors.textLight }]}>
              {result.analysis ? "Yes" : "No"}
            </Text>
            <Text style={styles.summaryLabel}>Analyzed</Text>
          </View>
        </View>
      </View>

      {result.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>{result.notes}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lab Markers</Text>
        <View style={styles.markersCard}>
          {(result.markers ?? []).map((marker, i) => (
            <MarkerRow key={i} marker={marker} />
          ))}
        </View>
      </View>

      {!result.analysis && (
        <Pressable
          style={({ pressed }) => [styles.analyzeBtn, pressed && { opacity: 0.8 }, analyzing && { opacity: 0.6 }]}
          onPress={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator size="small" color={Colors.forestDark} />
          ) : (
            <Feather name="zap" size={18} color={Colors.forestDark} />
          )}
          <Text style={styles.analyzeBtnText}>
            {analyzing ? "Analyzing..." : "Get AI Analysis"}
          </Text>
        </Pressable>
      )}

      {result.analysis && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <Feather name="zap" size={16} color={Colors.gold} />
            <Text style={styles.analysisTitle}>AI Health Insights</Text>
          </View>

          <Text style={styles.analysisSummary}>{result.analysis.summary}</Text>

          {(result.analysis.markerInsights ?? []).length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={styles.insightsSectionTitle}>Marker Insights</Text>
              {result.analysis.markerInsights.map((insight: any, i: number) => (
                <View key={i} style={styles.insightItem}>
                  <Text style={styles.insightMarker}>{insight.markerName}</Text>
                  <Text style={styles.insightExplanation}>{insight.explanation}</Text>

                  {insight.naturalSuggestions && insight.naturalSuggestions.length > 0 && (
                    <View style={styles.suggestions}>
                      {insight.naturalSuggestions.map((s: any, j: number) => {
                        const icons: Record<string, string> = {
                          supplement: "droplet",
                          diet: "coffee",
                          lifestyle: "sun",
                          exercise: "activity",
                        };
                        return (
                          <View key={j} style={styles.suggestion}>
                            <Feather
                              name={(icons[s.category] ?? "info") as any}
                              size={12}
                              color={Colors.gold}
                            />
                            <Text style={styles.suggestionText}>{s.suggestion}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.disclaimerBox}>
            <Feather name="alert-circle" size={13} color={Colors.textLight} />
            <Text style={styles.disclaimerText}>{result.analysis.disclaimer}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.cream,
  },
  content: {
    padding: 20,
  },
  topCard: {
    backgroundColor: Colors.forest,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  testName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.cream,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  testDate: {
    fontSize: 13,
    color: Colors.goldPale,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  labRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  labName: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.forestDark,
    borderRadius: 12,
    padding: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.gold,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.forestMid,
  },
  notesCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textMid,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textDark,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.forest,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
  },
  markersCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
  },
  analyzeBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.forestDark,
    fontFamily: "Inter_700Bold",
  },
  analysisCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.forest,
    fontFamily: "Inter_700Bold",
  },
  analysisSummary: {
    fontSize: 14,
    color: Colors.textDark,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 16,
  },
  insightsSection: {
    marginBottom: 16,
  },
  insightsSectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textMid,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  insightItem: {
    backgroundColor: Colors.cream,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  insightMarker: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.forest,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  insightExplanation: {
    fontSize: 13,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 8,
  },
  suggestions: {
    gap: 6,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  suggestionText: {
    fontSize: 12,
    color: Colors.textDark,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.creamDark,
    borderRadius: 10,
    padding: 10,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 17,
  },
});
