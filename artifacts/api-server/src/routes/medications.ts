import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import multer from "multer";
import { db, medicationsTable, insertMedicationSchema } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/medications/parse", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const supported = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
  if (!supported.includes(req.file.mimetype)) {
    return res.status(400).json({ error: "Unsupported file type. Please upload a JPG, PNG, WebP, or HEIC image." });
  }

  try {
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: "You are a precise medication label reader. Extract medication information from pill bottle labels, prescription bottles, or medication packaging. Return only valid JSON with no markdown.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
            {
              type: "text",
              text: `Read this medication label or packaging and extract all visible information. Return JSON with this exact structure:
{
  "name": "medication name (generic or brand)",
  "dosage": "dosage strength e.g. 500mg, 10mcg",
  "frequency": "how often to take it, if shown e.g. Once daily, Twice daily",
  "prescribedFor": "condition it treats, if visible",
  "prescribedBy": "prescribing doctor name, if visible",
  "startDate": "fill date or start date in YYYY-MM-DD format, or null",
  "notes": "any important instructions visible e.g. Take with food, or null"
}

Rules:
- name is required, extract it from the largest text or Rx label
- If a field is not visible on the label, set it to null
- Do not guess or infer information not clearly shown
- For frequency, look for "Take X tablet(s) Y times daily" or similar instructions`,
            },
          ],
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? "{}";
    const cleanText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanText);
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to parse medication label");
    res.status(500).json({ error: "Failed to read the medication label. Please try again or enter details manually." });
  }
});

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
