import { Feather } from "@expo/vector-icons";
import {
  useGetMedications,
  useDeleteMedication,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interaction {
  id: string;
  severity: "serious" | "moderate" | "mild" | "informational";
  pair: string[];
  effect: string;
  mechanism: string;
  watchFor: string[];
  recommendation: string;
  category: string;
}

interface InteractionResult {
  generatedAt: string;
  medications: string[];
  interactions: Interaction[];
  noInteractionsFound: boolean;
  summary: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  serious: "#dc2626",
  moderate: "#d97706",
  mild: "#0284c7",
  informational: "#6b7280",
};

const SEVERITY_BG: Record<string, string> = {
  serious: "#fef2f2",
  moderate: "#fffbeb",
  mild: "#f0f9ff",
  informational: "#f9fafb",
};

const SEVERITY_BORDER: Record<string, string> = {
  serious: "#fca5a5",
  moderate: "#fcd34d",
  mild: "#bae6fd",
  informational: "#e5e7eb",
};

// ─── Interaction Card ─────────────────────────────────────────────────────────

function InteractionCard({ item }: { item: Interaction }) {
  const [expanded, setExpanded] = useState(
    item.severity === "serious" || item.severity === "moderate"
  );
  const color = SEVERITY_COLOR[item.severity] ?? "#6b7280";
  const bg = SEVERITY_BG[item.severity] ?? "#f9fafb";
  const borderColor = SEVERITY_BORDER[item.severity] ?? "#e5e7eb";

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={[styles.intCard, { backgroundColor: bg, borderColor }]}
    >
      <View style={[styles.intStripe, { backgroundColor: color }]} />
      <View style={styles.intContent}>
        {/* Header row */}
        <View style={styles.intHeader}>
          <View style={styles.intHeaderLeft}>
            <View style={[styles.intBadge, { borderColor: color }]}>
              <Text style={[styles.intBadgeText, { color }]}>
                {item.severity.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.intCategoryText}>{item.category}</Text>
          </View>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.textMid}
          />
        </View>

        <Text style={styles.intEffect}>{item.effect}</Text>
        <Text style={styles.intPair}>{item.pair.join(" + ")}</Text>

        {expanded && (
          <View style={styles.intExpanded}>
            <View style={styles.intDivider} />

            <Text style={styles.intSectionLabel}>HOW IT WORKS</Text>
            <Text style={styles.intBody}>{item.mechanism}</Text>

            {item.watchFor?.length > 0 && (
              <>
                <Text style={[styles.intSectionLabel, { marginTop: 10 }]}>WATCH FOR</Text>
                {item.watchFor.map((s, i) => (
                  <View key={i} style={styles.intBulletRow}>
                    <View style={[styles.intBullet, { backgroundColor: color }]} />
                    <Text style={styles.intBody}>{s}</Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.intRecommendBox}>
              <Text style={styles.intSectionLabel}>WHAT TO DO</Text>
              <Text style={styles.intBody}>{item.recommendation}</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Interaction Checker Panel ────────────────────────────────────────────────

function InteractionPanel({ count }: { count: number }) {
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  const check = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/medications/interactions`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to check interactions");
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Failed to check. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sorted = result
    ? [...result.interactions].sort((a, b) => {
        const rank: Record<string, number> = { serious: 0, moderate: 1, mild: 2, informational: 3 };
        return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
      })
    : [];

  const hasSerious = sorted.some((i) => i.severity === "serious");
  const hasModerate = sorted.some((i) => i.severity === "moderate");
  const topColor = hasSerious ? "#dc2626" : hasModerate ? "#d97706" : "#0284c7";

  return (
    <View style={styles.checkerSection}>
      <View style={styles.checkerHeader}>
        <Feather name="zap" size={18} color={Colors.gold} />
        <Text style={styles.checkerTitle}>Interaction Checker</Text>
        {result && !loading && (
          <Pressable onPress={check} style={styles.recheckBtn}>
            <Text style={styles.recheckText}>Re-check</Text>
          </Pressable>
        )}
      </View>

      {count < 2 && (
        <View style={styles.notEnoughBox}>
          <Text style={styles.notEnoughText}>
            Add at least 2 medications to check for interactions between them.
          </Text>
        </View>
      )}

      {count >= 2 && !result && !loading && (
        <View style={styles.checkerPrompt}>
          <Text style={styles.checkerPromptTitle}>Check Your Medications</Text>
          <Text style={styles.checkerPromptBody}>
            AI will review all {count} medications and supplements for known interactions — like fish oil + aspirin increasing bleeding risk.
          </Text>
          {!!error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.checkBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              check();
            }}
          >
            <Feather name="zap" size={16} color={Colors.cream} />
            <Text style={styles.checkBtnText}>Check for Interactions</Text>
          </Pressable>
        </View>
      )}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.gold} size="large" />
          <Text style={styles.loadingText}>Checking for interactions…</Text>
          <Text style={styles.loadingSubText}>AI is reviewing all your medications</Text>
        </View>
      )}

      {result && !loading && (
        <View>
          {result.noInteractionsFound ? (
            <View style={styles.noIntBox}>
              <Feather name="check-circle" size={22} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.noIntTitle}>No known interactions found</Text>
                <Text style={styles.noIntBody}>
                  Your medications don't have documented interactions with each other. Always keep your doctor informed about everything you take.
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.summaryBox, { backgroundColor: hasSerious ? "#fef2f2" : hasModerate ? "#fffbeb" : "#f0f9ff", borderColor: topColor + "55" }]}>
              <Feather name="alert-triangle" size={18} color={topColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryTitle, { color: topColor }]}>{result.summary}</Text>
                <Text style={[styles.summaryBody, { color: topColor + "cc" }]}>
                  Review the interactions below and discuss with your healthcare provider.
                </Text>
              </View>
            </View>
          )}

          {sorted.map((item, idx) => (
            <InteractionCard key={item.id ?? idx} item={item} />
          ))}

          <View style={styles.disclaimer}>
            <Feather name="alert-triangle" size={12} color="#92400e" />
            <Text style={styles.disclaimerText}>
              For educational purposes only. Always tell your doctor and pharmacist about everything you take.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MedicationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: medications = [], isLoading, refetch } = useGetMedications();
  const { mutate: deleteMedication } = useDeleteMedication();

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const handleDelete = (id: number, name: string) => {
    Alert.alert("Remove Medication", `Remove "${name}" from your list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteMedication({ id }, { onSuccess: () => refetch() });
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
      <View style={styles.header}>
        <Text style={styles.title}>Medications</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/add-medication");
          }}
        >
          <Feather name="plus" size={22} color={Colors.cream} />
        </Pressable>
      </View>

      <FlatList
        data={medications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPadding + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="package" size={40} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Medications Tracked</Text>
            <Text style={styles.emptyText}>
              Keep track of your current medications for a full health picture.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.push("/add-medication")}
            >
              <Text style={styles.emptyBtnText}>Add Medication</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          medications.length > 0 ? (
            <InteractionPanel count={medications.length} />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.cardLeft}>
                <View style={styles.iconWrap}>
                  <Feather name="package" size={16} color={Colors.gold} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.medName}>{item.name}</Text>
                  {item.dosage ? (
                    <Text style={styles.medDosage}>{item.dosage}</Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                onPress={() => handleDelete(item.id, item.name)}
                hitSlop={8}
              >
                <Feather name="trash-2" size={16} color={Colors.danger} />
              </Pressable>
            </View>

            <View style={styles.pills}>
              {item.frequency ? (
                <View style={styles.pill}>
                  <Feather name="clock" size={11} color={Colors.textMid} />
                  <Text style={styles.pillText}>{item.frequency}</Text>
                </View>
              ) : null}
              {item.prescribedFor ? (
                <View style={styles.pill}>
                  <Feather name="target" size={11} color={Colors.textMid} />
                  <Text style={styles.pillText}>{item.prescribedFor}</Text>
                </View>
              ) : null}
              {item.prescribedBy ? (
                <View style={styles.pill}>
                  <Feather name="user" size={11} color={Colors.textMid} />
                  <Text style={styles.pillText}>{item.prescribedBy}</Text>
                </View>
              ) : null}
            </View>

            {item.notes ? (
              <Text style={styles.notes}>{item.notes}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

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
  title: { fontSize: 26, fontWeight: "700", color: Colors.forest, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.forest, justifyContent: "center", alignItems: "center",
  },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: Colors.forest, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.forestDark, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "600", color: Colors.textDark, fontFamily: "Inter_600SemiBold" },
  medDosage: { fontSize: 13, color: Colors.gold, fontFamily: "Inter_500Medium", marginTop: 1 },
  deleteBtn: { padding: 4 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.creamDark, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12, color: Colors.textMid, fontFamily: "Inter_400Regular" },
  notes: { fontSize: 13, color: Colors.textLight, fontFamily: "Inter_400Regular", marginTop: 10, fontStyle: "italic" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.textDark, fontFamily: "Inter_600SemiBold", marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMid, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.forest, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: Colors.cream, fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },

  // ── Interaction checker ──
  checkerSection: {
    marginTop: 12, marginBottom: 20,
    backgroundColor: Colors.white, borderRadius: 20, padding: 18,
    shadowColor: Colors.forest, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  checkerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  checkerTitle: { fontSize: 16, fontWeight: "700", color: Colors.forest, fontFamily: "Inter_700Bold", flex: 1 },
  recheckBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.creamDark, borderRadius: 8 },
  recheckText: { fontSize: 12, color: Colors.textMid, fontFamily: "Inter_500Medium" },
  notEnoughBox: { backgroundColor: Colors.creamDark, borderRadius: 12, padding: 14 },
  notEnoughText: { fontSize: 13, color: Colors.textMid, fontFamily: "Inter_400Regular", lineHeight: 19 },
  checkerPrompt: { alignItems: "center", paddingVertical: 8 },
  checkerPromptTitle: { fontSize: 15, fontWeight: "600", color: Colors.textDark, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  checkerPromptBody: { fontSize: 13, color: Colors.textMid, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, marginBottom: 16, paddingHorizontal: 8 },
  errorText: { fontSize: 12, color: "#dc2626", marginBottom: 10, textAlign: "center", fontFamily: "Inter_400Regular" },
  checkBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#b45309", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12,
  },
  checkBtnText: { color: Colors.cream, fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  loadingBox: { alignItems: "center", paddingVertical: 24, gap: 10 },
  loadingText: { fontSize: 14, color: Colors.textDark, fontFamily: "Inter_600SemiBold" },
  loadingSubText: { fontSize: 13, color: Colors.textMid, fontFamily: "Inter_400Regular" },

  // Summary & results
  noIntBox: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#f0fdf4", borderRadius: 12, padding: 14, marginBottom: 12 },
  noIntTitle: { fontSize: 14, fontWeight: "600", color: "#15803d", fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  noIntBody: { fontSize: 13, color: "#166534", fontFamily: "Inter_400Regular", lineHeight: 18 },
  summaryBox: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  summaryBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  // Interaction card
  intCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, flexDirection: "row", overflow: "hidden" },
  intStripe: { width: 5 },
  intContent: { flex: 1, padding: 12 },
  intHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  intHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  intBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  intBadgeText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  intCategoryText: { fontSize: 11, color: Colors.textMid, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  intEffect: { fontSize: 14, fontWeight: "600", color: Colors.textDark, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  intPair: { fontSize: 12, color: Colors.textMid, fontFamily: "Inter_400Regular" },
  intExpanded: { marginTop: 10 },
  intDivider: { height: 1, backgroundColor: Colors.creamDark, marginBottom: 10 },
  intSectionLabel: { fontSize: 10, fontWeight: "700", color: Colors.textLight, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 4 },
  intBody: { fontSize: 13, color: Colors.textMid, fontFamily: "Inter_400Regular", lineHeight: 19 },
  intBulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  intBullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  intRecommendBox: { backgroundColor: Colors.white, borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: Colors.creamDark },

  // Disclaimer
  disclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#fffbeb", borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: "#fcd34d",
  },
  disclaimerText: { fontSize: 11, color: "#92400e", fontFamily: "Inter_400Regular", lineHeight: 16, flex: 1 },
});
