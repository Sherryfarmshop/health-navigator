import React, { useState } from "react";
import { Card, CardContent, Button, FadeIn, StaggerContainer, StaggerItem } from "@/components/shared/UI";
import {
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Info,
  FlaskConical,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY = {
  serious: {
    label: "Serious",
    bg: "bg-red-50",
    border: "border-red-300",
    stripe: "bg-red-500",
    badge: "bg-red-100 text-red-800 border-red-300",
    icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    headerBg: "bg-red-50",
  },
  moderate: {
    label: "Moderate",
    bg: "bg-amber-50",
    border: "border-amber-300",
    stripe: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    headerBg: "bg-amber-50",
  },
  mild: {
    label: "Mild",
    bg: "bg-sky-50",
    border: "border-sky-200",
    stripe: "bg-sky-400",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    icon: <Info className="w-5 h-5 text-sky-600" />,
    headerBg: "bg-sky-50",
  },
  informational: {
    label: "Info",
    bg: "bg-gray-50",
    border: "border-gray-200",
    stripe: "bg-gray-400",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <Info className="w-5 h-5 text-gray-500" />,
    headerBg: "bg-gray-50",
  },
} as const;

// ─── Single Interaction Card ──────────────────────────────────────────────────

function InteractionCard({ item }: { item: Interaction }) {
  const [expanded, setExpanded] = useState(item.severity === "serious" || item.severity === "moderate");
  const cfg = SEVERITY[item.severity] ?? SEVERITY.informational;

  return (
    <div className={cn("rounded-2xl border overflow-hidden shadow-sm", cfg.bg, cfg.border)}>
      {/* Left colored stripe + header */}
      <div className="flex">
        <div className={cn("w-1.5 flex-shrink-0", cfg.stripe)} />
        <div className="flex-1">
          <button
            className="w-full text-left p-4 flex items-start justify-between gap-3"
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide", cfg.badge)}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground bg-white/60 border border-border px-2 py-0.5 rounded-full capitalize">
                    {item.category}
                  </span>
                </div>
                <h4 className="font-bold text-foreground text-sm leading-snug">{item.effect}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.pair.join(" + ")}
                </p>
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            )}
          </button>

          {expanded && (
            <div className="px-4 pb-5 pt-0 space-y-4 border-t border-border/50">
              {/* Mechanism */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5" /> How It Works
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{item.mechanism}</p>
              </div>

              {/* Watch For */}
              {item.watchFor?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Watch For
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {item.watchFor.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-current mt-2 flex-shrink-0 opacity-60" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation */}
              <div className="bg-white/70 border border-white rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  What to Do
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{item.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  medicationCount: number;
}

export default function InteractionChecker({ medicationCount }: Props) {
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/medications/interactions", { method: "POST" });
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

  // Sort interactions: serious → moderate → mild → informational
  const sorted = result
    ? [...result.interactions].sort((a, b) => {
        const rank = { serious: 0, moderate: 1, mild: 2, informational: 3 };
        return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
      })
    : [];

  const hasSerious = sorted.some((i) => i.severity === "serious");
  const hasModerate = sorted.some((i) => i.severity === "moderate");

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-display flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" /> Interaction Checker
        </h2>
        {result && !loading && (
          <Button variant="ghost" size="sm" onClick={check} isLoading={loading} className="text-muted-foreground gap-1.5">
            <Sparkles className="w-4 h-4" /> Re-check
          </Button>
        )}
      </div>

      {/* Not enough meds */}
      {medicationCount < 2 && (
        <FadeIn>
          <div className="flex items-center gap-4 bg-muted/40 border border-border rounded-2xl p-5 text-muted-foreground text-sm">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Add at least 2 medications</p>
              <p>Once you have 2 or more medications listed, AI can check for any interactions between them.</p>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Generate button (when ≥2 meds and no result yet) */}
      {medicationCount >= 2 && !result && !loading && (
        <FadeIn>
          <Card className="border-dashed border-2 border-amber-200 bg-amber-50/30 shadow-none">
            <CardContent className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Zap className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-display mb-1">Check Your Medications</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  AI will review all {medicationCount} medications and supplements for known interactions —
                  including things like fish oil + aspirin affecting blood thinning.
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <Button size="lg" onClick={check} className="gap-2 mt-1 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20">
                <Zap className="w-5 h-5" /> Check for Interactions
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Loading */}
      {loading && (
        <FadeIn>
          <Card className="border-none bg-white shadow-sm">
            <CardContent className="p-10 flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-amber-200 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin" />
                <Zap className="absolute inset-0 m-auto w-6 h-6 text-amber-500" />
              </div>
              <p className="text-foreground font-medium">Checking for interactions…</p>
              <p className="text-sm text-muted-foreground">AI is reviewing all your medications and supplements</p>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Summary banner */}
          <FadeIn>
            {result.noInteractionsFound ? (
              <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-green-800">No known interactions found</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    Your current medications don't have documented interactions with each other — great news! Always keep your doctor informed about everything you take.
                  </p>
                </div>
              </div>
            ) : (
              <div className={cn(
                "flex items-start gap-4 rounded-2xl p-5 border",
                hasSerious ? "bg-red-50 border-red-200" : hasModerate ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-200"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  hasSerious ? "bg-red-100" : hasModerate ? "bg-amber-100" : "bg-sky-100"
                )}>
                  <AlertTriangle className={cn("w-5 h-5", hasSerious ? "text-red-600" : hasModerate ? "text-amber-600" : "text-sky-600")} />
                </div>
                <div>
                  <p className={cn("font-bold", hasSerious ? "text-red-900" : hasModerate ? "text-amber-900" : "text-sky-900")}>
                    {result.summary}
                  </p>
                  <p className={cn("text-sm mt-0.5", hasSerious ? "text-red-700" : hasModerate ? "text-amber-700" : "text-sky-700")}>
                    Review the interactions below and discuss with your healthcare provider at your next visit.
                  </p>
                </div>
              </div>
            )}
          </FadeIn>

          {/* Interaction cards */}
          {sorted.length > 0 && (
            <StaggerContainer className="space-y-3">
              {sorted.map((item, idx) => (
                <StaggerItem key={item.id ?? idx}>
                  <InteractionCard item={item} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          {/* Disclaimer */}
          <FadeIn>
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              This interaction check is for educational purposes only and does not constitute medical advice. Always tell your doctor and pharmacist about everything you take — including supplements, vitamins, and OTC medications.
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
}
