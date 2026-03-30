import React, { useState, useRef, useCallback } from "react";
import { useGetMedications, useCreateMedication, useUpdateMedication, useDeleteMedication, getGetMedicationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FadeIn, StaggerContainer, StaggerItem, Card, CardContent, Button, Input, Label, Badge } from "@/components/shared/UI";
import { Pill, Plus, Calendar, User, Trash2, Edit3, X, Camera, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <FadeIn className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-secondary/20">
          <h2 className="text-2xl font-display text-primary">{title}</h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
      </FadeIn>
    </div>
  );
};

type ParseState = "idle" | "uploading" | "success" | "error";

const emptyForm = { name: "", dosage: "", frequency: "", prescribedFor: "", prescribedBy: "", startDate: "", notes: "" };

export default function MedicationsList() {
  const { data: medications, isLoading } = useGetMedications();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [parseState, setParseState] = useState<ParseState>("idle");
  const [parseError, setParseError] = useState("");

  const createMut = useCreateMedication({ onSuccess: () => onSuccessMutation() });
  const updateMut = useUpdateMedication({ onSuccess: () => onSuccessMutation() });
  const deleteMut = useDeleteMedication({ onSuccess: () => onSuccessMutation() });

  const onSuccessMutation = () => {
    queryClient.invalidateQueries({ queryKey: getGetMedicationsQueryKey() });
    closeModal();
  };

  const openAdd = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setParseState("idle");
    setParseError("");
    setIsModalOpen(true);
  };

  const openEdit = (med: any) => {
    setFormData({
      name: med.name,
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      prescribedFor: med.prescribedFor || "",
      prescribedBy: med.prescribedBy || "",
      startDate: med.startDate || "",
      notes: med.notes || "",
    });
    setEditingId(med.id);
    setParseState("idle");
    setParseError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setParseState("idle");
    setParseError("");
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supported = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
    if (!supported.includes(file.type)) {
      setParseError("Please upload a JPG, PNG, WebP, or HEIC image.");
      setParseState("error");
      return;
    }

    setParseState("uploading");
    setParseError("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/medications/parse", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to read label");
      }
      const data = await res.json();
      setFormData({
        name: data.name ?? "",
        dosage: data.dosage ?? "",
        frequency: data.frequency ?? "",
        prescribedFor: data.prescribedFor ?? "",
        prescribedBy: data.prescribedBy ?? "",
        startDate: data.startDate ?? "",
        notes: data.notes ?? "",
      });
      setParseState("success");
    } catch (err: any) {
      setParseError(err.message ?? "Could not read the label. Please enter details manually.");
      setParseState("error");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const payload = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, v === "" ? undefined : v])
    ) as any;
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload });
    } else {
      createMut.mutate({ data: payload });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <FadeIn className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display text-foreground">Medications</h1>
          <p className="text-muted-foreground mt-2">Track your current prescriptions and supplements.</p>
        </div>
        <Button onClick={openAdd} className="shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5 mr-2" /> Add Medication
        </Button>
      </FadeIn>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !medications || medications.length === 0 ? (
        <FadeIn className="text-center p-12 bg-white rounded-3xl border border-dashed border-border mt-8">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Pill className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-display mb-2">No medications listed</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Keep track of everything you're taking in one safe place.
          </p>
          <Button variant="outline" onClick={openAdd}>
            Add your first medication
          </Button>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {medications.map((med) => (
            <StaggerItem key={med.id}>
              <Card className="h-full hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group border-border">
                <CardContent className="p-6 flex flex-col h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => openEdit(med)} className="p-2 bg-white rounded-full shadow hover:text-primary">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this medication?")) deleteMut.mutate({ id: med.id }); }}
                      className="p-2 bg-white rounded-full shadow hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground pr-12">{med.name}</h3>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {med.dosage && <Badge variant="neutral" className="bg-gray-100">{med.dosage}</Badge>}
                        {med.frequency && <Badge variant="neutral" className="bg-primary/5 text-primary border-transparent">{med.frequency}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 mt-4 text-sm text-foreground/80 flex-1">
                    {med.prescribedFor && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium min-w-[80px] text-muted-foreground">For:</span>
                        <span>{med.prescribedFor}</span>
                      </div>
                    )}
                    {med.prescribedBy && (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{med.prescribedBy}</span>
                      </div>
                    )}
                    {med.startDate && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>Started {formatDate(med.startDate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Edit Medication" : "Add Medication"}>
        {/* Photo Upload Strip */}
        {!editingId && (
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />

            {parseState === "uploading" ? (
              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Reading your medication label…</p>
                  <p className="text-xs text-muted-foreground">AI is extracting the details</p>
                </div>
              </div>
            ) : parseState === "success" ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-4">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800">Label scanned successfully!</p>
                  <p className="text-xs text-green-600">Details pre-filled below — review and edit as needed</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-green-700 hover:underline"
                >
                  Rescan
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/30 hover:border-primary/50 rounded-2xl p-4 transition-all text-left"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Scan Medication Label</p>
                  <p className="text-xs text-muted-foreground">Upload a photo — AI fills in the details automatically</p>
                </div>
              </button>
            )}

            {parseState === "error" && (
              <div className="mt-2 flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs">{parseError}</p>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4 mb-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2">or enter manually</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Medication Name *</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Levothyroxine"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dosage</Label>
              <Input
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g. 50mcg"
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Input
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="e.g. Once daily"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prescribed For</Label>
              <Input
                value={formData.prescribedFor}
                onChange={(e) => setFormData({ ...formData, prescribedFor: e.target.value })}
                placeholder="e.g. Hypothyroidism"
              />
            </div>
            <div>
              <Label>Prescribing Doctor</Label>
              <Input
                value={formData.prescribedBy}
                onChange={(e) => setFormData({ ...formData, prescribedBy: e.target.value })}
                placeholder="Dr. Smith"
              />
            </div>
          </div>
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Take on an empty stomach"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMut.isPending || updateMut.isPending}>
              Save Medication
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
