import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, medicationsTable, insertMedicationSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/medications", async (req, res) => {
  try {
    const meds = await db
      .select()
      .from(medicationsTable)
      .orderBy(medicationsTable.createdAt);
    res.json(meds);
  } catch (err) {
    req.log.error({ err }, "Failed to get medications");
    res.status(500).json({ error: "Failed to get medications" });
  }
});

router.post("/medications", async (req, res) => {
  try {
    const body = insertMedicationSchema.parse(req.body);
    const [created] = await db.insert(medicationsTable).values(body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create medication");
    res.status(400).json({ error: "Invalid medication data" });
  }
});

router.put("/medications/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const body = insertMedicationSchema.parse(req.body);
    const [updated] = await db
      .update(medicationsTable)
      .set(body)
      .where(eq(medicationsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Medication not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update medication");
    res.status(400).json({ error: "Invalid medication data" });
  }
});

router.delete("/medications/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(medicationsTable).where(eq(medicationsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete medication");
    res.status(500).json({ error: "Failed to delete medication" });
  }
});

export default router;
