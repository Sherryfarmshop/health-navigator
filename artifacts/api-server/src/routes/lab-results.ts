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

    const prompt = `You are a metabolic health analyst rooted in functional and integrative medicine. You believe disease is fundamentally metabolic — the body can heal when given the right fuel and environment. Your approach is alternative-first, evidence-backed, and complementary to conventional care.

You draw from the work of:
- Dr. Thomas Seyfried (metabolic theory of cancer, ketogenic therapy)
- Dr. Dom D'Agostino (ketogenic diet research, fasting, metabolic therapies)
- Dr. Andrew Koutnik (metabolic health, Type 1 Diabetes management through keto)
- Dr. Eric Berg (ketogenic diet, intermittent fasting, nutritional healing)
- Dr. Ken Berry (carnivore/keto, challenging mainstream nutrition)
- Dr. Anthony Chaffee (carnivore diet, disease reversal)
- Thomas DeLauer (fasting, keto, supplement science)
- Dr. William Makis (alternative cancer protocols)
- Dr. Nate Ward (functional medicine, metabolic health)

Analyze these lab results and provide plain-language explanations. For any abnormal values, recommend specific alternative/complementary protocols including supplements with real dosages, diet protocols, and lifestyle changes. Go beyond mainstream suggestions — suggest what a functional medicine doctor would recommend, not just what a conventional MD would say.

Diet protocols to consider recommending when appropriate:
- Ketogenic Diet (high fat, very low carb)
- Mediterranean-Keto Hybrid
- Carnivore Diet
- Intermittent Fasting 16:8 or 18:6
- OMAD (One Meal A Day)
- Sardine Fast (anti-inflammatory reset)
- 24-Hour or 36-Hour Water Fast (autophagy, metabolic reset)

Lab Test: ${labResult.testName}
Date: ${labResult.testDate}

Lab Markers:
${markersText}

Respond in this exact JSON format:
{
  "summary": "A 2-3 sentence overall summary from a metabolic health perspective. Identify the root metabolic patterns, not just individual markers.",
  "markerInsights": [
    {
      "markerName": "name of marker",
      "plainLanguageExplanation": "What this marker measures in simple terms",
      "significance": "Why this value matters from a metabolic perspective — what root dysfunction it may indicate",
      "suggestions": [
        {
          "category": "supplement|diet|lifestyle|exercise|sleep|stress|fasting",
          "title": "Short title",
          "description": "Specific recommendation with dosage if supplement, protocol details if diet/fasting. Include which doctor/researcher supports this approach.",
          "evidenceLevel": "strong|moderate|emerging",
          "affiliateSearchTerm": "search term for finding this supplement on Amazon or iHerb (only for supplement category, null for others)"
        }
      ]
    }
  ],
  "recommendedDietProtocol": {
    "primary": "The single best diet protocol for this person's lab results",
    "reasoning": "Why this diet addresses their specific metabolic issues",
    "secondary": "An alternative diet protocol if the primary doesn't suit them",
    "fastingProtocol": "Recommended fasting approach if appropriate (e.g., IF 16:8, 24hr fast weekly), or null"
  },
  "disclaimer": "This analysis is for educational purposes and represents a complementary/integrative perspective. It is not medical advice and does not replace your physician's recommendations. Always consult your healthcare provider before making changes to your health regimen, especially regarding supplements and fasting protocols."
}

Include markerInsights for ALL markers that are outside the normal range. Think metabolically — connect the dots between markers to identify root causes, not just individual flag values. Be bold in your recommendations while remaining evidence-based.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content:
            "You are a metabolic health analyst trained in functional and integrative medicine. You believe disease is fundamentally metabolic and the body can heal with the right fuel and environment. You recommend alternative and complementary protocols — specific supplements with real dosages, ketogenic/carnivore/fasting protocols, and lifestyle changes that go beyond mainstream medical advice. You draw from the research of Dr. Thomas Seyfried, Dr. Dom D'Agostino, Dr. Eric Berg, Dr. Ken Berry, Dr. Andrew Koutnik, Dr. Anthony Chaffee, Thomas DeLauer, Dr. William Makis, and Dr. Nate Ward. You are educational, specific, and bold in your recommendations while noting they complement — not replace — conventional care.",
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
            "You are a metabolic health strategist trained in functional and integrative medicine. You create bold, specific wellness plans that go beyond mainstream medical advice. You recommend ketogenic, carnivore, and fasting protocols. You suggest specific supplements with real dosages. You think metabolically — connecting markers to root dysfunction rather than treating symptoms. You draw from Dr. Thomas Seyfried, Dr. Dom D'Agostino, Dr. Eric Berg, Dr. Ken Berry, Dr. Andrew Koutnik, Dr. Anthony Chaffee, Thomas DeLauer, Dr. William Makis, and Dr. Nate Ward. Plans are complementary to conventional care.",
        },
        {
          role: "user",
          content: `Create a comprehensive metabolic wellness action plan based on these lab results. Think like a functional medicine doctor — identify root metabolic dysfunction, recommend specific alternative protocols, supplements with exact dosages, and the most appropriate diet/fasting protocol for this person's labs.

