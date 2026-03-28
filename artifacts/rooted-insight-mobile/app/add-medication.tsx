import { useCreateMedication } from "@workspace/api-client-react";
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

export default function AddMedicationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate: createMedication, isPending } = useCreateMedication();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [prescribedFor, setPrescribedFor] = useState("");
  const [prescribedBy, setPrescribedBy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Missing Field", "Please enter a medication name.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createMedication(
      {
        data: {
          name: name.trim(),
          dosage: dosage.trim() || null,
          frequency: frequency.trim() || null,
          prescribedFor: prescribedFor.trim() || null,
          prescribedBy: prescribedBy.trim() || null,
          startDate: startDate.trim() || null,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: () => {
          Alert.alert("Error", "Failed to save medication. Please try again.");
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
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Medication Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Metformin"
          placeholderTextColor={Colors.textLight}
          returnKeyType="next"
          autoFocus
        />

        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Dosage</Text>
        <TextInput
          style={styles.input}
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g. 500mg"
          placeholderTextColor={Colors.textLight}
        />

        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Frequency</Text>
        <TextInput
          style={styles.input}
          value={frequency}
          onChangeText={setFrequency}
          placeholder="e.g. Once daily with meals"
          placeholderTextColor={Colors.textLight}
        />

        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Prescribed For</Text>
        <TextInput
          style={styles.input}
          value={prescribedFor}
          onChangeText={setPrescribedFor}
          placeholder="e.g. Type 2 Diabetes"
          placeholderTextColor={Colors.textLight}
        />

        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Prescribed By</Text>
        <TextInput
          style={styles.input}
          value={prescribedBy}
          onChangeText={setPrescribedBy}
          placeholder="e.g. Dr. Smith"
          placeholderTextColor={Colors.textLight}
        />

        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="e.g. 2024-01-01"
          placeholderTextColor={Colors.textLight}
          keyboardType="numbers-and-punctuation"
        />

        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional information..."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>
          This information is for personal tracking only. Always follow your
          healthcare provider's instructions regarding your medications.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && { opacity: 0.85 },
          isPending && { opacity: 0.6 },
        ]}
        onPress={handleSubmit}
        disabled={isPending}
      >
        <Text style={styles.submitBtnText}>
          {isPending ? "Saving..." : "Save Medication"}
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  },
  multiline: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.creamDark,
    marginVertical: 4,
  },
  disclaimerBox: {
    backgroundColor: Colors.creamDark,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textMid,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: Colors.forest,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.goldPale,
    fontFamily: "Inter_700Bold",
  },
});
