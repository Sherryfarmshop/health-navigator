export interface Symptom {
  id: string;
  label: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  symptoms: Symptom[];
}

export interface SymptomGroup {
  id: string;
  label: string;
  description: string;
  color: string;
  categories: Category[];
}

export const SYMPTOM_GROUPS: SymptomGroup[] = [
  {
    id: "core",
    label: "Core Body Systems",
    description: "Foundational systems that affect how you feel every day",
    color: "green",
    categories: [
      {
        id: "energy",
        label: "Energy",
        icon: "Zap",
        symptoms: [
          { id: "energy-fatigue", label: "Fatigue or Low Energy" },
          { id: "energy-afternoon-crash", label: "Afternoon Energy Crashes" },
          { id: "energy-exercise-intolerance", label: "Exercise Intolerance" },
          { id: "energy-wired-tired", label: "Wired but Tired (Can't Relax)" },
          { id: "energy-morning-sluggish", label: "Feeling Sluggish in the Morning" },
          { id: "energy-cold-extremities", label: "Cold Hands and Feet" },
          { id: "energy-no-motivation", label: "Lack of Motivation" },
        ],
      },
      {
        id: "brain-mood",
        label: "Brain / Mood",
        icon: "Brain",
        symptoms: [
          { id: "brain-fog", label: "Brain Fog" },
          { id: "brain-memory", label: "Memory Issues" },
          { id: "brain-concentration", label: "Trouble Concentrating" },
          { id: "brain-slow-thinking", label: "Slow Thinking" },
          { id: "brain-anxiety", label: "Anxiety or Excessive Worry" },
          { id: "brain-low-mood", label: "Low Mood / Depression" },
          { id: "brain-mood-swings", label: "Mood Swings" },
          { id: "brain-irritability", label: "Irritability" },
          { id: "brain-overwhelm", label: "Easily Overwhelmed" },
        ],
      },
      {
        id: "digestion",
        label: "Digestion",
        icon: "Salad",
        symptoms: [
          { id: "digest-bloating", label: "Bloating" },
          { id: "digest-gas", label: "Gas / Flatulence" },
          { id: "digest-constipation", label: "Constipation" },
          { id: "digest-diarrhea", label: "Diarrhea or Loose Stools" },
          { id: "digest-reflux", label: "Acid Reflux / Heartburn" },
          { id: "digest-nausea", label: "Nausea" },
          { id: "digest-food-sensitivities", label: "Food Sensitivities" },
          { id: "digest-slow-digestion", label: "Slow Digestion After Meals" },
          { id: "digest-ibs", label: "Abdominal Cramping" },
        ],
      },
      {
        id: "hormones",
        label: "Hormones",
        icon: "Activity",
        symptoms: [
          { id: "hormone-irregular-periods", label: "Irregular or Painful Periods" },
          { id: "hormone-pms", label: "PMS Symptoms" },
          { id: "hormone-hot-flashes", label: "Hot Flashes or Night Sweats" },
          { id: "hormone-low-libido", label: "Low Libido" },
          { id: "hormone-hair-loss", label: "Hair Thinning or Loss" },
          { id: "hormone-weight-gain", label: "Unexplained Weight Gain" },
          { id: "hormone-acne", label: "Hormonal Acne" },
          { id: "hormone-breast-tenderness", label: "Breast Tenderness" },
          { id: "hormone-dry-skin", label: "Dry Skin or Hair" },
        ],
      },
      {
        id: "immune",
        label: "Immune System",
        icon: "Shield",
        symptoms: [
          { id: "immune-frequent-illness", label: "Frequent Colds or Infections" },
          { id: "immune-slow-healing", label: "Slow Wound Healing" },
          { id: "immune-allergies", label: "Seasonal Allergies" },
          { id: "immune-autoimmune", label: "Autoimmune Flares" },
          { id: "immune-inflammation", label: "Chronic Low-Grade Inflammation" },
          { id: "immune-lymph-nodes", label: "Swollen Lymph Nodes" },
          { id: "immune-fever-prone", label: "Prone to Fever or Infection" },
        ],
      },
    ],
  },
  {
    id: "advanced",
    label: "Advanced / Optional",
    description: "Deeper systems — check these if you have specific concerns",
    color: "blue",
    categories: [
      {
        id: "cardiovascular",
        label: "Cardiovascular",
        icon: "Heart",
        symptoms: [
          { id: "cardio-palpitations", label: "Heart Palpitations" },
          { id: "cardio-chest-tightness", label: "Chest Tightness" },
          { id: "cardio-shortness-of-breath", label: "Shortness of Breath with Activity" },
          { id: "cardio-leg-swelling", label: "Leg or Ankle Swelling" },
          { id: "cardio-dizziness-standing", label: "Dizziness When Standing Up" },
          { id: "cardio-high-bp", label: "High Blood Pressure Awareness" },
        ],
      },
      {
        id: "nervous-system",
        label: "Nervous System",
        icon: "Cpu",
        symptoms: [
          { id: "neuro-tingling", label: "Tingling or Numbness" },
          { id: "neuro-tremors", label: "Tremors or Shaking" },
          { id: "neuro-dizziness", label: "Dizziness / Vertigo" },
          { id: "neuro-headaches", label: "Headaches or Migraines" },
          { id: "neuro-nerve-pain", label: "Burning or Shooting Nerve Pain" },
          { id: "neuro-light-sensitivity", label: "Light or Sound Sensitivity" },
        ],
      },
      {
        id: "detox-liver",
        label: "Detox / Liver Support",
        icon: "FlaskConical",
        symptoms: [
          { id: "liver-dark-urine", label: "Dark Urine" },
          { id: "liver-chemical-sensitivity", label: "Chemical or Fragrance Sensitivities" },
          { id: "liver-bitter-taste", label: "Bitter Taste in Mouth" },
          { id: "liver-body-odor", label: "Strong Body Odor" },
          { id: "liver-jaundice", label: "Skin Yellowing / Jaundice" },
          { id: "liver-nausea-fat", label: "Nausea After Fatty Foods" },
        ],
      },
      {
        id: "electrolytes",
        label: "Hydration / Electrolytes",
        icon: "Droplets",
        symptoms: [
          { id: "hydro-muscle-cramps", label: "Muscle Cramps" },
          { id: "hydro-excessive-thirst", label: "Excessive Thirst" },
          { id: "hydro-dry-mouth", label: "Dry Mouth or Lips" },
          { id: "hydro-frequent-urination", label: "Frequent Urination" },
          { id: "hydro-low-bp", label: "Low Blood Pressure Symptoms" },
          { id: "hydro-dark-urine", label: "Concentrated / Dark Urine" },
        ],
      },
      {
        id: "respiratory",
        label: "Respiratory",
        icon: "Wind",
        symptoms: [
          { id: "resp-chronic-cough", label: "Chronic Cough" },
          { id: "resp-wheezing", label: "Wheezing or Labored Breathing" },
          { id: "resp-nasal-congestion", label: "Nasal Congestion" },
          { id: "resp-post-nasal", label: "Post-Nasal Drip" },
          { id: "resp-shortness-rest", label: "Shortness of Breath at Rest" },
        ],
      },
    ],
  },
  {
    id: "lifestyle",
    label: "Lifestyle Inputs",
    description: "Daily habits and patterns that shape your health",
    color: "amber",
    categories: [
      {
        id: "stress",
        label: "Stress",
        icon: "AlertCircle",
        symptoms: [
          { id: "stress-high-daily", label: "High Daily Stress Levels" },
          { id: "stress-chronic-burnout", label: "Chronic Stress or Burnout" },
          { id: "stress-panic-attacks", label: "Panic Attacks" },
          { id: "stress-emotional-reactivity", label: "Emotional Reactivity" },
          { id: "stress-cant-unwind", label: "Difficulty Unwinding" },
          { id: "stress-jaw-clenching", label: "Jaw Clenching or Teeth Grinding" },
        ],
      },
      {
        id: "sleep",
        label: "Sleep Quality",
        icon: "Moon",
        symptoms: [
          { id: "sleep-trouble-falling", label: "Trouble Falling Asleep" },
          { id: "sleep-waking-night", label: "Waking During the Night" },
          { id: "sleep-unrefreshing", label: "Unrefreshing Sleep" },
          { id: "sleep-daytime-sleepiness", label: "Excessive Daytime Sleepiness" },
          { id: "sleep-restless-legs", label: "Restless Legs at Night" },
          { id: "sleep-vivid-dreams", label: "Vivid or Disturbing Dreams" },
        ],
      },
      {
        id: "diet",
        label: "Diet Habits",
        icon: "Salad",
        symptoms: [
          { id: "diet-high-sugar", label: "High Sugar or Refined Carb Intake" },
          { id: "diet-skipping-meals", label: "Skipping Meals or Fasting Issues" },
          { id: "diet-low-protein", label: "Low Protein Intake" },
          { id: "diet-processed-food", label: "High Processed Food Consumption" },
          { id: "diet-late-eating", label: "Eating Very Late at Night" },
          { id: "diet-poor-hydration", label: "Poor Daily Hydration" },
          { id: "diet-cravings", label: "Frequent Sugar or Salt Cravings" },
        ],
      },
    ],
  },
];

export const ALL_SYMPTOMS = SYMPTOM_GROUPS.flatMap((g) =>
  g.categories.flatMap((c) => c.symptoms)
);
