import { Feather } from "@expo/vector-icons";
import {
  useGetMedications,
  useDeleteMedication,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
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
          { paddingBottom: bottomPadding + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!medications.length}
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
    alignItems: "flex-start",
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
  cardInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textDark,
    fontFamily: "Inter_600SemiBold",
  },
  medDosage: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.creamDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 12,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
  },
  notes: {
    fontSize: 13,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
    marginTop: 10,
    fontStyle: "italic",
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
