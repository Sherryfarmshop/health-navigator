import React, { useState, useRef } from "react";
import { Card, CardContent, Button, FadeIn } from "@/components/shared/UI";
import {
  ClipboardList,
  Sparkles,
  Copy,
  Check,
  Download,
  ChevronDown,
  Pill,
  Salad,
  Dumbbell,
  Moon,
  Wind,
  Stethoscope,
  Eye,
  Heart,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanStep {
  id: string;
  priority: "high" | "medium" | "low";
  marker: string;
  finding: string;
  action: string;
  actionDetail?: string;
  timeline: string;
  retestIn: string;
  category: string;
}

export interface WellnessPlanData {
  summary: string;
  generatedAt: string;
  testName: string;
  testDate: string;
  markers: any[];
  steps: PlanStep[];
  questionsForDoctor: string[];
}

type ExportFormat = "simple" | "checklist" | "doctor";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high: { label: "High Priority", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", badge: "bg-red-100 text-red-800 border-red-200" },
  medium: { label: "Medium Priority", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  low: { label: "Monitoring", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500", badge: "bg-green-100 text-green-800 border-green-200" },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  supplement: <Pill className="w-3.5 h-3.5" />,
  diet: <Salad className="w-3.5 h-3.5" />,
  exercise: <Dumbbell className="w-3.5 h-3.5" />,
  sleep: <Moon className="w-3.5 h-3.5" />,
  stress: <Wind className="w-3.5 h-3.5" />,
  medical: <Stethoscope className="w-3.5 h-3.5" />,
  monitoring: <Eye className="w-3.5 h-3.5" />,
  lifestyle: <Heart className="w-3.5 h-3.5" />,
};

const DISCLAIMER =
  "This wellness plan is for educational purposes only and does not constitute medical advice. Always consult your healthcare provider before making changes to your health regimen, supplements, or medications.";

// ─── Export Functions ─────────────────────────────────────────────────────────

function buildSimpleText(plan: WellnessPlanData): string {
  const lines: string[] = [
    "WELLNESS ACTION PLAN",
    "═══════════════════════════════════",
    `Test: ${plan.testName}`,
    `Date: ${plan.testDate}`,
    `Generated: ${plan.generatedAt}`,
    "",
    "SUMMARY",
    "───────────────────────────────────",
    plan.summary,
    "",
    "ACTION STEPS",
    "───────────────────────────────────",
  ];

  const ordered = [...plan.steps].sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority];
  });

  ordered.forEach((step, i) => {
    lines.push(`${i + 1}. [${step.priority.toUpperCase()}] ${step.marker}`);
    lines.push(`   Finding: ${step.finding}`);
    lines.push(`   Action: ${step.action}`);
    if (step.actionDetail) lines.push(`   Why: ${step.actionDetail}`);
    lines.push(`   When to start: ${step.timeline}`);
    lines.push(`   Retest in: ${step.retestIn}`);
    lines.push("");
  });

  if (plan.questionsForDoctor?.length) {
    lines.push("QUESTIONS FOR YOUR DOCTOR", "───────────────────────────────────");
    plan.questionsForDoctor.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push("");
  }

  lines.push("───────────────────────────────────", DISCLAIMER);
  return lines.join("\n");
}

function buildChecklistText(plan: WellnessPlanData): string {
  const lines: string[] = [
    "✦ WELLNESS CHECKLIST",
    `  ${plan.testName} — ${plan.testDate}`,
    "",
  ];

  const grouped: Record<string, PlanStep[]> = { high: [], medium: [], low: [] };
  plan.steps.forEach((s) => grouped[s.priority]?.push(s));

  const sections: { key: keyof typeof grouped; emoji: string; label: string }[] = [
    { key: "high", emoji: "🔴", label: "HIGH PRIORITY — Act Now" },
    { key: "medium", emoji: "🟡", label: "MEDIUM PRIORITY — This Month" },
    { key: "low", emoji: "🟢", label: "MAINTENANCE — Keep It Up" },
  ];

  sections.forEach(({ key, emoji, label }) => {
    if (!grouped[key]?.length) return;
    lines.push(`${emoji} ${label}`);
    grouped[key].forEach((step) => {
      lines.push(`  □ ${step.marker}`);
      lines.push(`      ${step.action}`);
      lines.push(`      📅 ${step.timeline}  |  🔄 Retest in ${step.retestIn}`);
      lines.push("");
    });
  });

  if (plan.questionsForDoctor?.length) {
    lines.push("🩺 QUESTIONS FOR YOUR DOCTOR");
    plan.questionsForDoctor.forEach((q) => lines.push(`  □ ${q}`));
    lines.push("");
  }

  lines.push("─────────────────────────────────────", DISCLAIMER);
  return lines.join("\n");
}