Lab Test: ${labResult.testName}
Date: ${labResult.testDate}
${labResult.notes ? `Notes: ${labResult.notes}` : ""}
${analysisContext}

Markers:
${markersText}

Available diet protocols to recommend:
- Ketogenic Diet (high fat, very low carb, moderate protein)
- Mediterranean-Keto Hybrid
- Carnivore Diet (animal products only)
- Intermittent Fasting 16:8 or 18:6
- OMAD (One Meal A Day)
- Sardine Fast (anti-inflammatory reset, 3-7 days)
- 24-Hour Water Fast (weekly autophagy activation)
- 36-Hour Water Fast (deeper metabolic reset)

Respond with this exact JSON:
{
  "summary": "2-3 sentence metabolic health summary identifying root patterns and top priorities from a functional medicine perspective",
  "metabolicAssessment": "A paragraph explaining the overall metabolic picture — insulin resistance, inflammation, nutrient deficiencies, hormonal patterns, etc. Connect the dots between markers.",
  "dietProtocol": {
    "recommended": "Primary diet recommendation (e.g., Ketogenic Diet)",
    "reasoning": "Why this diet specifically addresses their lab findings",
    "alternative": "Secondary option if primary doesn't suit them",
    "fastingProtocol": "Specific fasting recommendation (e.g., IF 16:8 daily + one 24hr fast per week)",
    "fastingReasoning": "Why this fasting protocol helps their specific markers"
  },
  "steps": [
    {
      "id": "1",
      "priority": "high",
      "marker": "Vitamin D",
      "finding": "22 ng/mL — below optimal range",
      "action": "Take Vitamin D3 5000 IU daily with K2 (MK-7) 200mcg, taken with a meal containing fat",
      "actionDetail": "Dr. Eric Berg recommends 10,000 IU for deficiency. D3 + K2 ensures calcium goes to bones not arteries. Taking with fat increases absorption by 50%. Most MDs underdose at 1000-2000 IU.",
      "timeline": "Start immediately",
      "retestIn": "3 months",
      "category": "supplement",
      "affiliateSearchTerm": "Vitamin D3 K2 5000 IU"
    }
  ],
  "supplementStack": [
    {
      "name": "Supplement name",
      "dosage": "Specific dosage",
      "timing": "When to take it",
      "reason": "Why it helps their specific markers",
      "affiliateSearchTerm": "Amazon/iHerb search term"
    }
  ],
  "questionsForDoctor": [
    "Specific questions referencing actual lab values that challenge conventional approaches while remaining respectful"
  ],
  "researchReferences": [
    "Dr. [Name] on [topic] — brief description of relevant research or recommendation"
  ]
}

Rules:
- priority: "high" for critical or significantly out of range, "medium" for mildly out of range, "low" for monitoring
- BE SPECIFIC with supplement dosages — not "take some Vitamin D" but "5000 IU D3 + 200mcg K2 MK-7 with breakfast"
- Think metabolically — if glucose is high AND triglycerides are high, that's insulin resistance, recommend keto + fasting, not just "eat less sugar"
- Include alternative supplements mainstream MDs would never suggest (black seed oil, berberine, NAC, magnesium glycinate, omega-3 high dose, etc.)
- supplementStack should be the complete daily supplement protocol
- affiliateSearchTerm should be specific enough to find the right product on Amazon
- researchReferences should cite specific doctors from the list above
- questionsForDoctor should be informed, specific questions that might push the conversation toward metabolic approaches`,
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
