import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const labMarkerSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  referenceRangeLow: z.number().nullable().optional(),
  referenceRangeHigh: z.number().nullable().optional(),
  status: z.enum(["normal", "low", "high", "critical-low", "critical-high"]),
});
export type LabMarker = z.infer<typeof labMarkerSchema>;

export const naturalSuggestionSchema = z.object({
  category: z.enum(["supplement", "diet", "lifestyle", "exercise", "sleep", "stress"]),
  title: z.string(),
  description: z.string(),
  evidenceLevel: z.enum(["strong", "moderate", "emerging"]),
});
export type NaturalSuggestion = z.infer<typeof naturalSuggestionSchema>;

export const markerInsightSchema = z.object({
  markerName: z.string(),
  plainLanguageExplanation: z.string(),
  significance: z.string(),
  suggestions: z.array(naturalSuggestionSchema),
});
export type MarkerInsight = z.infer<typeof markerInsightSchema>;

export const labResultsTable = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  testName: text("test_name").notNull(),
  testDate: text("test_date").notNull(),
  labName: text("lab_name"),
  notes: text("notes"),
  markers: jsonb("markers").$type<LabMarker[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labAnalysesTable = pgTable("lab_analyses", {
  id: serial("id").primaryKey(),
  labResultId: integer("lab_result_id").notNull().references(() => labResultsTable.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  markerInsights: jsonb("marker_insights").$type<MarkerInsight[]>().notNull(),
  disclaimer: text("disclaimer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLabResultSchema = createInsertSchema(labResultsTable).omit({ id: true, createdAt: true }).extend({
  markers: z.array(labMarkerSchema),
});
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type LabResult = typeof labResultsTable.$inferSelect;
export type LabAnalysis = typeof labAnalysesTable.$inferSelect;
