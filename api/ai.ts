import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// ── Model ────────────────────────────────────────────────────────────────────
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server.');
  return new GoogleGenAI({ apiKey: key });
}

// ── Input limits ──────────────────────────────────────────────────────────────
// Flash 2.0 has 1M context. We removed destructive chunking limits here 
// because MaterialProcessor chunks it safely on the client to avoid serverless timeouts.
const MAX_MATERIAL_CHARS = 2_000_000;
const MAX_EXPLANATION_CHARS = 100_000;

function trimMaterial(text: string): string {
  if (!text) return '';
  return text.length > MAX_MATERIAL_CHARS
    ? text.slice(0, MAX_MATERIAL_CHARS) + '\n[...material truncated for context window...]'
    : text;
}

function trimExplanation(text: string): string {
  if (!text) return '';
  return text.slice(0, MAX_EXPLANATION_CHARS);
}

// ── Shared response schemas (mirrors src/types/index.ts) ──────────────────────

const conceptEvidenceSchema = {
  type: Type.OBJECT,
  properties: {
    concept:            { type: Type.STRING },
    expectedEvidence:   { type: Type.ARRAY, items: { type: Type.STRING } },
    studentEvidence:    { type: Type.ARRAY, items: { type: Type.STRING } },
    missingEvidence:    { type: Type.ARRAY, items: { type: Type.STRING } },
    status:             { type: Type.STRING, enum: ['mastered', 'strong', 'partial', 'weak', 'potential_misconception'] },
    confidence:         { type: Type.NUMBER },
    misconceptionEvidence: { type: Type.STRING, nullable: true },
  },
  required: ['concept', 'expectedEvidence', 'studentEvidence', 'missingEvidence', 'status', 'confidence'],
};

const misconceptionSchema = {
  type: Type.OBJECT,
  properties: {
    concept:  { type: Type.STRING },
    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    type:     { type: Type.STRING, enum: ['missing_relationship', 'incorrect', 'incomplete', 'overconfident'] },
    evidence: { type: Type.STRING },
  },
  required: ['concept', 'severity', 'type', 'evidence'],
};

const masteryIndexSchema = {
  type: Type.OBJECT,
  properties: {
    conceptCoverage:       { type: Type.INTEGER },
    explanationQuality:    { type: Type.INTEGER },
    followupPerformance:   { type: Type.INTEGER },
    consistency:           { type: Type.INTEGER },
    total:                 { type: Type.INTEGER },
  },
  required: ['conceptCoverage', 'explanationQuality', 'followupPerformance', 'consistency', 'total'],
};

const sessionAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    topic:             { type: Type.STRING },
    concepts:          { type: Type.ARRAY, items: conceptEvidenceSchema },
    overallStatus:     { type: Type.STRING, enum: ['mastered', 'partial', 'gap', 'potential_misconception'] },
    misconceptions:    { type: Type.ARRAY, items: misconceptionSchema },
    recommendedAction: { type: Type.STRING, enum: ['continue', 'challenge', 'repair', 'mastered'] },
    masteryIndex:      masteryIndexSchema,
  },
  required: ['topic', 'concepts', 'overallStatus', 'misconceptions', 'recommendedAction', 'masteryIndex'],
};

// ── Handlers ──────────────────────────────────────────────────────────────────

interface ExtractConceptsRequest {
  materialText: string;
  materialTitle?: string;
}

async function extractConcepts(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialText, materialTitle } = payload as ExtractConceptsRequest;
  if (!materialText || typeof materialText !== 'string') {
    throw { status: 400, message: 'extractConcepts: materialText is required and must be a string' };
  }

  const ai = getClient();
  const trimmed = trimMaterial(materialText);

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      concepts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name:            { type: Type.STRING },
            definition:      { type: Type.STRING },
            keyPoints:       { type: Type.ARRAY, items: { type: Type.STRING } },
            relatedConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            importance:      { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          },
          required: ['name', 'definition', 'keyPoints', 'relatedConcepts', 'importance'],
        },
      },
      relationships: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            from:         { type: Type.STRING },
            to:           { type: Type.STRING },
            relationship: { type: Type.STRING },
          },
          required: ['from', 'to', 'relationship'],
        },
      },
      keyTerms: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term:       { type: Type.STRING },
            definition: { type: Type.STRING },
          },
          required: ['term', 'definition'],
        },
      },
      suggestedLearningPath: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['summary', 'concepts', 'relationships', 'keyTerms', 'suggestedLearningPath'],
  };

  const prompt = `You are an expert educational AI. Analyze the following study material and extract structured learning concepts.

Material title: ${materialTitle || 'Untitled'}

Material content:
${trimmed}

Extract:
1. A concise summary of the entire material (2–4 sentences)
2. The key concepts a student must understand (5–12 concepts maximum). For EACH concept, provide:
   - A clear, accurate name
   - A precise definition drawn directly from the material
   - 3–5 key points a student must know
   - Related concepts from the same material
   - Importance: high, medium, or low
3. Relationships between concepts (e.g., "TCP depends_on IP", "3NF extends 2NF")
4. Key terms with definitions
5. A suggested learning order (concept names in sequence)

IMPORTANT: All concepts and relationships must be derived from the actual material content. Do not add concepts that are not present in the material.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  return JSON.parse(response.text ?? '{}');
}

interface AnalyzeExplanationRequest {
  session: {
    topicId: string;
    [key: string]: any;
  };
  explanation: string;
  topicName?: string;
  materialContext?: string;
}

async function analyzeExplanation(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { session, explanation, topicName, materialContext } = payload as AnalyzeExplanationRequest;
  if (!explanation || typeof explanation !== 'string') {
    throw { status: 400, message: 'analyzeExplanation: explanation is required and must be a string' };
  }
  if (!session || typeof session !== 'object') {
    throw { status: 400, message: 'analyzeExplanation: session object is required' };
  }
  if (!session.topicId || typeof session.topicId !== 'string') {
    throw { status: 400, message: 'analyzeExplanation: session.topicId is required and must be a string' };
  }

  const ai = getClient();
  const trimmedExplanation = trimExplanation(explanation);
  const trimmedMaterialContext = trimMaterial(materialContext ?? '');
  const topic = topicName ?? session.topicId;

  const prompt = `You are an educational AI evaluating a student's understanding.

