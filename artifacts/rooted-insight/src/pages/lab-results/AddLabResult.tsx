import React, { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useCreateLabResult, getGetLabResultsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FadeIn, Card, CardContent, Button, Input, Label } from "@/components/shared/UI";
import { Plus, Trash2, ArrowLeft, Beaker, Upload, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Link } from "wouter";

interface ParsedMarker {
  name: string;
  value: number;
  unit: string;
  referenceRangeLow?: number | null;
  referenceRangeHigh?: number | null;
  status: string;
}

interface MarkerRow {
  name: string;
  value: string;
  unit: string;
  referenceRangeLow: string;
  referenceRangeHigh: string;
  status: string;
}

function blankMarker(): MarkerRow {
  return { name: "", value: "", unit: "", referenceRangeLow: "", referenceRangeHigh: "", status: "normal" };
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function AddLabResult() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [markers, setMarkers] = useState<MarkerRow[]>([blankMarker()]);

  const createMutation = useCreateLabResult({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLabResultsQueryKey() });
        setLocation("/lab-results");
      }
    }
  });

  const parseFile = useCallback(async (file: File) => {
    const supported = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
    if (!supported.includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, WebP, or HEIC image of your lab report.");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setUploadError("");
    setPreviewFile(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/lab-results/parse", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to parse image");
      }
      const data = await res.json();

      if (data.testName) setTestName(data.testName);
      if (data.testDate) setTestDate(data.testDate);
      if (data.labName) setLabName(data.labName);
      if (data.notes) setNotes(data.notes);
      if (Array.isArray(data.markers) && data.markers.length > 0) {
        setMarkers(
          data.markers.map((m: ParsedMarker) => ({
            name: m.name ?? "",
            value: String(m.value ?? ""),
            unit: m.unit ?? "",
            referenceRangeLow: m.referenceRangeLow != null ? String(m.referenceRangeLow) : "",
            referenceRangeHigh: m.referenceRangeHigh != null ? String(m.referenceRangeHigh) : "",
            status: m.status ?? "normal",
          }))
        );
      }
      setUploadState("success");
    } catch (err: any) {
      setUploadError(err.message ?? "Failed to parse lab report. Please try again or enter values manually.");
      setUploadState("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const clearUpload = () => {
    setUploadState("idle");
    setUploadError("");
    setPreviewFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName || !testDate || markers.length === 0) return;

    const payload = {
      testName,
      testDate,
      labName: labName || undefined,
      notes: notes || undefined,
      markers: markers
        .filter((m) => m.name && m.value)
        .map((m) => ({
          name: m.name,
          value: Number(m.value),
          unit: m.unit,
          referenceRangeLow: m.referenceRangeLow ? Number(m.referenceRangeLow) : undefined,
          referenceRangeHigh: m.referenceRangeHigh ? Number(m.referenceRangeHigh) : undefined,
          status: m.status as any,
        })),
    };

    createMutation.mutate({ data: payload });
  };

  const addMarker = () =>
    setMarkers([...markers, blankMarker()]);

  const updateMarker = (index: number, field: string, value: string) => {
    const next = [...markers];
    next[index] = { ...next[index], [field]: value };
    setMarkers(next);
  };

  const removeMarker = (index: number) => {
    if (markers.length > 1) setMarkers(markers.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="flex items-center gap-4">
        <Link href="/lab-results" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-display text-foreground">Add Lab Result</h1>
          <p className="text-muted-foreground">Upload a photo of your report, or enter values manually.</p>
        </div>
      </div>

      {/* Upload Zone */}
      <FadeIn>
        <Card className="shadow-sm border-none bg-white overflow-hidden">
          <CardContent className="p-8">
            <h2 className="text-xl font-display mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" /> Upload Lab Report
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Take a photo or upload an image of your lab report — AI will extract all the values automatically.
            </p>

            {uploadState === "idle" || uploadState === "error" ? (
              <>
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium text-foreground mb-1">Drop your lab report here</p>
                  <p className="text-sm text-muted-foreground">or click to browse — JPG, PNG, WebP, HEIC</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                {uploadState === "error" && (
                  <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </div>
                )}
              </>
            ) : uploadState === "uploading" ? (
              <div className="border-2 border-dashed border-primary/30 rounded-2xl p-12 text-center bg-primary/5">
                <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                <p className="font-medium text-foreground mb-1">Reading your lab report…</p>
                <p className="text-sm text-muted-foreground">AI is extracting all values. This takes a few seconds.</p>
              </div>
            ) : (
              <div className="flex items-start gap-4 bg-green-50 border border-green-100 rounded-2xl p-5">
                {previewFile && (
                  <img
                    src={previewFile}
                    alt="Lab report preview"
                    className="w-20 h-20 object-cover rounded-xl border border-green-200 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Lab report extracted!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Found {markers.length} marker{markers.length !== 1 ? "s" : ""}. Review and edit below before saving.
                  </p>
                </div>
                <button
                  onClick={clearUpload}
                  className="p-1.5 hover:bg-green-100 rounded-lg transition-colors flex-shrink-0"
                  title="Upload a different image"
                >
                  <X className="w-4 h-4 text-green-700" />
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2">or enter manually below</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <form onSubmit={handleSubmit} className="space-y-8">
        <FadeIn>
          <Card className="shadow-sm border-none bg-white">
            <CardContent className="p-8">
              <h2 className="text-xl font-display mb-6 border-b pb-2">Test Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="testName">Panel / Test Name *</Label>
                  <Input
                    id="testName"
                    placeholder="e.g. Comprehensive Metabolic Panel"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="testDate">Date Taken *</Label>
                  <Input
                    id="testDate"
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="labName">Laboratory Name</Label>
                  <Input
                    id="labName"
                    placeholder="e.g. Quest Diagnostics"
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Fasting for 12 hours prior..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display flex items-center gap-2">
              <Beaker className="w-5 h-5 text-primary" /> Markers
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addMarker} className="gap-2">
              <Plus className="w-4 h-4" /> Add Marker
            </Button>
          </div>

          <div className="space-y-4">
            {markers.map((marker, idx) => (
              <Card key={idx} className="overflow-hidden border-border/80 shadow-sm bg-white">
                <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-4 w-full">
                    <div className="col-span-2 md:col-span-2">
                      <Label className="text-xs">Marker Name</Label>
                      <Input
                        placeholder="e.g. Vitamin D"
                        value={marker.name}
                        onChange={(e) => updateMarker(idx, "name", e.target.value)}
                        required
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <Label className="text-xs">Value</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.0"
                        value={marker.value}
                        onChange={(e) => updateMarker(idx, "value", e.target.value)}
                        required
                        className="h-10 text-sm font-semibold text-primary"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <Label className="text-xs">Unit</Label>
                      <Input
                        placeholder="ng/mL"
                        value={marker.unit}
                        onChange={(e) => updateMarker(idx, "unit", e.target.value)}
                        required
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Label className="text-xs">Status</Label>
                      <select
                        className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        value={marker.status}
                        onChange={(e) => updateMarker(idx, "status", e.target.value)}
                      >
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                        <option value="high">High</option>
                        <option value="critical-low">Critically Low</option>
                        <option value="critical-high">Critically High</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex gap-2">
                      <div className="w-full">
                        <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Ref Low</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Min"
                          value={marker.referenceRangeLow}
                          onChange={(e) => updateMarker(idx, "referenceRangeLow", e.target.value)}
                          className="h-10 text-xs px-2"
                        />
                      </div>
                      <div className="w-full">
                        <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Ref High</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Max"
                          value={marker.referenceRangeHigh}
                          onChange={(e) => updateMarker(idx, "referenceRangeHigh", e.target.value)}
                          className="h-10 text-xs px-2"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50 p-2 h-auto rounded-full"
                    onClick={() => removeMarker(idx)}
                    disabled={markers.length === 1}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </FadeIn>

        <div className="flex justify-end gap-4 pt-6 border-t border-border">
          <Link href="/lab-results">
            <Button type="button" variant="outline" size="lg" className="px-8">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="lg"
            className="px-10 shadow-lg shadow-primary/20"
            isLoading={createMutation.isPending}
          >
            Save Result
          </Button>
        </div>
      </form>
    </div>
  );
}
