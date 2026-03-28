import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateLabResult, getGetLabResultsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FadeIn, Card, CardContent, Button, Input, Label } from "@/components/shared/UI";
import { Plus, Trash2, ArrowLeft, Beaker } from "lucide-react";
import { Link } from "wouter";

export default function AddLabResult() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [testName, setTestName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  
  const [markers, setMarkers] = useState([{
    name: "", value: "", unit: "", referenceRangeLow: "", referenceRangeHigh: "", status: "normal" as any
  }]);

  const createMutation = useCreateLabResult({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLabResultsQueryKey() });
        setLocation("/lab-results");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName || !testDate || markers.length === 0) return;

    // Build payload
    const payload = {
      testName,
      testDate,
      labName: labName || undefined,
      notes: notes || undefined,
      markers: markers.map(m => ({
        name: m.name,
        value: Number(m.value),
        unit: m.unit,
        referenceRangeLow: m.referenceRangeLow ? Number(m.referenceRangeLow) : undefined,
        referenceRangeHigh: m.referenceRangeHigh ? Number(m.referenceRangeHigh) : undefined,
        status: m.status
      }))
    };

    createMutation.mutate({ data: payload });
  };

  const addMarker = () => {
    setMarkers([...markers, { name: "", value: "", unit: "", referenceRangeLow: "", referenceRangeHigh: "", status: "normal" }]);
  };

  const updateMarker = (index: number, field: string, value: string) => {
    const newMarkers = [...markers];
    newMarkers[index] = { ...newMarkers[index], [field]: value };
    setMarkers(newMarkers);
  };

  const removeMarker = (index: number) => {
    if (markers.length > 1) {
      setMarkers(markers.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="flex items-center gap-4">
        <Link href="/lab-results" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-display text-foreground">Add Lab Result</h1>
          <p className="text-muted-foreground">Manually enter your latest test values.</p>
        </div>
      </div>

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
                    onChange={e => setTestName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="testDate">Date Taken *</Label>
                  <Input 
                    id="testDate" 
                    type="date" 
                    value={testDate}
                    onChange={e => setTestDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="labName">Laboratory Name</Label>
                  <Input 
                    id="labName" 
                    placeholder="e.g. Quest Diagnostics" 
                    value={labName}
                    onChange={e => setLabName(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input 
                    id="notes" 
                    placeholder="Fasting for 12 hours prior..." 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
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
                        onChange={e => updateMarker(idx, 'name', e.target.value)}
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
                        onChange={e => updateMarker(idx, 'value', e.target.value)}
                        required
                        className="h-10 text-sm font-semibold text-primary"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <Label className="text-xs">Unit</Label>
                      <Input 
                        placeholder="ng/mL" 
                        value={marker.unit} 
                        onChange={e => updateMarker(idx, 'unit', e.target.value)}
                        required
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Label className="text-xs">Status</Label>
                      <select 
                        className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        value={marker.status}
                        onChange={e => updateMarker(idx, 'status', e.target.value)}
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
                          type="number" step="any" placeholder="Min" 
                          value={marker.referenceRangeLow} 
                          onChange={e => updateMarker(idx, 'referenceRangeLow', e.target.value)}
                          className="h-10 text-xs px-2"
                        />
                      </div>
                      <div className="w-full">
                        <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Ref High</Label>
                        <Input 
                          type="number" step="any" placeholder="Max" 
                          value={marker.referenceRangeHigh} 
                          onChange={e => updateMarker(idx, 'referenceRangeHigh', e.target.value)}
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
            <Button type="button" variant="outline" size="lg" className="px-8">Cancel</Button>
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
