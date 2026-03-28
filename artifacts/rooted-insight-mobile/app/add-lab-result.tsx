import { Feather } from "@expo/vector-icons";
import { useCreateLabResult } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import Colors from "@/constants/colors";

type MarkerStatus = "normal" | "low" | "high" | "critical-low" | "critical-high";

interface MarkerEntry {
  id: string;
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: MarkerStatus;
}

const STATUS_OPTIONS: { value: MarkerStatus; label: string; color: string }[] = [
  { value: "normal", label: "Normal", color: Colors.success },
  { value: "low", label: "Low", color: Colors.warning },
  { value: "high", label: "High", color: Colors.warning },
  { value: "critical-low", label: "Critical Low", color: Colors.danger },
  { value: "critical-high", label: "Critical High", color: Colors.danger },
];

function newMarker(): MarkerEntry {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
    name: "",
    value: "",
    unit: "",
    referenceRange: "",
    status: "normal",
  };
}

export default function AddLabResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate: createResult, isPending } = useCreateLabResult();

  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [markers, setMarkers] = useState<MarkerEntry[]>([newMarker()]);

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const updateMarker = (id: string, field: keyof MarkerEntry, value: string) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const addMarker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMarkers((prev) => [...prev, newMarker()]);
  };

  const removeMarker = (id: string) => {
    if (markers.length <= 1) return;
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = () => {
    if (!testName.trim()) {
      Alert.alert("Missing Field", "Please enter a test name.");
      return;
    }
    if (!testDate.trim()) {
      Alert.alert("Missing Field", "Please enter a test date.");
      return;
    }
    const validMarkers = markers.filter((m) => m.name.trim() && m.value.trim());
    if (validMarkers.length === 0) {
      Alert.alert("Missing Markers", "Please add at least one lab marker with a name and value.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createResult(
      {
        data: {
          testName: testName.trim(),
          testDate,
          labName: labName.trim() || null,
          notes: notes.trim() || null,
          markers: validMarkers.map((m) => ({
            name: m.name.trim(),
            value: parseFloat(m.value) || 0,
            unit: m.unit.trim() || null,
            referenceRange: m.referenceRange.trim() || null,
            status: m.status,
          })),
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: () => {
          Alert.alert("Error", "Failed to save lab result. Please try again.");
        },
      }
    );
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 40 }]}
      bottomOffset={16}
    >
      <Text style={styles.sectionLabel}>Test Info</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Test Name *</Text>
        <TextInput
          style={styles.input}
          value={testName}
          onChangeText={setTestName}
          placeholder="e.g. Complete Blood Count"
          placeholderTextColor={Colors.textLight}
          returnKeyType="next"
        />
        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Date (YYYY-MM-DD) *</Text>
        <TextInput
          style={styles.input}
          value={testDate}
          onChangeText={setTestDate}
          placeholder="2024-01-15"
          placeholderTextColor={Colors.textLight}
          keyboardType="numbers-and-punctuation"
        />
        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Lab Name</Text>
        <TextInput
          style={styles.input}
          value={labName}
          onChangeText={setLabName}
          placeholder="e.g. Quest Diagnostics"
          placeholderTextColor={Colors.textLight}
        />
        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes about this test..."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.markersHeader}>
        <Text style={styles.sectionLabel}>Lab Markers</Text>
        <Pressable
          style={({ pressed }) => [styles.addMarkerBtn, pressed && { opacity: 0.7 }]}
          onPress={addMarker}
        >
          <Feather name="plus" size={16} color={Colors.gold} />
          <Text style={styles.addMarkerText}>Add</Text>
        </Pressable>
      </View>

      {markers.map((marker, index) => (
        <View key={marker.id} style={styles.markerCard}>
          <View style={styles.markerCardHeader}>
            <Text style={styles.markerCardTitle}>Marker {index + 1}</Text>
            {markers.length > 1 && (
              <Pressable
                onPress={() => removeMarker(marker.id)}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Feather name="x" size={16} color={Colors.danger} />
              </Pressable>
            )}
          </View>

          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput
            style={styles.input}
            value={marker.name}
            onChangeText={(v) => updateMarker(marker.id, "name", v)}
            placeholder="e.g. Hemoglobin"
            placeholderTextColor={Colors.textLight}
          />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Value *</Text>
              <TextInput
                style={styles.input}
                value={marker.value}
                onChangeText={(v) => updateMarker(marker.id, "value", v)}
                placeholder="e.g. 14.2"
                placeholderTextColor={Colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>Unit</Text>
              <TextInput
                style={styles.input}
                value={marker.unit}
                onChangeText={(v) => updateMarker(marker.id, "unit", v)}
                placeholder="e.g. g/dL"
                placeholderTextColor={Colors.textLight}
              />
            </View>
          </View>
          <Text style={styles.fieldLabel}>Reference Range</Text>
          <TextInput
            style={styles.input}
            value={marker.referenceRange}
            onChangeText={(v) => updateMarker(marker.id, "referenceRange", v)}
            placeholder="e.g. 12.0-17.5"
            placeholderTextColor={Colors.textLight}
          />
          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.statusChip,
                  marker.status === opt.value && { backgroundColor: opt.color + "22", borderColor: opt.color },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => updateMarker(marker.id, "status", opt.value)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    marker.status === opt.value && { color: opt.color, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }, isPending && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={isPending}
      >
        <Text style={styles.submitBtnText}>
          {isPending ? "Saving..." : "Save Lab Result"}
        </Text>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textMid,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: Colors.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textMid,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    fontSize: 15,
    color: Colors.textDark,
    fontFamily: "Inter_400Regular",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  multiline: {
    minHeight: 64,
    borderBottomWidth: 0,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.creamDark,
    marginVertical: 4,
  },
  markersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addMarkerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.forestDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addMarkerText: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: "Inter_600SemiBold",
  },
  markerCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: Colors.forest,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  markerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  markerCardTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.forest,
    fontFamily: "Inter_600SemiBold",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    backgroundColor: Colors.cream,
  },
  statusChipText: {
    fontSize: 12,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
  },
  submitBtn: {
    backgroundColor: Colors.forest,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.goldPale,
    fontFamily: "Inter_700Bold",
  },
});