Topic being taught: ${topic}
${trimmedMaterialContext ? `\nRelevant material context:\n${trimmedMaterialContext}` : ''}

The student was asked to explain: "${topic}"

The student's explanation:
"${trimmedExplanation}"

Evaluate this explanation carefully:
1. Identify which key concepts from the topic the student correctly demonstrated understanding of (studentEvidence)
2. Identify what evidence you expected to see for each key concept (expectedEvidence)  
3. Identify what is missing from their explanation (missingEvidence)
4. Detect any misconceptions — incorrect statements or confused relationships
5. Assign an overall status based on the quality of the actual explanation

CRITICAL RULES:
- GROUNDING: Base your evaluation STRICTLY on the provided "Relevant material context". Do NOT invent facts or rely on outside knowledge. If the provided context is insufficient to evaluate a point, return "Insufficient source evidence to confidently evaluate this point." rather than hallucinating an answer.
- Base studentEvidence ONLY on what the student actually said. Do NOT add evidence they did not demonstrate.
- If the student's explanation contains errors, classify those as potential_misconception, NOT mastered.
- The status must reflect actual understanding, not just that they tried.
- masteryIndex scores must be calculated honestly from the evidence:
  - conceptCoverage (0–35): how many key concepts were correctly addressed
  - explanationQuality (0–25): clarity and accuracy of the explanation
  - followupPerformance (0–20): set to 10 as baseline (no followup yet)
  - consistency (0–20): internal consistency of the explanation
  - total = sum of the above (0–100)`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: sessionAnalysisSchema,
    },
  });

  return JSON.parse(response.text ?? '{}');
}

interface GenerateFollowUpRequest {
  analysis: {
    topic: string;
    concepts?: any[];
    misconceptions?: any[];
    [key: string]: any;
  };
}

async function generateFollowUpQuestion(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { analysis } = payload as GenerateFollowUpRequest;
  if (!analysis || typeof analysis !== 'object' || !analysis.topic) {
    throw { status: 400, message: 'generateFollowUpQuestion: valid analysis object with a topic is required' };
  }

  const ai = getClient();

  // Find the weakest concept to target
  const weakConcepts = (analysis.concepts ?? []).filter(
    (c: any) => c.status === 'potential_misconception' || c.status === 'partial' || c.status === 'weak'
  );
  const targetConcept = weakConcepts[0] ?? analysis.concepts?.[0] ?? { concept: analysis.topic };
  const missingEvidence = targetConcept.missingEvidence ?? [];

  const schema = {
    type: Type.OBJECT,
    properties: {
      question:       { type: Type.STRING },
      rationale:      { type: Type.STRING },
      targetConcept:  { type: Type.STRING },
    },
    required: ['question', 'rationale', 'targetConcept'],
  };

  const prompt = `You are an educational AI creating a targeted follow-up question.

Topic: ${analysis.topic}
Target concept: ${targetConcept.concept}
Missing understanding: ${missingEvidence.join(', ') || 'deeper understanding'}
${analysis.misconceptions?.length ? `Detected misconception: ${analysis.misconceptions[0]?.evidence}` : ''}

Create ONE targeted question that:
1. Directly probes the student's missing understanding of "${targetConcept.concept}"
2. Is specific to the topic "${analysis.topic}" — do NOT ask about unrelated topics
3. Requires a conceptual answer, not just yes/no
4. Helps distinguish partial understanding from mastery

The question must be directly about ${analysis.topic} and ${targetConcept.concept}.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  return JSON.parse(response.text ?? '{}');
}

interface GenerateRepairRequest {
  analysis: {
    topic: string;
    concepts?: any[];
    misconceptions?: any[];
    [key: string]: any;
  };
}

