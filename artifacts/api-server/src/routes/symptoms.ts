import { Router, type IRouter } from "express";
import { db, symptomProfilesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/symptoms", async (req, res) => {
  try {
    const rows = await db.select().from(symptomProfilesTable).limit(1);
    if (rows.length === 0) {
      return res.json({ selectedSymptoms: [] });
    }
    res.json({ selectedSymptoms: rows[0].selectedSymptoms ?? [] });
  } catch (err) {
    req.log.error({ err }, "Failed to get symptom profile");
    res.status(500).json({ error: "Failed to get symptoms" });
  }
});

router.put("/symptoms", async (req, res) => {
  try {
    const { selectedSymptoms } = req.body;
    if (!Array.isArray(selectedSymptoms)) {
      return res.status(400).json({ error: "selectedSymptoms must be an array" });
    }

    const rows = await db.select().from(symptomProfilesTable).limit(1);
    if (rows.length === 0) {
      const [created] = await db
        .insert(symptomProfilesTable)
        .values({ selectedSymptoms, updatedAt: new Date() })
        .returning();
      return res.json({ selectedSymptoms: created.selectedSymptoms });
    }

    const [updated] = await db
      .update(symptomProfilesTable)
      .set({ selectedSymptoms, updatedAt: new Date() })
      .returning();
    res.json({ selectedSymptoms: updated.selectedSymptoms });
  } catch (err) {
    req.log.error({ err }, "Failed to save symptom profile");
    res.status(500).json({ error: "Failed to save symptoms" });
  }
});

export default router;
