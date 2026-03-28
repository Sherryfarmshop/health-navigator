import { Feather } from "@expo/vector-icons";
import { useGetLabResults, useDeleteLabResult } from "@workspace/api-client-react";
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

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    normal: Colors.success,
    low: Colors.warning,
    high: Colors.warning,
    "critical-low": Colors.danger,
    "critical-high": Colors.danger,
  };
  return (
    <View
      style={[styles.dot, { backgroundColor: colors[status] ?? Colors.textLight }]}
    />
  );
}

export default function LabResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: labResults = [], isLoading, refetch } = useGetLabResults();
  const { mutate: deleteResult } = useDeleteLabResult();

  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

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
      <View style={styles.header}>
        <Text style={styles.title}>Lab Results</Text>
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

      <FlatList
        data={labResults}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPadding + 100 },
        ]}
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
          const abnormal = (item.markers ?? []).filter(
            (m) => m.status !== "normal"
          );
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
    </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: Colors.forest,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.forest,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.forestDark,
    justifyContent: "center",
    alignItems: "center",
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textDark,
    fontFamily: "Inter_600SemiBold",
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  markersSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreMarkers: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
  },
  analyzedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.forestDark,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  analyzedText: {
    fontSize: 11,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
  },
  flagChip: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  flagText: {
    fontSize: 11,
    color: Colors.warning,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.textDark,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: Colors.forest,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: Colors.cream,
    fontSize: 14,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
});
