import React from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useGetLabResult, useAnalyzeLabResult, useDeleteLabResult, getGetLabResultsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FadeIn, StaggerContainer, StaggerItem, Card, CardContent, Button, Badge } from "@/components/shared/UI";
import { formatDate, cn } from "@/lib/utils";
import { ArrowLeft, Trash2, Sparkles, AlertTriangle, CheckCircle2, ChevronRight, Activity, Leaf, ShieldAlert } from "lucide-react";
import WellnessPlan from "./WellnessPlan";

export default function LabResultDetail() {
  const [, params] = useRoute("/lab-results/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: result, isLoading } = useGetLabResult(id, { query: { enabled: !!id } });
  
  const analyzeMutation = useAnalyzeLabResult({
    mutation: {
      onSuccess: () => {
        // Refetch the detail
        queryClient.invalidateQueries({ queryKey: [`/api/lab-results/${id}`] });
      }
    }
  });

  const deleteMutation = useDeleteLabResult({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLabResultsQueryKey() });
        setLocation("/lab-results");
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="animate-pulse text-muted-foreground flex items-center gap-2">
          <Activity className="w-5 h-5" /> Loading details...
        </span>
      </div>
    );
  }

  if (!result) return <div className="p-8 text-center text-red-500">Result not found</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return "text-emerald-700 bg-emerald-100 border-emerald-200";
      case 'low': 
      case 'high': return "text-amber-800 bg-amber-100 border-amber-200";
      case 'critical-low':
      case 'critical-high': return "text-red-800 bg-red-100 border-red-200";
      default: return "text-gray-800 bg-gray-100 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'normal') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (status.includes('critical')) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    return <AlertTriangle className="w-4 h-4 text-amber-600" />;
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header Actions */}
      <FadeIn className="flex justify-between items-center">
        <Link href="/lab-results" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Results
        </Link>
        <Button 
          variant="ghost" 
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => {
            if (confirm("Are you sure you want to delete this lab result?")) {
              deleteMutation.mutate({ id });
            }
          }}
          isLoading={deleteMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </Button>
      </FadeIn>

      {/* Title Card */}
      <FadeIn>
        <Card className="overflow-hidden border-none shadow-lg shadow-black/5 bg-gradient-to-br from-white to-secondary/20">
          <CardContent className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2">{result.testName}</h1>
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                  <Badge variant="neutral">{formatDate(result.testDate)}</Badge>
                  {result.labName && <span>Lab: {result.labName}</span>}
                </div>
              </div>
              
              {!result.analysis && (
                <Button 
                  size="lg" 
                  className="w-full md:w-auto shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 rounded-2xl"
                  onClick={() => analyzeMutation.mutate({ id })}
                  isLoading={analyzeMutation.isPending}
                >
                  <Sparkles className="w-5 h-5 mr-2" /> Generate AI Insights
                </Button>
              )}
            </div>
            {result.notes && (
              <div className="mt-6 p-4 bg-white/60 rounded-xl text-sm text-foreground/80 border border-white">
                <strong>Notes:</strong> {result.notes}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Markers List */}
        <div className={cn("space-y-6", result.analysis ? "lg:col-span-5" : "lg:col-span-12")}>
          <h2 className="text-2xl font-display flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Marker Values
          </h2>
          <Card className="overflow-hidden shadow-md shadow-black/5">
            <ul className="divide-y divide-border">
              {result.markers.map((marker, i) => (
                <li key={i} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/[0.02] transition-colors">
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      {marker.name} {getStatusIcon(marker.status)}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Range: {marker.referenceRangeLow ?? '-'} - {marker.referenceRangeHigh ?? '-'} {marker.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                    <div className="text-xl font-display font-medium">
                      {marker.value} <span className="text-sm text-muted-foreground font-sans">{marker.unit}</span>
                    </div>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider", getStatusColor(marker.status))}>
                      {marker.status.replace('-', ' ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Column: AI Analysis */}
        {result.analysis && (
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-2xl font-display flex items-center gap-2 text-primary">
              <Sparkles className="w-6 h-6" /> AI Insights
            </h2>
            
            {/* Disclaimer */}
            <FadeIn>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-4 text-amber-900 shadow-sm">
                <ShieldAlert className="w-6 h-6 flex-shrink-0 text-amber-600" />
                <p className="text-sm leading-relaxed font-medium">
                  {result.analysis.disclaimer}
                </p>
              </div>
            </FadeIn>

            {/* Summary */}
            <FadeIn delay={0.1}>
              <Card className="shadow-md shadow-black/5 border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <h3 className="font-display text-xl mb-4 text-primary">Summary Overview</h3>
                  <p className="text-foreground/80 leading-relaxed text-lg">
                    {result.analysis.summary}
                  </p>
                </CardContent>
              </Card>
            </FadeIn>

            {/* Marker Insights Details */}
            {result.analysis.markerInsights.length > 0 && (
              <div className="space-y-4 pt-4">
                <h3 className="font-display text-xl text-foreground">Detailed Findings & Suggestions</h3>
                <StaggerContainer className="space-y-6">
                  {result.analysis.markerInsights.map((insight, idx) => (
                    <StaggerItem key={idx}>
                      <Card className="overflow-hidden border-border/80 shadow-sm">
                        <div className="bg-secondary/40 p-5 border-b border-border">
                          <h4 className="font-bold text-lg text-foreground mb-2">{insight.markerName}</h4>
                          <p className="text-foreground/80 text-sm mb-3"><strong>What it means:</strong> {insight.plainLanguageExplanation}</p>
                          <p className="text-foreground/80 text-sm"><strong>Why it matters:</strong> {insight.significance}</p>
                        </div>
                        {insight.suggestions.length > 0 && (
                          <div className="p-5 bg-white">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                              <Leaf className="w-4 h-4" /> Natural Suggestions
                            </h5>
                            <ul className="space-y-4">
                              {insight.suggestions.map((sug, sIdx) => (
                                <li key={sIdx} className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-foreground">{sug.title}</span>
                                    <Badge variant={sug.evidenceLevel === 'strong' ? 'success' : 'neutral'} className="text-[10px] px-2 py-0 h-5">
                                      {sug.evidenceLevel} evidence
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 capitalize border-muted bg-white text-muted-foreground">
                                      {sug.category}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-foreground/70">{sug.description}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Card>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Wellness Plan — full width, always available once analysis exists */}
      {result.analysis && (
        <FadeIn>
          <div className="border-t border-border pt-8">
            <WellnessPlan labResultId={id} testName={result.testName} />
          </div>
        </FadeIn>
      )}
    </div>
  );
}
