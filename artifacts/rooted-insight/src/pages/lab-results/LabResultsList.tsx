import React, { useState } from "react";
import { Link } from "wouter";
import { useGetLabResults } from "@workspace/api-client-react";
import { FadeIn, StaggerContainer, StaggerItem, Card, CardContent, Button, Badge } from "@/components/shared/UI";
import { formatDate } from "@/lib/utils";
import { Activity, Plus, ChevronRight, AlertCircle, FileX, TrendingUp, List } from "lucide-react";
import TrendsView from "./TrendsView";

export default function LabResultsList() {
  const { data: results, isLoading, error } = useGetLabResults();
  const [view, setView] = useState<"list" | "trends">("list");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <Activity className="w-8 h-8 text-primary/40 mb-4 animate-bounce" />
          <p className="text-muted-foreground">Loading your insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800">Failed to load</h3>
        <p className="text-red-600 mt-2">Could not retrieve lab results. Please try again.</p>
      </div>
    );
  }

  const sortedResults = results
    ? [...results].sort(
        (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
      )
    : [];

  return (
    <div className="space-y-8 pb-12">
      <FadeIn className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display text-foreground">Lab Results</h1>
          <p className="text-muted-foreground mt-2">Your historical test data and AI-powered insights.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          {results && results.length > 0 && (
            <div className="flex items-center bg-muted/50 border border-border rounded-xl p-1 gap-1">
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === "list"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-4 h-4" /> Results
              </button>
              <button
                onClick={() => setView("trends")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === "trends"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Trends
              </button>
            </div>
          )}
          <Link href="/lab-results/add">
            <Button className="flex items-center gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5" /> Add Lab Result
            </Button>
          </Link>
        </div>
      </FadeIn>

      {view === "trends" ? (
        <TrendsView labResults={sortedResults} />
      ) : sortedResults.length === 0 ? (
        <FadeIn className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2rem] border border-border border-dashed">
          <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
            <FileX className="w-10 h-10 text-primary/40" />
          </div>
          <h3 className="text-2xl font-display text-foreground mb-2">No results yet</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Start tracking your health journey by entering or uploading your first lab result.
          </p>
          <Link href="/lab-results/add">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Add Lab Result
            </Button>
          </Link>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedResults.map((result) => {
            const outOfRange = result.markers.filter((m) => m.status !== "normal").length;
            const total = result.markers.length;

            return (
              <StaggerItem key={result.id}>
                <Link href={`/lab-results/${result.id}`}>
                  <Card className="h-full cursor-pointer hover:shadow-lg hover:border-primary/30 group transition-all duration-300">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {result.testName}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(result.testDate)}
                            {result.labName && ` • ${result.labName}`}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="mt-auto pt-6 border-t border-border flex items-center gap-3 flex-wrap">
                        <Badge variant="neutral">{total} Markers</Badge>
                        {outOfRange > 0 ? (
                          <Badge variant="warning">{outOfRange} Out of Range</Badge>
                        ) : (
                          <Badge variant="success">All Normal</Badge>
                        )}
                        {result.analysis && (
                          <Badge
                            variant="default"
                            className="ml-auto bg-primary/10 text-primary border-transparent"
                          >
                            Analysis Ready
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
