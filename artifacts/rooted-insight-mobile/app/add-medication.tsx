import { Feather } from "@expo/vector-icons";
import { useCreateMedication } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const pickAndUpload = async (fromCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Needed", "Camera access is required to take a photo.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.85,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.85,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setUploading(true);
      setUploadSuccess(false);

      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: "medication.jpg",
      } as any);

      const apiUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/medications/parse`;
      const response = await fetch(apiUrl, { method: "POST", body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to read medication label");
      }

      const data = await response.json();
      if (data.name) setName(data.name);
      if (data.dosage) setDosage(data.dosage);
      if (data.frequency) setFrequency(data.frequency);
      if (data.prescribedFor) setPrescribedFor(data.prescribedFor);
      if (data.prescribedBy) setPrescribedBy(data.prescribedBy);
      if (data.startDate) setStartDate(data.startDate);
      if (data.notes) setNotes(data.notes);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUploadSuccess(true);
    } catch (err: any) {
      Alert.alert(
        "Scan Failed",
        err.message ?? "Could not read the label. Please enter the details manually."
      );
    } finally {
      setUploading(false);
    }
  };

  const showOptions = () => {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Camera scanning is only available on mobile devices.");
      return;
    }
    Alert.alert("Scan Medication Label", "How would you like to add the photo?", [
      { text: "Take Photo", onPress: () => pickAndUpload(true) },
      { text: "Choose from Library", onPress: () => pickAndUpload(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

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
      {/* Camera Banner */}
      <Pressable
        style={({ pressed }) => [
          styles.cameraBanner,
          uploadSuccess && styles.cameraBannerSuccess,
          pressed && { opacity: 0.85 },
          uploading && { opacity: 0.7 },
        ]}
        onPress={showOptions}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color={Colors.gold} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Reading medication label…</Text>
              <Text style={styles.bannerSub}>AI is extracting the details</Text>
            </View>
          </>
        ) : uploadSuccess ? (
          <>
            <View style={[styles.bannerIcon, { backgroundColor: Colors.success + "33" }]}>
              <Feather name="check-circle" size={20} color={Colors.success} />
            </View>
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: Colors.success }]}>Label scanned!</Text>
              <Text style={styles.bannerSub}>Details filled in — review and edit below</Text>
            </View>
            <Feather name="refresh-cw" size={14} color={Colors.textLight} />
          </>
        ) : (
          <>
            <View style={styles.bannerIcon}>
              <Feather name="camera" size={20} color={Colors.gold} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Scan Medication Label</Text>
              <Text style={styles.bannerSub}>Photo your pill bottle — AI fills in the details</Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.textLight} />
          </>
        )}
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or enter manually</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Medication Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Metformin"
          placeholderTextColor={Colors.textLight}
          returnKeyType="next"
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
          For personal tracking only. Always follow your healthcare provider's instructions.
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
        <Text style={styles.submitBtnText}>{isPending ? "Saving..." : "Save Medication"}</Text>
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
  cameraBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.forestDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cameraBannerSuccess: {
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.success + "44",
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.forestMid,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.goldPale,
    fontFamily: "Inter_600SemiBold",
  },
  bannerSub: {
    fontSize: 12,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.creamDark,
  },
  dividerText: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: "Inter_400Regular",
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
    textAlignVertical: "top" as const,
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
