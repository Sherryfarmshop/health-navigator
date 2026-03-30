import { Feather } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

// ─── Symptom Data ─────────────────────────────────────────────────────────────

interface Symptom { id: string; label: string }
interface Category { id: string; label: string; icon: string; symptoms: Symptom[] }
interface Group { id: string; label: string; shortLabel: string; symptoms: Symptom[]; categories: Category[] }

const GROUPS: Group[] = [
  {
    id: "core", label: "Core Body Systems", shortLabel: "Core",
    symptoms: [],
    categories: [
      { id: "energy", label: "Energy", icon: "zap", symptoms: [
        { id: "energy-fatigue", label: "Fatigue or Low Energy" },
        { id: "energy-afternoon-crash", label: "Afternoon Energy Crashes" },
        { id: "energy-exercise-intolerance", label: "Exercise Intolerance" },
        { id: "energy-wired-tired", label: "Wired but Tired (Can't Relax)" },
        { id: "energy-morning-sluggish", label: "Feeling Sluggish in the Morning" },
        { id: "energy-cold-extremities", label: "Cold Hands and Feet" },
        { id: "energy-no-motivation", label: "Lack of Motivation" },
      ]},
      { id: "brain-mood", label: "Brain / Mood", icon: "cpu", symptoms: [
        { id: "brain-fog", label: "Brain Fog" },
        { id: "brain-memory", label: "Memory Issues" },
        { id: "brain-concentration", label: "Trouble Concentrating" },
        { id: "brain-slow-thinking", label: "Slow Thinking" },
        { id: "brain-anxiety", label: "Anxiety or Excessive Worry" },
        { id: "brain-low-mood", label: "Low Mood / Depression" },
        { id: "brain-mood-swings", label: "Mood Swings" },
        { id: "brain-irritability", label: "Irritability" },
        { id: "brain-overwhelm", label: "Easily Overwhelmed" },
      ]},
      { id: "digestion", label: "Digestion", icon: "coffee", symptoms: [
        { id: "digest-bloating", label: "Bloating" },
        { id: "digest-gas", label: "Gas / Flatulence" },
        { id: "digest-constipation", label: "Constipation" },
        { id: "digest-diarrhea", label: "Diarrhea or Loose Stools" },
        { id: "digest-reflux", label: "Acid Reflux / Heartburn" },
        { id: "digest-nausea", label: "Nausea" },
        { id: "digest-food-sensitivities", label: "Food Sensitivities" },
        { id: "digest-slow-digestion", label: "Slow Digestion After Meals" },
        { id: "digest-ibs", label: "Abdominal Cramping" },
      ]},
      { id: "hormones", label: "Hormones", icon: "thermometer", symptoms: [
        { id: "hormone-irregular-periods", label: "Irregular or Painful Periods" },
        { id: "hormone-pms", label: "PMS Symptoms" },
        { id: "hormone-hot-flashes", label: "Hot Flashes or Night Sweats" },
        { id: "hormone-low-libido", label: "Low Libido" },
        { id: "hormone-hair-loss", label: "Hair Thinning or Loss" },
        { id: "hormone-weight-gain", label: "Unexplained Weight Gain" },
        { id: "hormone-acne", label: "Hormonal Acne" },
        { id: "hormone-breast-tenderness", label: "Breast Tenderness" },
        { id: "hormone-dry-skin", label: "Dry Skin or Hair" },
      ]},
      { id: "immune", label: "Immune System", icon: "shield", symptoms: [
        { id: "immune-frequent-illness", label: "Frequent Colds or Infections" },
        { id: "immune-slow-healing", label: "Slow Wound Healing" },
        { id: "immune-allergies", label: "Seasonal Allergies" },
        { id: "immune-autoimmune", label: "Autoimmune Flares" },
        { id: "immune-inflammation", label: "Chronic Low-Grade Inflammation" },
        { id: "immune-lymph-nodes", label: "Swollen Lymph Nodes" },
      ]},
    ],
  },
  {
    id: "advanced", label: "Advanced / Optional", shortLabel: "Advanced",
    symptoms: [],
    categories: [
      { id: "cardiovascular", label: "Cardiovascular", icon: "heart", symptoms: [
        { id: "cardio-palpitations", label: "Heart Palpitations" },
        { id: "cardio-chest-tightness", label: "Chest Tightness" },
        { id: "cardio-shortness-of-breath", label: "Shortness of Breath with Activity" },
        { id: "cardio-leg-swelling", label: "Leg or Ankle Swelling" },
        { id: "cardio-dizziness-standing", label: "Dizziness When Standing Up" },
        { id: "cardio-high-bp", label: "High Blood Pressure Awareness" },
      ]},
      { id: "nervous-system", label: "Nervous System", icon: "activity", symptoms: [
        { id: "neuro-tingling", label: "Tingling or Numbness" },
        { id: "neuro-tremors", label: "Tremors or Shaking" },
        { id: "neuro-dizziness", label: "Dizziness / Vertigo" },
        { id: "neuro-headaches", label: "Headaches or Migraines" },
        { id: "neuro-nerve-pain", label: "Burning or Shooting Nerve Pain" },
        { id: "neuro-light-sensitivity", label: "Light or Sound Sensitivity" },
      ]},
      { id: "detox-liver", label: "Detox / Liver Support", icon: "droplet", symptoms: [
        { id: "liver-dark-urine", label: "Dark Urine" },
        { id: "liver-chemical-sensitivity", label: "Chemical or Fragrance Sensitivities" },
        { id: "liver-bitter-taste", label: "Bitter Taste in Mouth" },
        { id: "liver-body-odor", label: "Strong Body Odor" },
        { id: "liver-jaundice", label: "Skin Yellowing / Jaundice" },
        { id: "liver-nausea-fat", label: "Nausea After Fatty Foods" },
      ]},
      { id: "electrolytes", label: "Hydration / Electrolytes", icon: "droplets", symptoms: [
        { id: "hydro-muscle-cramps", label: "Muscle Cramps" },
        { id: "hydro-excessive-thirst", label: "Excessive Thirst" },
        { id: "hydro-dry-mouth", label: "Dry Mouth or Lips" },
        { id: "hydro-frequent-urination", label: "Frequent Urination" },
        { id: "hydro-low-bp", label: "Low Blood Pressure Symptoms" },
      ]},
      { id: "respiratory", label: "Respiratory", icon: "wind", symptoms: [
        { id: "resp-chronic-cough", label: "Chronic Cough" },
        { id: "resp-wheezing", label: "Wheezing or Labored Breathing" },
        { id: "resp-nasal-congestion", label: "Nasal Congestion" },
        { id: "resp-post-nasal", label: "Post-Nasal Drip" },
        { id: "resp-shortness-rest", label: "Shortness of Breath at Rest" },
      ]},
    ],
  },
  {
    id: "lifestyle", label: "Lifestyle Inputs", shortLabel: "Lifestyle",
    symptoms: [],
    categories: [
      { id: "stress", label: "Stress", icon: "alert-circle", symptoms: [
        { id: "stress-high-daily", label: "High Daily Stress Levels" },
        { id: "stress-chronic-burnout", label: "Chronic Stress or Burnout" },
        { id: "stress-panic-attacks", label: "Panic Attacks" },
        { id: "stress-emotional-reactivity", label: "Emotional Reactivity" },
        { id: "stress-cant-unwind", label: "Difficulty Unwinding" },
        { id: "stress-jaw-clenching", label: "Jaw Clenching or Teeth Grinding" },
      ]},
      { id: "sleep", label: "Sleep Quality", icon: "moon", symptoms: [
        { id: "sleep-trouble-falling", label: "Trouble Falling Asleep" },
        { id: "sleep-waking-night", label: "Waking During the Night" },
        { id: "sleep-unrefreshing", label: "Unrefreshing Sleep" },
        { id: "sleep-daytime-sleepiness", label: "Excessive Daytime Sleepiness" },
        { id: "sleep-restless-legs", label: "Restless Legs at Night" },
        { id: "sleep-vivid-dreams", label: "Vivid or Disturbing Dreams" },
      ]},
      { id: "diet", label: "Diet Habits", icon: "shopping-cart", symptoms: [
        { id: "diet-high-sugar", label: "High Sugar or Refined Carb Intake" },
        { id: "diet-skipping-meals", label: "Skipping Meals or Fasting Issues" },
        { id: "diet-low-protein", label: "Low Protein Intake" },
        { id: "diet-processed-food", label: "High Processed Food Consumption" },
        { id: "diet-late-eating", label: "Eating Very Late at Night" },
        { id: "diet-poor-hydration", label: "Poor Daily Hydration" },
        { id: "diet-cravings", label: "Frequent Sugar or Salt Cravings" },
      ]},
    ],
  },
];

