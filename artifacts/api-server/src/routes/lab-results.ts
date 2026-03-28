import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, labResultsTable, labAnalysesTable, insertLabResultSchema, labMarkerSchema } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod/v4";

const router: IRouter = Router();

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
