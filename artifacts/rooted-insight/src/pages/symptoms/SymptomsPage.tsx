import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Zap, Brain, Utensils, Thermometer, Shield, Heart, Network,
  FlaskConical, Droplets, Wind, AlertCircle, Moon, Apple,
  ChevronDown, ChevronUp, Check, Sparkles, Save, Activity,
  LayoutGrid, BookOpen, Leaf,
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem, Card, CardContent, Button } from "@/components/shared/UI";
import { cn } from "@/lib/utils";
import { SYMPTOM_GROUPS, type SymptomGroup, type Category } from "./symptomData";

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-4 h-4" />,
  Brain: <Brain className="w-4 h-4" />,
  Salad: <Utensils className="w-4 h-4" />,
  Activity: <Activity className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  Heart: <Heart className="w-4 h-4" />,
  Cpu: <Network className="w-4 h-4" />,
  FlaskConical: <FlaskConical className="w-4 h-4" />,
  Droplets: <Droplets className="w-4 h-4" />,
  Wind: <Wind className="w-4 h-4" />,
  AlertCircle: <AlertCircle className="w-4 h-4" />,
  Moon: <Moon className="w-4 h-4" />,
  Thermometer: <Thermometer className="w-4 h-4" />,
};

// ─── Group config ─────────────────────────────────────────────────────────────

const GROUP_STYLES: Record<string, { bg: string; border: string; badge: string; icon: React.ReactNode; dot: string }> = {
  core: {
    bg: "bg-gradient-to-r from-emerald-700 to-primary",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    icon: <LayoutGrid className="w-5 h-5 text-white" />,
    dot: "bg-emerald-500",
  },
  advanced: {
    bg: "bg-gradient-to-r from-blue-700 to-blue-600",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    icon: <BookOpen className="w-5 h-5 text-white" />,
    dot: "bg-blue-500",
  },
  lifestyle: {
    bg: "bg-gradient-to-r from-amber-600 to-amber-500",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    icon: <Leaf className="w-5 h-5 text-white" />,
    dot: "bg-amber-500",
  },
};

// ─── Category Accordion ───────────────────────────────────────────────────────

