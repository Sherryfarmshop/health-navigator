import React from "react";
import { Link } from "wouter";
import { useGetLabResults } from "@workspace/api-client-react";
import { useGetMedications } from "@workspace/api-client-react";
import { FadeIn, StaggerContainer, StaggerItem, Card, CardContent, Button } from "@/components/shared/UI";
import { formatDate } from "@/lib/utils";
import { Activity, Pill, Plus, ChevronRight, FlaskConical, Leaf, ShieldCheck } from "lucide-react";

export default function Dashboard() {
  const { data: labResults, isLoading: labLoading } = useGetLabResults();
  const { data: medications, isLoading: medsLoading } = useGetMedications();

  const recentResults = labResults
    ? [...labResults]
        .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())
        .slice(0, 3)
    : [];

  const totalAbnormal = labResults
    ? labResults.reduce((acc, r) => {
        const markers = r.markers as any[];
        return acc + markers.filter((m: any) => m.status !== "normal").length;
      }, 0)
    : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-8 text-white">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-white/70">
              <Leaf className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-widest">Welcome</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display mb-3">Your Health Dashboard</h1>
            <p className="text-white/80 max-w-lg leading-relaxed">
              Track your lab results and medications in one place. Get plain-language insights powered by AI to help you have more informed conversations with your healthcare provider.
            </p>
          </div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute right-24 bottom-0 w-40 h-40 bg-white/5 rounded-full translate-y-16" />
        </div>
      </FadeIn>

      {/* Stats Cards */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StaggerItem>
          <Card className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 rounded-2xl p-3">
              <FlaskConical className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Lab Results</p>
              <p className="text-3xl font-display text-foreground">
                {labLoading ? "—" : (labResults?.length ?? 0)}
              </p>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-6 flex items-center gap-4">
            <div className="bg-amber-100 rounded-2xl p-3">
              <Activity className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Abnormal Markers</p>
              <p className="text-3xl font-display text-foreground">
                {labLoading ? "—" : totalAbnormal}
              </p>
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-6 flex items-center gap-4">
            <div className="bg-emerald-100 rounded-2xl p-3">
              <Pill className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">Medications</p>
              <p className="text-3xl font-display text-foreground">
                {medsLoading ? "—" : (medications?.length ?? 0)}
              </p>
            </div>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Lab Results */}
        <FadeIn>
          <Card className="flex flex-col h-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl text-foreground">Recent Lab Results</h2>
              </div>
              <Link href="/lab-results">
                <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {labLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted/40 rounded-xl" />
                  ))}
                </div>
              ) : recentResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <FlaskConical className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No lab results yet.</p>
                  <Link href="/lab-results/add">
                    <Button variant="outline" size="sm" className="mt-4">Add your first result</Button>
                  </Link>
                </div>
              ) : (
                recentResults.map((result) => {
                  const markers = result.markers as any[];
                  const abnormal = markers.filter((m: any) => m.status !== "normal").length;
                  return (
                    <Link key={result.id} href={`/lab-results/${result.id}`}>
                      <div className="flex items-center justify-between p-4 rounded-xl hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/10">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{result.testName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(result.testDate)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {abnormal > 0 ? (
                            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2.5 py-1 rounded-full">
                              {abnormal} flagged
                            </span>
                          ) : (
                            <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2.5 py-1 rounded-full">
                              All normal
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
            {!labLoading && recentResults.length > 0 && (
              <div className="p-4 border-t border-border">
                <Link href="/lab-results/add">
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add New Lab Result
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </FadeIn>

        {/* Medications */}
        <FadeIn>
          <Card className="flex flex-col h-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                <h2 className="font-display text-xl text-foreground">Medications</h2>
              </div>
              <Link href="/medications">
                <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {medsLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 bg-muted/40 rounded-xl" />
                  ))}
                </div>
              ) : !medications || medications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Pill className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No medications tracked yet.</p>
                  <Link href="/medications">
                    <Button variant="outline" size="sm" className="mt-4">Add medication</Button>
                  </Link>
                </div>
              ) : (
                medications.slice(0, 5).map((med) => (
                  <div key={med.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{med.name}</p>
                      {med.dosage && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {med.dosage}{med.frequency ? ` · ${med.frequency}` : ""}
                        </p>
                      )}
                    </div>
                    {med.prescribedFor && (
                      <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full truncate max-w-[120px]">
                        {med.prescribedFor}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            {!medsLoading && medications && medications.length > 0 && (
              <div className="p-4 border-t border-border">
                <Link href="/medications">
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Medication
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </FadeIn>
      </div>

      {/* Disclaimer Banner */}
      <FadeIn>
        <div className="flex gap-4 items-start bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <ShieldCheck className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Educational Use Only</p>
            <p className="text-amber-800 text-sm mt-1 leading-relaxed">
              Rooted Insight is designed to help you understand your health data in plain language. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your healthcare provider with any questions.
            </p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
