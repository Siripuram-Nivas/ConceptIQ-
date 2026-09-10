import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// ── Model ────────────────────────────────────────────────────────────────────
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

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

interface ExtractChunkRequest {
  materialText: string;
  materialTitle?: string;
}

async function extractChunkIntelligence(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialText, materialTitle } = payload as ExtractChunkRequest;
  if (!materialText || typeof materialText !== 'string') {
    throw { status: 400, message: 'extractChunkIntelligence: materialText is required' };
  }

  const ai = getClient();
  const trimmed = trimMaterial(materialText);

  const schema = {
    type: Type.OBJECT,
    properties: {
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
            sourceReferences:{ type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['name', 'definition', 'keyPoints', 'relatedConcepts', 'importance', 'sourceReferences'],
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
      keyIdeas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            idea: { type: Type.STRING },
            explanation: { type: Type.STRING },
            sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['idea', 'explanation', 'sourceReferences']
        }
      },
      importantResults: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            result: { type: Type.STRING },
            significance: { type: Type.STRING },
            sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['result', 'significance', 'sourceReferences']
        }
      },
      groundedClaims: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            claim: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['fact', 'interpretation', 'inference'] },
            sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['claim', 'type', 'sourceReferences']
        }
      }
    },
    required: ['concepts', 'relationships', 'keyTerms', 'keyIdeas', 'importantResults', 'groundedClaims'],
  };

  const prompt = `You are an expert educational AI analyzing a chunk of study material.

Material title: ${materialTitle || 'Untitled'}

Chunk Content:
${trimmed}

Extract the following intelligence, ensuring ALL items are grounded strictly in this chunk. DO NOT hallucinate external information.
1. Key Concepts (important topics/entities, max 8)
2. Relationships (how concepts relate)
3. Key Terms (vocabulary definitions)
4. Key Ideas (core themes/arguments/principles)
5. Important Results (formulas, numerical results, conclusions)
6. Grounded Claims (specific facts or inferences made in the text)

IMPORTANT PROVENANCE RULES:
- Every concept, key idea, result, and claim MUST include "sourceReferences" that point exactly to the pages/slides explicitly mentioned in the chunk (e.g. ["Page 4"], ["Slide 12", "Slide 13"]).
- DO NOT invent source references.
- Distinguish between literal facts and inferences for claims.`;

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

interface AggregateMaterialRequest {
  materialTitle: string;
  chunks: any[];
}

async function aggregateMaterial(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialTitle, chunks } = payload as AggregateMaterialRequest;
  
  if (!chunks || !Array.isArray(chunks)) {
    throw { status: 400, message: 'aggregateMaterial: chunks array is required' };
  }

  // Authoritative Backend Limits
  const MAX_CHUNKS = 50; 
  if (chunks.length > MAX_CHUNKS) {
    throw { status: 400, message: `aggregateMaterial: Too many chunks (${chunks.length}). Max allowed in single pass is ${MAX_CHUNKS}. Hierarchical aggregation required.` };
  }
  
  // Basic byte limit check (4MB for serverless safety)
  const payloadStr = JSON.stringify(chunks);
  if (Buffer.byteLength(payloadStr, 'utf8') > 4_000_000) {
    throw { status: 400, message: 'aggregateMaterial: Payload exceeds 4MB limit. Hierarchical aggregation required.' };
  }

  const ai = getClient();
  const trimmedPayloadStr = payloadStr;

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      explanation: { type: Type.STRING },
      sourceAwareInsights: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            insight: { type: Type.STRING },
            sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['insight', 'sourceReferences']
        }
      },
      suggestedLearningPath: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['summary', 'explanation', 'sourceAwareInsights', 'suggestedLearningPath'],
  };

  const prompt = `You are an expert educational AI performing a global document synthesis.

Material title: ${materialTitle || 'Untitled'}

You are provided with the aggregated intelligence from ${chunks.length} chunks of this document, containing concepts, key ideas, and results.
Data:
${trimmedPayloadStr}

Generate the following global document intelligence:
1. A comprehensive Final Document Summary (2-4 paragraphs) that accurately reflects the entire document.
2. A Student-Friendly Explanation (a narrative walkthrough of the material's core message).
3. Source-Aware Insights (overall themes or advanced conclusions, citing the sources they span across).
4. A suggested learning path (logical sequence of top concept names).

IMPORTANT: 
- Preserve the truth of the source. Do not hallucinate external knowledge.
- Do not let the explanation or summary simply reflect the first chunk. Incorporate intelligence from across all provided chunks.`;

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
  
  // Authoritative Context Check: Reject unbounded context
  const maxContextBytes = 40_000;
  let validatedContext = materialContext ?? '';
  if (Buffer.byteLength(validatedContext, 'utf8') > maxContextBytes) {
    validatedContext = validatedContext.slice(0, maxContextBytes);
    console.warn(`[api/ai] analyzeExplanation: Context exceeded ${maxContextBytes} bytes and was truncated to prevent hallucination/overloading. Frontend must use context budget.`);
  }

  const topic = topicName ?? session.topicId;

  const prompt = `You are an educational AI evaluating a student's understanding.

Topic being taught: ${topic}
${validatedContext ? `\nRelevant material context:\n${validatedContext}` : ''}

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
  extractChunkIntelligence,
  aggregateMaterial,
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
    const result = await Promise.race([
      handle(payload ?? {}),
      new Promise((_, reject) => 
        setTimeout(() => reject({ status: 504, code: 'AI_PROVIDER_UNAVAILABLE', message: 'Provider timeout exceeded' }), 30000)
      )
    ]);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err && err.status === 400) {
      console.warn(`[api/ai] Validation failed:`, err.message);
      return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: err.message } });
    }

    if (err && (err.status === 503 || err.status === 504)) {
      return res.status(err.status).json({ error: { code: 'AI_PROVIDER_UNAVAILABLE', message: err.message } });
    }

    const msg: string = err?.message ?? 'Internal API processing failed';
    const isConfig = msg.includes('GEMINI_API_KEY');
    
    if (isConfig) {
      return res.status(503).json({ error: { code: 'AI_PROVIDER_UNAVAILABLE', message: 'AI service is not configured' } });
    }

    if (err?.status === 404 || msg.includes('NOT_FOUND') || msg.includes('no longer available')) {
      console.warn(`[api/ai] Model unavailable:`, msg);
      return res.status(503).json({
        error: {
          code: 'AI_MODEL_UNAVAILABLE',
          message: msg,
          provider: 'LIVE',
          model: MODEL,
          operation: method
        }
      });
    }

    console.error(`[api/ai] ${method} failed:`, err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_API_ERROR',
        message: msg
      }
    });
  }
}
