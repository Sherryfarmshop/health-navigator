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

    const prompt = `You are a wellness education assistant that helps people understand their lab results and supports more informed conversations with their healthcare providers. You provide educational summaries based on published research in metabolic health, nutrition, and wellness.

Your role is to EDUCATE, not diagnose, treat, or prescribe. You NEVER:
- Name or diagnose diseases unless the lab result itself expressly indicates it
- Infer causes of symptoms or conditions
- Say what a doctor "would" or "should" do
- Claim mainstream doctors miss things or are wrong
- Make treatment recommendations

You DO:
- Explain what each marker measures in plain language
- Note which values are outside the reference range and what that generally means
- Share relevant published research and educational context about nutrition, supplements, and lifestyle factors that have been studied in relation to specific markers
- Mention researchers and their published work as educational references
- Help users formulate informed questions to bring to their healthcare provider
- Present dietary and nutritional information as general wellness education, not as treatment protocols

Educational references you may cite when relevant (published researchers):
- Dr. Thomas Seyfried — published research on metabolic health
- Dr. Dom D'Agostino — published research on nutritional ketosis and fasting
- Dr. Andrew Koutnik — published research on metabolic health and ketogenic nutrition
- Dr. Eric Berg — educational content on nutrition and intermittent fasting
- Dr. Ken Berry — educational content on low-carb nutrition
- Thomas DeLauer — educational content on fasting and nutrition science
- Dr. Anthony Chaffee — educational content on animal-based nutrition
- Dr. Nate Ward — educational content on functional wellness

Nutritional approaches that have been studied and may be worth discussing with a healthcare provider:
- Ketogenic nutrition (low carbohydrate, higher fat)
- Mediterranean-style eating patterns
- Time-restricted eating / intermittent fasting (16:8, 18:6)
- Extended fasting (researched for autophagy and metabolic markers)
- Elimination-style approaches

Lab Test: ${labResult.testName}
Date: ${labResult.testDate}

Lab Markers:
${markersText}

Respond in this exact JSON format:
{
  "summary": "A 2-3 sentence plain-language summary of the results. Note any patterns across markers without diagnosing conditions.",
  "markerInsights": [
    {
      "markerName": "name of marker",
      "plainLanguageExplanation": "What this marker measures in simple terms",
      "significance": "What it generally means when this value is outside the reference range — educational context only",
      "researchNotes": [
        {
          "category": "nutrition|supplement|lifestyle|exercise|sleep|stress|fasting",
          "title": "Short educational title",
          "description": "Educational summary of relevant published research. For supplements, note commonly studied dosages in the literature. Always frame as 'research has explored...' or 'studies suggest...' not as recommendations.",
          "evidenceLevel": "strong|moderate|emerging",
          "researcher": "Name of researcher whose published work is relevant, or null",
          "affiliateSearchTerm": "search term for finding this supplement (only for supplement category, null for others)"
        }
      ]
    }
  ],
  "nutritionalContext": {
    "primaryApproach": "A nutritional approach that has been studied in relation to these types of markers",
    "researchContext": "Brief summary of published research on why this approach has been studied for these markers",
    "alternativeApproach": "Another studied nutritional approach worth discussing with a provider",
    "fastingResearch": "Brief summary of fasting research relevant to these markers, or null"
  },
  "questionsForProvider": [
    "Specific, informed questions the user can bring to their healthcare provider based on their actual values"
  ],
  "disclaimer": "Rooted Clarity provides educational summaries of health data to support wellness tracking and more informed conversations with licensed healthcare professionals. It does not diagnose, treat, cure, or prevent disease and is not a substitute for medical advice."
}

Include markerInsights for ALL markers that are outside the reference range. Present information educationally — share what research exists without making treatment claims.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content:
            "You are a wellness education assistant. You help people understand their lab results in plain language and provide educational context based on published research in nutrition, supplementation, and lifestyle factors. You never diagnose, prescribe, recommend treatments, or claim to cure or prevent disease. You present research findings educationally and encourage users to discuss all health decisions with their licensed healthcare provider. You cite published researchers by name when referencing their work.",
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

router.post("/lab-results/:id/plan", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [labResult] = await db
      .select()
      .from(labResultsTable)
      .where(eq(labResultsTable.id, id));
    if (!labResult) return res.status(404).json({ error: "Lab result not found" });

    const [analysis] = await db
      .select()
      .from(labAnalysesTable)
      .where(eq(labAnalysesTable.labResultId, id));

    const markersText = (labResult.markers as any[])
      .map(
        (m: any) =>
          `- ${m.name}: ${m.value} ${m.unit} (Status: ${m.status}, Reference: ${m.referenceRangeLow ?? "N/A"}-${m.referenceRangeHigh ?? "N/A"} ${m.unit})`
      )
      .join("\n");

    const analysisContext = analysis ? `\nExisting AI Summary: ${analysis.summary}` : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You are a wellness education assistant. You create personalized educational wellness tracking plans based on lab results. You summarize relevant published research on nutrition, supplements, and lifestyle factors. You never diagnose, prescribe, or make treatment claims. You frame everything as educational information to support informed conversations with healthcare providers. You cite dosages studied in published research, not as personal recommendations. You encourage users to work with their licensed healthcare provider on all health decisions.",
        },
        {
          role: "user",
          content: `Create a personalized educational wellness tracking plan based on these lab results. Summarize relevant published research on nutrition, supplements, and lifestyle factors that have been studied in relation to these markers. Frame everything as educational — not as treatment recommendations.