function CategoryPanel({
  category,
  selectedSymptoms,
  onToggle,
  groupId,
}: {
  category: Category;
  selectedSymptoms: Set<string>;
  onToggle: (id: string) => void;
  groupId: string;
}) {
  const selectedCount = category.symptoms.filter((s) => selectedSymptoms.has(s.id)).length;
  const [open, setOpen] = useState(false);
  const gs = GROUP_STYLES[groupId] ?? GROUP_STYLES.core;

  return (
    <div className={cn("rounded-2xl border overflow-hidden bg-white shadow-sm transition-all", gs.border)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground", selectedCount > 0 ? gs.badge : "bg-muted/50")}>
            {ICON_MAP[category.icon] ?? <Activity className="w-4 h-4" />}
          </span>
          <span className="font-semibold text-foreground">{category.label}</span>
          {selectedCount > 0 && (
            <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", gs.badge)}>
              {selectedCount} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{category.symptoms.length} symptoms</span>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/50 px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {category.symptoms.map((symptom) => {
              const checked = selectedSymptoms.has(symptom.id);
              return (
                <button
                  key={symptom.id}
                  onClick={() => onToggle(symptom.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm transition-all",
                    checked
                      ? cn("font-medium", gs.badge)
                      : "text-foreground/70 hover:bg-muted/40"
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                    checked ? "bg-current border-current" : "border-border"
                  )}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </span>
                  {symptom.label}
                </button>
              );
            })}
          </div>
          {category.symptoms.length > 0 && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
              <button
                onClick={() => category.symptoms.forEach((s) => !selectedSymptoms.has(s.id) && onToggle(s.id))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Select all
              </button>
              {selectedCount > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <button
                    onClick={() => category.symptoms.filter((s) => selectedSymptoms.has(s.id)).forEach((s) => onToggle(s.id))}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group Section ────────────────────────────────────────────────────────────

function GroupSection({
  group,
  selectedSymptoms,
  onToggle,
}: {
  group: SymptomGroup;
  selectedSymptoms: Set<string>;
  onToggle: (id: string) => void;
}) {
  const allGroupSymptomIds = group.categories.flatMap((c) => c.symptoms.map((s) => s.id));
  const selectedInGroup = allGroupSymptomIds.filter((id) => selectedSymptoms.has(id)).length;
  const gs = GROUP_STYLES[group.id] ?? GROUP_STYLES.core;
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn("w-full rounded-2xl px-6 py-4 text-left flex items-center justify-between text-white shadow-md transition-all", gs.bg)}
      >
        <div className="flex items-center gap-3">
          {gs.icon}
          <div>
            <h3 className="font-display text-lg font-bold">{group.label}</h3>
            <p className="text-white/75 text-xs mt-0.5">{group.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedInGroup > 0 && (
            <span className="bg-white/25 text-white text-xs font-bold px-3 py-1 rounded-full">
              {selectedInGroup}
            </span>
          )}
          {open ? <ChevronUp className="w-5 h-5 text-white/80" /> : <ChevronDown className="w-5 h-5 text-white/80" />}
        </div>
      </button>

      {open && (
        <StaggerContainer className="space-y-3 pl-2">
          {group.categories.map((cat, idx) => (
            <StaggerItem key={cat.id} delay={idx * 0.03}>
              <CategoryPanel
                category={cat}
                selectedSymptoms={selectedSymptoms}
                onToggle={onToggle}
                groupId={group.id}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SymptomsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // Load saved symptoms
  useEffect(() => {
    fetch("/api/symptoms")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.selectedSymptoms)) {
          setSelected(new Set(data.selectedSymptoms));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-save on changes (debounced)
  const save = useCallback(async (ids: Set<string>) => {
    setSaveState("saving");
    try {
      await fetch("/api/symptoms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSymptoms: Array.from(ids) }),
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
    }
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

  const totalCount = selected.size;

  return (
    <div className="space-y-8 pb-16 max-w-3xl mx-auto">
      {/* Header */}
      <FadeIn className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display text-foreground">Symptom Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Check off what you're experiencing. Your profile helps personalize insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Save indicator */}
          <div className={cn(
            "flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all",
            saveState === "saved" ? "bg-green-50 text-green-700 border border-green-200" :
            saveState === "saving" ? "bg-muted text-muted-foreground" :
            "invisible"
          )}>
            {saveState === "saving" ? (
              <><Save className="w-4 h-4 animate-pulse" /> Saving…</>
            ) : (
              <><Check className="w-4 h-4" /> Saved</>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Summary Banner */}
      {totalCount > 0 && !loading && (
        <FadeIn>
          <Card className="border-none shadow-lg shadow-primary/5 bg-gradient-to-br from-white to-secondary/30">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-primary">{totalCount}</p>
                  <p className="text-muted-foreground text-sm">symptoms tracked across {SYMPTOM_GROUPS.flatMap(g => g.categories).filter(c => c.symptoms.some(s => selected.has(s.id))).length} categories</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_GROUPS.map((group) => {
                  const count = group.categories.flatMap((c) => c.symptoms).filter((s) => selected.has(s.id)).length;
                  if (count === 0) return null;
                  const gs = GROUP_STYLES[group.id];
                  return (
                    <span key={group.id} className={cn("text-xs font-semibold px-3 py-1.5 rounded-full", gs.badge)}>
                      {group.label.split("/")[0].trim()}: {count}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {SYMPTOM_GROUPS.map((group) => (
            <FadeIn key={group.id}>
              <GroupSection
                group={group}
                selectedSymptoms={selected}
                onToggle={toggleSymptom}
              />
            </FadeIn>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      {!loading && (
        <FadeIn>
          <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            This symptom tracker is for personal awareness and educational purposes only. It does not constitute a medical diagnosis. Always consult your healthcare provider for health concerns.
          </div>
        </FadeIn>
      )}
    </div>
  );
}