async function generateRepair(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { analysis } = payload as GenerateRepairRequest;
  if (!analysis || typeof analysis !== 'object' || !analysis.topic) {
    throw { status: 400, message: 'generateRepair: valid analysis object with a topic is required' };
  }

  const ai = getClient();

  const mainMisconception = analysis.misconceptions?.[0];
  const weakConcepts = (analysis.concepts ?? []).filter(
    (c: any) => c.status !== 'mastered' && c.status !== 'strong'
  );
  const targetConcept = weakConcepts[0] ?? analysis.concepts?.[0];
  const missingItems = targetConcept?.missingEvidence ?? [];

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      visualSteps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step:    { type: Type.INTEGER },
            type:    { type: Type.STRING, enum: ['visual', 'explanation', 'analogy', 'challenge'] },
            content: { type: Type.STRING },
            diagram: { type: Type.STRING, nullable: true },
          },
          required: ['step', 'type', 'content'],
        },
      },
      challenge: { type: Type.STRING },
    },
    required: ['title', 'visualSteps', 'challenge'],
  };

  const prompt = `You are an educational AI creating targeted repair content.

Topic: ${analysis.topic}
${targetConcept ? `Target concept: ${targetConcept.concept}` : ''}
${mainMisconception ? `Detected misconception: ${mainMisconception.evidence}` : ''}
Missing understanding: ${missingItems.join('; ') || 'core concept understanding'}

Create repair content that:
1. Directly addresses the specific misconception or gap
2. Uses 3–5 clear steps (mix of explanation, visual, analogy, challenge types)
3. Includes a simple ASCII diagram or visual representation where appropriate
4. Ends with a challenge question to verify understanding
5. Is completely specific to "${analysis.topic}" — no TCP/networking references unless the topic is networking

The repair must target the EXACT weakness identified, not generic content about the topic.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  return JSON.parse(response.text ?? '{}');
}

interface EvaluateReExplanationRequest {
  session: {
    topicId: string;
    topic?: string;
    materialContext?: string;
    analysis?: { concepts?: any[] };
    [key: string]: any;
  };
  reExplanation: string;
}

async function evaluateReExplanation(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { session, reExplanation } = payload as EvaluateReExplanationRequest;
  if (!reExplanation || typeof reExplanation !== 'string') {
    throw { status: 400, message: 'evaluateReExplanation: reExplanation is required and must be a string' };
  }
  if (!session || typeof session !== 'object') {
    throw { status: 400, message: 'evaluateReExplanation: session object is required' };
  }

  const ai = getClient();
  const trimmedReExplanation = trimExplanation(reExplanation);
  const materialContext = trimMaterial(session?.materialContext ?? '');
  const topic = session?.topic ?? session?.topicId ?? 'Unknown topic';
  const previousMissing = (session?.analysis?.concepts ?? [])
    .flatMap((c: any) => c.missingEvidence ?? [])
    .slice(0, 10)
    .join('; ');

  const prompt = `You are an educational AI evaluating whether a student's understanding improved after targeted repair.

Topic: ${topic}
${materialContext ? `\nMaterial context:\n${materialContext}` : ''}
${previousMissing ? `\nPreviously missing understanding: ${previousMissing}` : ''}

The student's REVISED explanation after repair:
"${trimmedReExplanation}"

Evaluate this revised explanation:
1. Did the student address the previously missing understanding?
2. Are there still gaps or misconceptions?
3. Has understanding meaningfully improved?

Apply the same rigorous evidence-based evaluation as before.
Update masteryIndex to reflect the improvement (or lack thereof) compared to the previous attempt.
If the student addressed the previous gaps, conceptCoverage and explanationQuality should increase.
If the student repeated the same errors, scores should not increase significantly.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: sessionAnalysisSchema,
    },
  });

  return JSON.parse(response.text ?? '{}');
}

// ── Route table ───────────────────────────────────────────────────────────────
type Handler = (payload: any) => Promise<any>;

const HANDLERS: Record<string, Handler> = {
  extractConcepts,
  analyzeExplanation,
  generateFollowUpQuestion,
  generateRepair,
  evaluateReExplanation,
};

// ── Vercel Serverless entry point ─────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: { method?: string; payload?: any };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { method, payload } = body ?? {};

  if (!method || typeof method !== 'string') {
    return res.status(400).json({ error: 'Missing method in request body' });
  }

  const handle = HANDLERS[method];
  if (!handle) {
    return res.status(404).json({ error: `Unknown method: ${method}` });
  }

  try {
    const result = await handle(payload ?? {});
    return res.status(200).json(result);
  } catch (err: any) {
    // Check if it's our custom validation error
    if (err && err.status === 400) {
      console.warn(`[api/ai] Validation failed:`, err.message);
      return res.status(400).json({ error: err.message });
    }

    // Distinguish configuration errors from runtime errors
    const msg: string = err?.message ?? 'Internal server error';
    const isConfig = msg.includes('GEMINI_API_KEY');
    console.error(`[api/ai] ${method} failed:`, msg);
    return res.status(isConfig ? 503 : 500).json({
      error: isConfig
        ? 'AI service is not configured. Contact the administrator.'
        : `AI operation failed: ${msg}`,
    });
  }
}