const GROUP_COLORS: Record<string, { header: string; badge: string; badgeText: string; dot: string }> = {
  core: { header: Colors.forest, badge: "#d1fae5", badgeText: "#065f46", dot: "#10b981" },
  advanced: { header: "#1d4ed8", badge: "#dbeafe", badgeText: "#1e40af", dot: "#3b82f6" },
  lifestyle: { header: "#b45309", badge: "#fef3c7", badgeText: "#92400e", dot: "#f59e0b" },
};

// ─── Category Item ────────────────────────────────────────────────────────────

function CategoryItem({
  category,
  selected,
  onToggle,
  groupId,
}: {
  category: Category;
  selected: Set<string>;
  onToggle: (id: string) => void;
  groupId: string;
}) {
  const [open, setOpen] = useState(false);
  const count = category.symptoms.filter((s) => selected.has(s.id)).length;
  const gc = GROUP_COLORS[groupId] ?? GROUP_COLORS.core;

  return (
    <View style={styles.catCard}>
      <Pressable
        style={styles.catHeader}
        onPress={() => setOpen((v) => !v)}
      >
        <View style={styles.catHeaderLeft}>
          <View style={[styles.catIcon, count > 0 && { backgroundColor: gc.badge }]}>
            <Feather name={category.icon as any} size={14} color={count > 0 ? gc.badgeText : Colors.textMid} />
          </View>
          <Text style={styles.catLabel}>{category.label}</Text>
          {count > 0 && (
            <View style={[styles.catBadge, { backgroundColor: gc.badge }]}>
              <Text style={[styles.catBadgeText, { color: gc.badgeText }]}>{count}</Text>
            </View>
          )}
        </View>
        <View style={styles.catHeaderRight}>
          <Text style={styles.catCount}>{category.symptoms.length}</Text>
          <Feather name={open ? "chevron-up" : "chevron-down"} size={14} color={Colors.textLight} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.symptomList}>
          {category.symptoms.map((symptom) => {
            const checked = selected.has(symptom.id);
            return (
              <Pressable
                key={symptom.id}
                style={[styles.symptomRow, checked && { backgroundColor: gc.badge + "66" }]}
                onPress={() => onToggle(symptom.id)}
              >
                <View style={[styles.checkbox, checked && { backgroundColor: gc.dot, borderColor: gc.dot }]}>
                  {checked && <Feather name="check" size={10} color={Colors.white} />}
                </View>
                <Text style={[styles.symptomLabel, checked && { color: Colors.textDark, fontFamily: "Inter_600SemiBold" }]}>
                  {symptom.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SymptomsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [activeGroup, setActiveGroup] = useState("core");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  useEffect(() => {
    fetch(`${BASE}/api/symptoms`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.selectedSymptoms)) {
          setSelected(new Set(data.selectedSymptoms));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (ids: Set<string>) => {
    try {
      await fetch(`${BASE}/api/symptoms`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSymptoms: Array.from(ids) }),
      });
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    } catch {}
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(selected), 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selected, save]);

  const toggleSymptom = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const currentGroup = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0];
  const totalCount = selected.size;

  if (loading) {
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
        <View>
          <Text style={styles.title}>Symptoms</Text>
          <Text style={styles.subtitle}>
            {totalCount > 0 ? `${totalCount} symptom${totalCount !== 1 ? "s" : ""} tracked` : "Tap categories to check symptoms"}
          </Text>
        </View>
        {saveIndicator && (
          <View style={styles.savedBadge}>
            <Feather name="check" size={12} color="#15803d" />
            <Text style={styles.savedText}>Saved</Text>
          </View>
        )}
      </View>

      {/* Group Tab Pills */}
      <View style={styles.tabRow}>
        {GROUPS.map((g) => {
          const gc = GROUP_COLORS[g.id];
          const groupCount = g.categories.flatMap((c) => c.symptoms).filter((s) => selected.has(s.id)).length;
          const isActive = activeGroup === g.id;
          return (
            <Pressable
              key={g.id}
              style={({ pressed }) => [
                styles.tabPill,
                isActive && { backgroundColor: gc.header },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => setActiveGroup(g.id)}
            >
              <Text style={[styles.tabText, isActive && { color: Colors.cream }]}>
                {g.shortLabel}
              </Text>
              {groupCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : gc.badge }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? Colors.cream : gc.badgeText }]}>
                    {groupCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Group Label */}
      <View style={[styles.groupLabelRow, { backgroundColor: GROUP_COLORS[currentGroup.id].header + "18" }]}>
        <View style={[styles.groupDot, { backgroundColor: GROUP_COLORS[currentGroup.id].dot }]} />
        <Text style={[styles.groupLabel, { color: GROUP_COLORS[currentGroup.id].header }]}>
          {currentGroup.label}
        </Text>
      </View>

      {/* Category List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 100 }]}
      >
        {currentGroup.categories.map((cat) => (
          <CategoryItem
            key={cat.id}
            category={cat}
            selected={selected}
            onToggle={toggleSymptom}
            groupId={currentGroup.id}
          />
        ))}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Feather name="alert-circle" size={12} color="#92400e" />
          <Text style={styles.disclaimerText}>
            For personal awareness and educational purposes only. Not a medical diagnosis. Always consult your healthcare provider.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.cream },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8,
  },
  title: { fontSize: 26, fontWeight: "700", color: Colors.forest, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, color: Colors.textMid, fontFamily: "Inter_400Regular", marginTop: 2 },
  savedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f0fdf4", borderColor: "#86efac", borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  savedText: { fontSize: 12, color: "#15803d", fontFamily: "Inter_600SemiBold" },

  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  tabPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.creamDark,
  },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.textMid, fontFamily: "Inter_600SemiBold" },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  tabBadgeText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },

  groupLabelRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: 4,
  },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupLabel: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },

  catCard: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: "hidden",
    shadowColor: Colors.forest, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
    marginBottom: 10,
  },
  catHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 13,
  },
  catHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  catIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.creamDark, justifyContent: "center", alignItems: "center" },
  catLabel: { fontSize: 15, fontWeight: "600", color: Colors.textDark, fontFamily: "Inter_600SemiBold", flex: 1 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  catBadgeText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  catHeaderRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  catCount: { fontSize: 12, color: Colors.textLight, fontFamily: "Inter_400Regular" },

  symptomList: { borderTopWidth: 1, borderTopColor: Colors.creamDark, paddingVertical: 4 },
  symptomRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    borderColor: Colors.creamDark, justifyContent: "center", alignItems: "center",
  },
  symptomLabel: { fontSize: 14, color: Colors.textMid, fontFamily: "Inter_400Regular", flex: 1 },

  disclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#fffbeb", borderRadius: 12, borderWidth: 1, borderColor: "#fcd34d",
    padding: 12, marginTop: 8,
  },
  disclaimerText: { fontSize: 11, color: "#92400e", fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },
});
