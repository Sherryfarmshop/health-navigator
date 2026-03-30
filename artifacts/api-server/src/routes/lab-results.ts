import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import multer from "multer";
import { db, labResultsTable, labAnalysesTable, insertLabResultSchema, labMarkerSchema } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod/v4";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/lab-results/parse", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const mimeType = req.file.mimetype;
  const supported = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
  if (!supported.includes(mimeType)) {
    return res.status(400).json({ error: "Unsupported file type. Please upload a JPG, PNG, WebP, or HEIC image." });
  }

  try {
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: "You are a precise medical data extraction assistant. Extract lab result data from images of lab reports accurately. Return only valid JSON with no markdown.",
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
              text: `Extract all lab test data from this image and return it as JSON with this exact structure:
{
  "testName": "name of the lab panel or test (e.g. Comprehensive Metabolic Panel)",
  "testDate": "date in YYYY-MM-DD format, or today if not visible",
  "labName": "name of laboratory if visible, or null",
  "notes": "any relevant notes from the report, or null",
  "markers": [
    {
      "name": "marker name",
      "value": 0.0,
      "unit": "unit string",
      "referenceRangeLow": 0.0,
      "referenceRangeHigh": 0.0,
      "status": "normal|low|high|critical-low|critical-high"
    }
  ]
}

Rules:
- Extract every individual marker/test value you can see
- value must be a number (not a string)
- referenceRangeLow and referenceRangeHigh must be numbers or null if not shown
- status: "normal" if within range, "low" if below range, "high" if above range, "critical-low" or "critical-high" for critical flags
- If the report shows H or L flags next to values, use "high" or "low"
- If the report shows critical flags (HH, LL, CRIT), use "critical-high" or "critical-low"
- testDate: extract from the report; format as YYYY-MM-DD`,
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
    req.log.error({ err }, "Failed to parse lab report image");
    res.status(500).json({ error: "Failed to parse lab report. Please try again or enter values manually." });
  }
});

router.get("/lab-results", async (req, res) => {
  try {
    const results = await db
      .select()
      .from(labResultsTable)
      .orderBy(labResultsTable.createdAt);

    const analyses = await db.select().from(labAnalysesTable);
    const analysisMap = new Map(analyses.map((a) => [a.labResultId, a]));

    const enriched = results.map((r) => ({
      ...r,
      analysis: analysisMap.get(r.id) ?? null,
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to get lab results");
    res.status(500).json({ error: "Failed to get lab results" });
  }
});

router.post("/lab-results", async (req, res) => {
  try {
    const body = insertLabResultSchema.parse(req.body);
    const [created] = await db.insert(labResultsTable).values(body).returning();
    res.status(201).json({ ...created, analysis: null });
  } catch (err) {
    req.log.error({ err }, "Failed to create lab result");
    res.status(400).json({ error: "Invalid lab result data" });
  }
});

router.get("/lab-results/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [result] = await db
      .select()
      .from(labResultsTable)
      .where(eq(labResultsTable.id, id));
    if (!result) return res.status(404).json({ error: "Lab result not found" });

    const [analysis] = await db
      .select()
      .from(labAnalysesTable)
      .where(eq(labAnalysesTable.labResultId, id));

    res.json({ ...result, analysis: analysis ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to get lab result");
    res.status(500).json({ error: "Failed to get lab result" });
  }
});

router.delete("/lab-results/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.delete(labResultsTable).where(eq(labResultsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete lab result");
    res.status(500).json({ error: "Failed to delete lab result" });
  }
});

router.post("/lab-results/:id/analyze", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [labResult] = await db
      .select()
      .from(labResultsTable)
      .where(eq(labResultsTable.id, id));
    if (!labResult) return res.status(404).json({ error: "Lab result not found" });

    const markersText = (labResult.markers as any[])
      .map(
        (m: any) =>
          `- ${m.name}: ${m.value} ${m.unit} (Status: ${m.status}, Reference: ${m.referenceRangeLow ?? "N/A"} - ${m.referenceRangeHigh ?? "N/A"} ${m.unit})`
      )
      .join("\n");

    const prompt = `You are a health education assistant. Analyze these lab results and provide plain-language explanations and evidence-based natural suggestions for any values that are outside the normal range. Be educational, not prescriptive.

Lab Test: ${labResult.testName}
Date: ${labResult.testDate}

Lab Markers:
${markersText}

Respond in this exact JSON format:
{
  "summary": "A 2-3 sentence overall summary of the results in simple language",
  "markerInsights": [
    {
      "markerName": "name of marker",
      "plainLanguageExplanation": "What this marker measures in simple terms",
      "significance": "Why this value matters and what it might indicate",
      "suggestions": [
        {
          "category": "supplement|diet|lifestyle|exercise|sleep|stress",
          "title": "Short title",
          "description": "Evidence-based suggestion description",
          "evidenceLevel": "strong|moderate|emerging"
        }
      ]
    }
  ],
  "disclaimer": "This information is for educational purposes only and is not medical advice. Always consult your healthcare provider before making any changes to your health regimen."
}

Only include markerInsights for markers that are outside the normal range (low, high, critical-low, or critical-high). If all markers are normal, still provide the summary but return an empty markerInsights array.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content:
            "You are a health education assistant. You provide plain-language explanations of lab results and evidence-based natural wellness suggestions. You are never prescriptive and always encourage consulting a healthcare provider.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(responseText);

    const [existingAnalysis] = await db
      .select()
      .from(labAnalysesTable)
      .where(eq(labAnalysesTable.labResultId, id));

    let analysis;
    if (existingAnalysis) {
      [analysis] = await db
        .update(labAnalysesTable)
        .set({
          summary: parsed.summary,
          markerInsights: parsed.markerInsights ?? [],
          disclaimer: parsed.disclaimer,
          createdAt: new Date(),
        })
        .where(eq(labAnalysesTable.id, existingAnalysis.id))
        .returning();
    } else {
      [analysis] = await db
        .insert(labAnalysesTable)
        .values({
          labResultId: id,
          summary: parsed.summary,
          markerInsights: parsed.markerInsights ?? [],
          disclaimer: parsed.disclaimer,
        })
        .returning();
    }

    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "Failed to analyze lab result");
    res.status(500).json({ error: "Failed to analyze lab result" });
  }
});

export default router;
