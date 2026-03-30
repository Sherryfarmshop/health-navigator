import { pgTable, serial, jsonb, timestamp } from "drizzle-orm/pg-core";

export const symptomProfilesTable = pgTable("symptom_profiles", {
  id: serial("id").primaryKey(),
  selectedSymptoms: jsonb("selected_symptoms").notNull().default([]),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SymptomProfile = typeof symptomProfilesTable.$inferSelect;
