import { Feather } from "@expo/vector-icons";
import { useGetLabResults, useGetMedications } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    normal: { bg: Colors.successLight, text: Colors.success, label: "Normal" },
    low: { bg: Colors.warningLight, text: Colors.warning, label: "Low" },
    high: { bg: Colors.warningLight, text: Colors.warning, label: "High" },
    "critical-low": { bg: Colors.dangerLight, text: Colors.danger, label: "Critical Low" },
    "critical-high": { bg: Colors.dangerLight, text: Colors.danger, label: "Critical High" },
  };
  const c = config[status] ?? config.normal;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: labResults = [], isLoading: labLoading } = useGetLabResults();
  const { data: medications = [], isLoading: medLoading } = useGetMedications();

  const isLoading = labLoading || medLoading;

  const totalMarkers = labResults.flatMap((r) => r.markers ?? []).length;
  const abnormalMarkers = labResults
    .flatMap((r) => r.markers ?? [])
    .filter((m) => m.status !== "normal").length;
  const recentResult = labResults[0];
  const analyzedCount = labResults.filter((r) => r.analysis).length;

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPadding }]}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.appName}>Rooted Insight</Text>
        </View>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
        />
      </View>

      <Text style={styles.disclaimer}>
        For educational purposes only. Always consult a healthcare provider.
      </Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statNumber}>{labResults.length}</Text>
          <Text style={styles.statLabel}>Lab Tests</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statNumber}>{medications.length}</Text>
          <Text style={styles.statLabel}>Medications</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={[styles.statNumber, abnormalMarkers > 0 && { color: Colors.warning }]}>
            {abnormalMarkers}
          </Text>
          <Text style={styles.statLabel}>Flagged</Text>
        </View>
      </View>

      {recentResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Lab Result</Text>
          <Pressable
            style={({ pressed }) => [styles.recentCard, pressed && styles.pressed]}
            onPress={() => router.push(`/lab-result/${recentResult.id}`)}
          >
            <View style={styles.recentCardTop}>
              <View style={styles.recentCardLeft}>
                <Feather name="droplet" size={18} color={Colors.gold} />
                <Text style={styles.recentCardName}>{recentResult.testName}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textLight} />
            </View>
            <Text style={styles.recentCardDate}>
              {new Date(recentResult.testDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            {recentResult.markers && recentResult.markers.length > 0 && (
              <View style={styles.markerChips}>
                {recentResult.markers.slice(0, 3).map((m, i) => (
                  <StatusBadge key={i} status={m.status} />
                ))}
                {recentResult.markers.length > 3 && (
                  <Text style={styles.moreText}>+{recentResult.markers.length - 3} more</Text>
                )}
              </View>
            )}
            {recentResult.analysis ? (
              <View style={styles.analysisChip}>
                <Feather name="check-circle" size={12} color={Colors.success} />
                <Text style={styles.analysisChipText}>AI Analysis Available</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => router.push("/add-lab-result")}
          >
            <View style={styles.actionIcon}>
              <Feather name="plus-circle" size={24} color={Colors.gold} />
            </View>
            <Text style={styles.actionLabel}>Add Lab Result</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => router.push("/(tabs)/lab-results")}
          >
            <View style={styles.actionIcon}>
              <Feather name="list" size={24} color={Colors.gold} />
            </View>
            <Text style={styles.actionLabel}>View All Labs</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => router.push("/add-medication")}
          >
            <View style={styles.actionIcon}>
              <Feather name="package" size={24} color={Colors.gold} />
            </View>
            <Text style={styles.actionLabel}>Add Medication</Text>
          </Pressable>
        </View>
      </View>

      {analyzedCount > 0 && (
        <View style={styles.insightBanner}>
          <Feather name="zap" size={16} color={Colors.gold} />
          <Text style={styles.insightBannerText}>
            {analyzedCount} of your lab results have AI insights available.
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.cream,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
  },
  appName: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.forest,
    fontFamily: "Inter_700Bold",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
    backgroundColor: Colors.creamDark,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: Colors.forest,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.gold,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    color: Colors.creamDark,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.forest,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  recentCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recentCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  recentCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recentCardName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textDark,
    fontFamily: "Inter_600SemiBold",
  },
  recentCardDate: {
    fontSize: 13,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
  },
  markerChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  moreText: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
    alignSelf: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
  },
  analysisChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  analysisChipText: {
    fontSize: 12,
    color: Colors.success,
    fontFamily: "Inter_400Regular",
  },
  quickActions: {
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: Colors.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.forestDark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  insightBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.forestDark,
    borderRadius: 12,
    padding: 14,
  },
  insightBannerText: {
    fontSize: 13,
    color: Colors.goldPale,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