Lab Test: ${labResult.testName}
Date: ${labResult.testDate}
${labResult.notes ? `Notes: ${labResult.notes}` : ""}
${analysisContext}

Markers:
${markersText}

Nutritional approaches that have been studied and may be relevant:
- Ketogenic nutrition (low carbohydrate, higher fat)
- Mediterranean-style eating
- Time-restricted eating / intermittent fasting (16:8, 18:6)
- Extended fasting (studied for autophagy and metabolic markers)
- Elimination-style approaches
- High omega-3 nutrition (sardine-focused protocols)

Respond with this exact JSON:
{
  "summary": "2-3 sentence plain-language summary of the overall lab picture and areas worth discussing with a provider",
  "wellnessContext": "A paragraph providing educational context about how these markers may relate to each other based on published research. Do not diagnose or name diseases unless the lab result expressly indicates it.",
  "nutritionalResearch": {
    "primaryApproach": "A nutritional approach that has been studied in relation to these types of markers",
    "researchSummary": "Summary of published research on this approach and these markers",
    "alternativeApproach": "Another studied approach worth exploring with a provider",
    "fastingResearch": "Summary of relevant fasting research for these markers, or null"
  },
  "steps": [
    {
      "id": "1",
      "priority": "high",
      "marker": "Marker name",
      "finding": "The value and how it compares to reference range",
      "researchNote": "What published research has explored regarding this marker — including commonly studied supplement dosages in the literature. Frame as 'research has explored...' not 'take this'",
      "educationalDetail": "Additional educational context about this marker and related research",
      "suggestedTimeline": "When research suggests retesting is typically useful",
      "retestIn": "3 months",
      "category": "nutrition|supplement|lifestyle|exercise|sleep|stress|monitoring",
      "affiliateSearchTerm": "Search term for supplement if applicable, null otherwise"
    }
  ],
  "supplementResearch": [
    {
      "name": "Supplement name",
      "studiedDosage": "Dosage commonly used in published studies",
      "studiedTiming": "Timing noted in research",
      "researchContext": "What the research explored and found — educational only",
      "affiliateSearchTerm": "Amazon/iHerb search term"
    }
  ],
  "questionsForProvider": [
    "Specific, informed questions the user can bring to their healthcare provider, referencing their actual lab values"
  ],
  "researchReferences": [
    "Researcher name — brief description of their relevant published work"
  ],
  "disclaimer": "Rooted Clarity provides educational summaries of health data to support wellness tracking and more informed conversations with licensed healthcare professionals. It does not diagnose, treat, cure, or prevent disease and is not a substitute for medical advice."
}

Rules:
- priority: "high" for significantly outside reference range, "medium" for mildly outside, "low" for monitoring
- For supplements, cite dosages FROM PUBLISHED STUDIES, framed as "studies have used..." not "take this dose"
- Note patterns across markers educationally without diagnosing conditions
- supplementResearch should list supplements that have been studied in relation to these markers
- affiliateSearchTerm should be specific enough to find the right product
- researchReferences should cite specific published researchers
- questionsForProvider should be informed questions that help the user have a productive conversation with their doctor
- NEVER claim any supplement, diet, or protocol treats, cures, or prevents any disease`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(responseText);
    parsed.generatedAt = new Date().toISOString().split("T")[0];
    parsed.testName = labResult.testName;
    parsed.testDate = labResult.testDate;
    parsed.markers = labResult.markers;

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to generate wellness plan");
    res.status(500).json({ error: "Failed to generate wellness plan. Please try again." });
  }
});

export default router;