function buildDoctorReportHtml(plan: WellnessPlanData): string {
  const priorityColor = { high: "#dc2626", medium: "#d97706", low: "#16a34a" };
  const statusColor: Record<string, string> = {
    normal: "#16a34a", low: "#d97706", high: "#d97706",
    "critical-low": "#dc2626", "critical-high": "#dc2626",
  };

  const markersTable = plan.markers
    .map(
      (m: any) => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 12px;font-weight:500;">${m.name}</td>
      <td style="padding:8px 12px;font-weight:700;">${m.value} ${m.unit}</td>
      <td style="padding:8px 12px;color:#6b7280;">${m.referenceRangeLow ?? "—"}–${m.referenceRangeHigh ?? "—"} ${m.unit}</td>
      <td style="padding:8px 12px;">
        <span style="background:${statusColor[m.status] ?? "#6b7280"}22;color:${statusColor[m.status] ?? "#6b7280"};padding:2px 8px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;">
          ${m.status.replace("-", " ")}
        </span>
      </td>
    </tr>`
    )
    .join("");

  const stepsHtml = plan.steps
    .map(
      (step) => `
    <div style="margin-bottom:16px;padding:14px 16px;border-left:4px solid ${priorityColor[step.priority]};background:#fafafa;border-radius:0 8px 8px 0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="background:${priorityColor[step.priority]}22;color:${priorityColor[step.priority]};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">${step.priority}</span>
        <strong style="font-size:15px;">${step.marker}</strong>
      </div>
      <p style="margin:4px 0;color:#374151;font-size:13px;"><strong>Finding:</strong> ${step.finding}</p>
      <p style="margin:4px 0;color:#374151;font-size:13px;"><strong>Suggested action:</strong> ${step.action}</p>
      ${step.actionDetail ? `<p style="margin:4px 0;color:#6b7280;font-size:12px;font-style:italic;">${step.actionDetail}</p>` : ""}
      <p style="margin:4px 0;color:#374151;font-size:13px;"><strong>Timeline:</strong> ${step.timeline} &nbsp;|&nbsp; <strong>Retest in:</strong> ${step.retestIn}</p>
    </div>`
    )
    .join("");

  const questionsHtml = (plan.questionsForDoctor ?? [])
    .map((q, i) => `<li style="margin-bottom:8px;padding:8px 12px;background:#eff6ff;border-radius:6px;font-size:13px;">${i + 1}. ${q}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Doctor's Report — ${plan.testName}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; } }
    body { font-family: Georgia, serif; color: #111; margin: 0; padding: 0; background: #fff; }
    .page { max-width: 780px; margin: 0 auto; padding: 48px 40px; }
    h1 { font-size: 26px; color: #1a3a2a; border-bottom: 2px solid #1a3a2a; padding-bottom: 8px; }
    h2 { font-size: 18px; color: #1a3a2a; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #1a3a2a; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .disclaimer { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #92400e; margin-top: 32px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .summary-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 8px; font-size: 14px; line-height: 1.7; }
    ul { padding-left: 0; list-style: none; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  </style>
</head>
<body>
<div class="page">
  <h1>Health Report for Doctor's Visit</h1>
  <div class="meta">
    <strong>Test:</strong> ${plan.testName} &nbsp;|&nbsp;
    <strong>Date taken:</strong> ${plan.testDate} &nbsp;|&nbsp;
    <strong>Report generated:</strong> ${plan.generatedAt}
  </div>

  <h2>Summary</h2>
  <div class="summary-box">${plan.summary}</div>

  <h2>Lab Results</h2>
  <table>
    <thead><tr><th>Marker</th><th>My Value</th><th>Reference Range</th><th>Status</th></tr></thead>
    <tbody>${markersTable}</tbody>
  </table>

  <h2>Wellness Action Steps</h2>
  ${stepsHtml}

  <h2>Questions to Ask My Doctor</h2>
  <ul>${questionsHtml}</ul>

  <div class="disclaimer">
    <strong>⚠ Disclaimer:</strong> ${DISCLAIMER}
  </div>
  <div class="footer">Generated by Rooted Insight · For educational purposes only · Not a substitute for professional medical advice</div>
</div>
</body>
</html>`;
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printHtml(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  labResultId: number;
  testName: string;
}

export default function WellnessPlan({ labResultId, testName }: Props) {
  const [plan, setPlan] = useState<WellnessPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const generatePlan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/lab-results/${labResultId}/plan`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to generate plan");
      }
      const data = await res.json();
      setPlan(data);
      setChecked(new Set());
    } catch (e: any) {
      setError(e.message ?? "Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCopy = () => {
    if (!plan) return;
    navigator.clipboard.writeText(buildChecklistText(plan));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = (format: ExportFormat) => {
    if (!plan) return;
    setExportOpen(false);
    const safeName = testName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    if (format === "simple") {
      downloadText(buildSimpleText(plan), `wellness_plan_${safeName}.txt`);
    } else if (format === "checklist") {
      downloadText(buildChecklistText(plan), `wellness_checklist_${safeName}.txt`);
    } else {
      printHtml(buildDoctorReportHtml(plan));
    }
  };

  // Sort steps: high → medium → low
  const sortedSteps = plan
    ? [...plan.steps].sort((a, b) => {
        const rank = { high: 0, medium: 1, low: 2 };
        return rank[a.priority] - rank[b.priority];
      })
    : [];

  const completedCount = checked.size;
  const totalCount = sortedSteps.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" /> Wellness Plan
        </h2>
        {plan && (
          <div className="flex items-center gap-2">
            {/* Copy */}
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportOpen((v) => !v)}
                className="gap-1.5"
              >
                <Download className="w-4 h-4" /> Export
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </Button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors border-b border-border"
                    onClick={() => handleExport("simple")}
                  >
                    <p className="font-semibold">Simple Version</p>
                    <p className="text-xs text-muted-foreground">Clean text with action steps</p>
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors border-b border-border"
                    onClick={() => handleExport("checklist")}
                  >
                    <p className="font-semibold">Checklist Version</p>
                    <p className="text-xs text-muted-foreground">Color-coded priority checklist</p>
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                    onClick={() => handleExport("doctor")}
                  >
                    <p className="font-semibold text-primary">Doctor's Report (PDF)</p>
                    <p className="text-xs text-muted-foreground">
                      Lab values, explanations + questions to ask
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Regenerate */}
            <Button variant="ghost" size="sm" onClick={generatePlan} isLoading={loading} className="gap-1.5 text-muted-foreground">
              <Sparkles className="w-4 h-4" /> Regenerate
            </Button>
          </div>
        )}
      </div>

      {/* Not yet generated */}
      {!plan && !loading && (
        <FadeIn>
          <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5 shadow-none">
            <CardContent className="p-10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-display mb-1">Generate Your Action Plan</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  AI will create personalized, color-coded action steps based on your results — with specific
                  timelines, natural suggestions, and questions for your doctor.
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <Button size="lg" onClick={generatePlan} className="gap-2 mt-2 shadow-lg shadow-primary/20">
                <Sparkles className="w-5 h-5" /> Generate My Wellness Plan
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
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary" />
              </div>
              <p className="text-foreground font-medium">Building your personalized plan…</p>
              <p className="text-sm text-muted-foreground">AI is analyzing your results and creating action steps</p>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Plan content */}
      {plan && !loading && (
        <div className="space-y-6">
          {/* Progress bar */}
          {totalCount > 0 && (
            <FadeIn>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {completedCount}/{totalCount} completed
                </span>
              </div>
            </FadeIn>
          )}

          {/* Summary */}
          <FadeIn>
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 text-sm text-foreground/80 leading-relaxed">
              {plan.summary}
            </div>
          </FadeIn>

          {/* Steps */}
          <div className="space-y-3">
            {sortedSteps.map((step, idx) => {
              const cfg = PRIORITY_CONFIG[step.priority] ?? PRIORITY_CONFIG.low;
              const isChecked = checked.has(step.id);
              return (
                <FadeIn key={step.id} delay={idx * 0.04}>
                  <div
                    className={`rounded-2xl border transition-all duration-200 ${
                      isChecked
                        ? "opacity-60 bg-muted/30 border-border"
                        : `${cfg.bg} ${cfg.border}`
                    }`}
                  >
                    <div className="p-4 flex gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleCheck(step.id)}
                        className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-green-500 border-green-500"
                            : `border-current ${cfg.text} hover:bg-white/60`
                        }`}
                        aria-label={isChecked ? "Mark as incomplete" : "Mark as complete"}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        {/* Top row: marker + badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}
                          >
                            {cfg.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-white/80 border border-border px-2 py-0.5 rounded-full">
                            {CATEGORY_ICONS[step.category] ?? <HelpCircle className="w-3.5 h-3.5" />}
                            {step.category}
                          </span>
                        </div>

                        {/* Marker name + finding */}
                        <p className="font-bold text-foreground text-sm mb-0.5">{step.marker}</p>
                        <p className="text-xs text-muted-foreground italic mb-2">{step.finding}</p>

                        {/* Action */}
                        <p className={`font-semibold text-sm ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                          {step.action}
                        </p>
                        {step.actionDetail && !isChecked && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {step.actionDetail}
                          </p>
                        )}

                        {/* Timeline row */}
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-foreground">Start:</span> {step.timeline}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-foreground">Retest in:</span> {step.retestIn}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          {/* Questions for Doctor */}
          {plan.questionsForDoctor?.length > 0 && (
            <FadeIn>
              <Card className="border-blue-100 bg-blue-50/50 shadow-none">
                <CardContent className="p-6">
                  <h3 className="font-display text-lg mb-4 flex items-center gap-2 text-blue-900">
                    <Stethoscope className="w-5 h-5 text-blue-600" /> Questions to Ask Your Doctor
                  </h3>
                  <ul className="space-y-3">
                    {plan.questionsForDoctor.map((q, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-blue-800">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* Disclaimer */}
          <FadeIn>
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              {DISCLAIMER}
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
}
