import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// ── Model ────────────────────────────────────────────────────────────────────
// Configured via GEMINI_MODEL env var. Current verified working: gemini-3.6-flash.
// Do NOT change the default without verifying current provider model availability.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server.');
  return new GoogleGenAI({ apiKey: key });
}

// ── Backend Safety Limits (enforced server-side) ───────────────────────────
const MAX_MATERIAL_CHARS = 2_000_000;
const MAX_EXPLANATION_CHARS = 100_000;
const MAX_CONTEXT_BYTES = 40_000;
const MAX_CHUNKS_PER_AGGREGATION = 50;
const MAX_AGGREGATION_BYTES = 4_000_000;
const MAX_AUDIT_CYCLES = 2;

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

// ── Shared Schemas ────────────────────────────────────────────────────────────

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

// ── Document Intelligence Schemas ────────────────────────────────────────────

const formulaSchema = {
  type: Type.OBJECT,
  properties: {
    expression:       { type: Type.STRING },   // Exact notation: "Y = −0.947 + 2.448X"
    variables:        { type: Type.ARRAY, items: { type: Type.STRING } },
    significance:     { type: Type.STRING },
    sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['expression', 'variables', 'significance', 'sourceReferences'],
};

const documentOutlineItemSchema = {
  type: Type.OBJECT,
  properties: {
    id:          { type: Type.STRING },
    order:       { type: Type.INTEGER },
    title:       { type: Type.STRING },
    subtopics:   { type: Type.ARRAY, items: { type: Type.STRING } },
    sourceUnits: { type: Type.ARRAY, items: { type: Type.STRING } },
    importance:  { type: Type.STRING, enum: ['high', 'medium', 'low'] },
  },
  required: ['id', 'order', 'title', 'subtopics', 'sourceUnits', 'importance'],
};

const topicExplanationSchema = {
  type: Type.OBJECT,
  properties: {
    topicId:             { type: Type.STRING },
    topicName:           { type: Type.STRING },
    sourceUnits:         { type: Type.ARRAY, items: { type: Type.STRING } },
    quickExplanation:    { type: Type.STRING },    // 1–2 sentences
    detailedExplanation: { type: Type.STRING },    // Full paragraph
    deepDive:            { type: Type.STRING },    // Technical depth
    relatedTopics:       { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['topicId', 'topicName', 'sourceUnits', 'quickExplanation', 'detailedExplanation', 'deepDive', 'relatedTopics'],
};

const omissionSchema = {
  type: Type.OBJECT,
  properties: {
    omissionId:      { type: Type.STRING },
    topic:           { type: Type.STRING },
    reason:          { type: Type.STRING },
    severity:        { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    recoverable:     { type: Type.BOOLEAN },
    sourceReference: { type: Type.STRING, nullable: true },
  },
  required: ['omissionId', 'topic', 'reason', 'severity', 'recoverable'],
};

const coverageEntrySchema = {
  type: Type.OBJECT,
  properties: {
    topic:           { type: Type.STRING },
    subtopic:        { type: Type.STRING, nullable: true },
    sourceUnits:     { type: Type.ARRAY, items: { type: Type.STRING } },
    extracted:       { type: Type.BOOLEAN },
    processed:       { type: Type.BOOLEAN },
    represented:     { type: Type.BOOLEAN },
    explained:       { type: Type.BOOLEAN },
    provenance:      { type: Type.BOOLEAN },
    status:          { type: Type.STRING, enum: ['DISCOVERED', 'SOURCE_FOUND', 'EXTRACTED', 'PROCESSED', 'EXPLAINED', 'PROVENANCE', 'VERIFIED', 'FAILED', 'OMITTED'] },
  },
  required: ['topic', 'sourceUnits', 'extracted', 'processed', 'represented', 'explained', 'provenance', 'status'],
};

// ── Handler: extractChunkIntelligence ────────────────────────────────────────

interface BaseIdentityRequest {
  materialId: string;
  materialVersion: number;
  processingRunId?: string;
  sourceFingerprint?: string;
}

interface ExtractChunkRequest extends BaseIdentityRequest {
  materialText: string;
  materialTitle?: string;
}

async function extractChunkIntelligence(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialText, materialTitle, materialId, materialVersion } = payload as ExtractChunkRequest;
  if (!materialText || typeof materialText !== 'string') {
    throw { status: 400, message: 'extractChunkIntelligence: materialText is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'extractChunkIntelligence: Strict source identity (materialId, materialVersion) is required.' };
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
            idea:             { type: Type.STRING },
            explanation:      { type: Type.STRING },
            sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['idea', 'explanation', 'sourceReferences'],
        },
      },
      importantResults: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            result:           { type: Type.STRING },
            significance:     { type: Type.STRING },
            sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['result', 'significance', 'sourceReferences'],
        },
      },
      formulas: {
        type: Type.ARRAY,
        items: formulaSchema,
      },
      groundedClaims: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            claim:            { type: Type.STRING },
            type:             { type: Type.STRING, enum: ['fact', 'interpretation', 'inference'] },
            sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['claim', 'type', 'sourceReferences'],
        },
      },
      visualLimitations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      tableNotes: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ['concepts', 'relationships', 'keyTerms', 'keyIdeas', 'importantResults', 'formulas', 'groundedClaims', 'visualLimitations', 'tableNotes'],
  };

  const prompt = `You are an expert educational AI analyzing a chunk of study material.

Material title: ${materialTitle || 'Untitled'}

Chunk Content:
${trimmed}

Extract the following intelligence. ALL items must be grounded strictly in this chunk. DO NOT hallucinate external information.

1. KEY CONCEPTS — Important topics/entities (no arbitrary cap — extract all significant ones)
2. RELATIONSHIPS — How concepts relate to each other
3. KEY TERMS — Vocabulary with precise definitions
4. KEY IDEAS — Core themes, arguments, or principles
5. IMPORTANT RESULTS — Formulas, numerical results, conclusions, empirical findings
6. FORMULAS — Mathematical or logical equations. PRESERVE EXACT NOTATION.
   - Expression must match the source exactly, e.g., "Y = −0.947 + 2.448X", "R² = 0.9995"
   - List all variable definitions separately
   - Never paraphrase: "a regression equation exists" is NOT acceptable
7. GROUNDED CLAIMS — Specific facts (fact), interpretations (interpretation), or inferences (inference)
8. VISUAL LIMITATIONS — Note any images, diagrams, charts, or visual-only content that could NOT be analyzed as text (e.g., "Figure on Page 3 could not be analyzed — image content")
9. TABLE NOTES — If tables are present, note whether text was extractable. Use "TABLE_PRESENT_TEXT_UNAVAILABLE" if not.

PROVENANCE RULES (strictly enforced):
- Every concept, key idea, result, formula, and claim MUST include sourceReferences pointing to the page/slide explicitly mentioned in the chunk text (e.g., ["Page 4"], ["Slide 12", "Slide 13"])
- DO NOT invent source references
- Distinguish literal facts from interpretations and inferences`;

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

// ── Handler: discoverChunkTopics ─────────────────────────────────────────────

interface DiscoverChunkTopicsRequest extends BaseIdentityRequest {
  materialText: string;
  materialTitle?: string;
}

async function discoverChunkTopics(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialText, materialTitle, materialId, materialVersion } = payload as DiscoverChunkTopicsRequest;
  if (!materialText || typeof materialText !== 'string') {
    throw { status: 400, message: 'discoverChunkTopics: materialText is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'discoverChunkTopics: Strict source identity is required.' };
  }

  const ai = getClient();
  const trimmed = trimMaterial(materialText);

  const schema = {
    type: Type.OBJECT,
    properties: {
      localTopics: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title:       { type: Type.STRING },
            subtopics:   { type: Type.ARRAY, items: { type: Type.STRING } },
            sourceUnits: { type: Type.ARRAY, items: { type: Type.STRING } },
            importance:  { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          },
          required: ['title', 'subtopics', 'sourceUnits', 'importance'],
        },
      },
    },
    required: ['localTopics'],
  };

  const prompt = `You are an educational AI extracting a strict structural topic outline from a material chunk.

Material title: ${materialTitle || 'Untitled'}

Chunk Content:
${trimmed}

Identify all major topics and subtopics discussed in this chunk.
Do not extract detailed definitions or deep insights—only the topic structure (a hierarchical table of contents).

RULES:
- sourceUnits must reference exact pages/slides mentioned in the chunk.
- Do not hallucinate topics.`;

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

// ── Handler: mergeTopicCandidates ────────────────────────────────────────────

interface MergeTopicCandidatesRequest extends BaseIdentityRequest {
  materialTitle: string;
  chunkTopics: any[];
}

async function mergeTopicCandidates(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialTitle, chunkTopics, materialId, materialVersion } = payload as MergeTopicCandidatesRequest;
  if (!chunkTopics || !Array.isArray(chunkTopics)) {
    throw { status: 400, message: 'mergeTopicCandidates: chunkTopics array is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'mergeTopicCandidates: Strict source identity is required.' };
  }

  const ai = getClient();
  const payloadStr = JSON.stringify(chunkTopics);

  const schema = {
    type: Type.OBJECT,
    properties: {
      documentOutline: {
        type: Type.ARRAY,
        items: documentOutlineItemSchema,
      },
    },
    required: ['documentOutline'],
  };

  const prompt = `You are an educational AI merging local topic discoveries into a single Document Topic Graph (Outline).

Material title: ${materialTitle || 'Untitled'}

Local Topic Candidates from Chunks:
${payloadStr}

TASK:
Merge, deduplicate, and hierarchically organize these topics into a final, unified document outline.

RULES:
- Maintain strict order (chronological based on the chunks).
- Merge identical or highly similar topics.
- Combine sourceUnits accurately (e.g. if "Regression" is in Page 1 and Page 3, combine to ["Page 1", "Page 3"]).
- Include all discovered valid topics.`;

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

// ── Handler: aggregateMaterial ────────────────────────────────────────────────

interface AggregateMaterialRequest extends BaseIdentityRequest {
  materialTitle: string;
  chunks: any[];        // Full ChunkIntelligence objects
  isPartial?: boolean;  // true if some chunks failed
}

async function aggregateMaterial(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialTitle, chunks, isPartial, materialId, materialVersion } = payload as AggregateMaterialRequest;

  if (!chunks || !Array.isArray(chunks)) {
    throw { status: 400, message: 'aggregateMaterial: chunks array is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'aggregateMaterial: Strict source identity is required.' };
  }

  if (chunks.length > MAX_CHUNKS_PER_AGGREGATION) {
    throw { status: 400, message: `aggregateMaterial: Too many chunks (${chunks.length}). Max ${MAX_CHUNKS_PER_AGGREGATION} per pass. Use hierarchical aggregation.` };
  }

  const payloadStr = JSON.stringify(chunks);
  if (Buffer.byteLength(payloadStr, 'utf8') > MAX_AGGREGATION_BYTES) {
    throw { status: 400, message: 'aggregateMaterial: Payload exceeds 4MB. Use hierarchical aggregation.' };
  }

  const ai = getClient();

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary:             { type: Type.STRING },
      quickExplanation:    { type: Type.STRING },
      detailedExplanation: { type: Type.STRING },
      deepDive:            { type: Type.STRING },
      documentOutline: {
        type: Type.ARRAY,
        items: documentOutlineItemSchema,
      },
      topicExplanations: {
        type: Type.ARRAY,
        items: topicExplanationSchema,
      },
      formulas: {
        type: Type.ARRAY,
        items: formulaSchema,
      },
      conclusions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      sourceAwareInsights: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            insight:          { type: Type.STRING },
            sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['insight', 'sourceReferences'],
        },
      },
      suggestedLearningPath: { type: Type.ARRAY, items: { type: Type.STRING } },
      omissions: {
        type: Type.ARRAY,
        items: omissionSchema,
      },
    },
    required: [
      'summary', 'quickExplanation', 'detailedExplanation', 'deepDive',
      'documentOutline', 'topicExplanations', 'formulas', 'conclusions',
      'sourceAwareInsights', 'suggestedLearningPath', 'omissions',
    ],
  };

  const partialWarning = isPartial
    ? '\n⚠️ NOTE: Some document chunks failed processing. This synthesis covers only the successfully processed portions. Flag any topics that appear incomplete in omissions.'
    : '';

  const prompt = `You are an expert educational AI performing a COMPLETE Document Intelligence Synthesis.

Material title: "${materialTitle || 'Untitled'}"
Chunks provided: ${chunks.length}${partialWarning}

You have received deep chunk-level intelligence from this document. Your task is to produce a COMPLETE Document Intelligence package that covers the ENTIRE document — not just the first or last chunk.

═══════════════════════════════════════
REQUIRED OUTPUT SECTIONS
═══════════════════════════════════════

1. SUMMARY (2–4 paragraphs)
   - Accurately reflects the ENTIRE document, not just the beginning
   - Must reference content from early, middle, AND late chunks

2. QUICK EXPLANATION (Level 1 — 1 paragraph)
   - What is this document about? (plain language, complete)

3. DETAILED EXPLANATION (Level 2 — topic-by-topic narrative)
   - One paragraph per major topic
   - Must cover EVERY major topic found across ALL chunks
   - Reference which source units each topic came from

4. DEEP DIVE (Level 3 — full technical depth)
   - Definitions with precise language from the source
   - Mechanism/process explanations
   - Formulas with variables defined
   - Examples from the source
   - Conditions, exceptions, limitations
   - Do NOT oversimplify technical content

5. DOCUMENT OUTLINE
   - Ordered list of all major topics found
   - Each topic must list its important subtopics
   - sourceUnits must reference the actual pages/slides where this topic appears
   - Example: "Regression Equation" → subtopics: ["Slope", "Intercept", "Y-intercept", "R²"] → sourceUnits: ["Page 6", "Page 7"]

6. TOPIC-BY-TOPIC EXPLANATIONS
   - For EVERY major topic in the document outline, produce:
     - quickExplanation (1–2 sentences)
     - detailedExplanation (full paragraph)
     - deepDive (technical depth: definitions, formulas, examples, conditions)
   - Include ALL discovered topics — do not arbitrarily limit to top-N

7. FORMULAS
   - Extract ALL mathematical/logical formulas from across all chunks
   - PRESERVE EXACT NOTATION: "Y = −0.947 + 2.448X" not "a regression equation"
   - Include ALL numerical constants (−0.947, 2.448, 25.98, 0.9995, etc.)
   - Define every variable (e.g., "Y: predicted/dependent variable", "X: independent variable")
   - sourceReferences must point to the exact page/slide

8. CONCLUSIONS
   - What are the major findings, conclusions, or takeaways from the document?

9. SOURCE-AWARE INSIGHTS
   - Advanced cross-chunk themes or conclusions
   - Must cite which source units they span

10. SUGGESTED LEARNING PATH
    - Logical sequence of concept names for a learner to follow

11. OMISSIONS
    - Document EVERY piece of information that could NOT be fully analyzed
    - Include: visual content, tables with unextractable text, failed chunks, OCR limitations
    - Never claim complete understanding if limitations exist

═══════════════════════════════════════
CRITICAL RULES — VIOLATIONS ARE FAILURES
═══════════════════════════════════════

❌ Do NOT bias toward chunk 1 (first-page bias). Incorporate ALL chunks.
❌ Do NOT simplify formulas away — preserve exact notation
❌ Do NOT drop topics discovered in later chunks
❌ Do NOT hallucinate information not in the chunks
❌ Do NOT claim understanding of visual content that was flagged as unavailable
❌ Do NOT produce a "global summary" that ignores individual topic-level intelligence
✅ EVERY major topic in documentOutline MUST have a corresponding entry in topicExplanations
✅ EVERY formula found in chunks MUST appear in the formulas array
✅ Source references must be grounded to actual page/slide numbers from the chunk intelligence

Chunk Intelligence Data:
${payloadStr}`;

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

// ── Handler: auditCompleteness ────────────────────────────────────────────────

interface AuditCompletenessRequest extends BaseIdentityRequest {
  materialTitle: string;
  documentOutline: any[];
  topicExplanations: any[];
  formulas: any[];
  importantResults: any[];
}

async function auditCompleteness(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialTitle, documentOutline, topicExplanations, formulas, importantResults, materialId, materialVersion } = payload as AuditCompletenessRequest;

  if (!documentOutline || !Array.isArray(documentOutline)) {
    throw { status: 400, message: 'auditCompleteness: documentOutline array is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'auditCompleteness: Strict source identity is required.' };
  }

  const ai = getClient();

  const schema = {
    type: Type.OBJECT,
    properties: {
      overallPassed: { type: Type.BOOLEAN },
      coverageMatrix: {
        type: Type.ARRAY,
        items: coverageEntrySchema,
      },
      missingTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingSubtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingFormulas: { type: Type.ARRAY, items: { type: Type.STRING } },
      recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      auditSummary: { type: Type.STRING },
    },
    required: ['overallPassed', 'coverageMatrix', 'missingTopics', 'missingSubtopics', 'missingFormulas', 'recommendations', 'auditSummary'],
  };

  const prompt = `You are a strict Document Completeness Auditor for an educational AI system.

Material: "${materialTitle}"

DOCUMENT OUTLINE (what the source contains — authoritative):
${JSON.stringify(documentOutline, null, 2)}

SYNTHESIZED TOPIC EXPLANATIONS (what was actually represented):
${JSON.stringify(topicExplanations, null, 2)}

SYNTHESIZED FORMULAS (what was captured):
${JSON.stringify(formulas, null, 2)}

IMPORTANT RESULTS FROM CHUNKS:
${JSON.stringify(importantResults?.slice(0, 20) ?? [], null, 2)}

═══════════════════════════════════════
AUDIT TASK
═══════════════════════════════════════

Compare the DOCUMENT OUTLINE (authoritative source of what exists) against the SYNTHESIZED INTELLIGENCE (what was actually represented).

For EACH topic and subtopic in the document outline:
1. Check if it has a corresponding entry in topicExplanations
2. Check if its subtopics are mentioned in the explanation
3. Check if associated formulas are captured (if any were expected)
4. Assign a coverage status

COVERAGE STATUS VALUES:
- VERIFIED: Topic + subtopics + formulas all represented with provenance
- PROCESSED: Topic represented but subtopics incomplete or shallow
- PARTIALLY_COVERED: Topic mentioned but explanation is insufficient
- DISCOVERED: Topic found in outline but missing from explanations
- OMITTED: Topic completely absent from synthesized intelligence

The audit PASSES (overallPassed: true) only if:
- All HIGH importance topics are VERIFIED or PROCESSED
- No HIGH importance subtopics are DISCOVERED or OMITTED
- All formulas discovered in the outline are present in synthesized formulas

If missingTopics is non-empty, list the EXACT topic names as they appear in the outline.
If missingFormulas is non-empty, list what was expected but not found.

Be rigorous. Do not be lenient.`;

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

// ── Handler: recoverMissingTopics ─────────────────────────────────────────────

interface RecoverMissingTopicsRequest extends BaseIdentityRequest {
  materialTitle: string;
  missingTopics: string[];
  relevantChunks: any[];  // Chunks that are likely to contain the missing topics
}

async function recoverMissingTopics(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid payload' };
  }
  const { materialTitle, missingTopics, relevantChunks, materialId, materialVersion } = payload as RecoverMissingTopicsRequest;

  if (!missingTopics || missingTopics.length === 0) {
    throw { status: 400, message: 'recoverMissingTopics: missingTopics array is required' };
  }
  if (!relevantChunks || !Array.isArray(relevantChunks) || relevantChunks.length === 0) {
    throw { status: 400, message: 'recoverMissingTopics: relevantChunks array is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'recoverMissingTopics: Strict source identity is required.' };
  }

  const ai = getClient();

  const schema = {
    type: Type.OBJECT,
    properties: {
      recoveredTopicExplanations: {
        type: Type.ARRAY,
        items: topicExplanationSchema,
      },
      recoveredFormulas: {
        type: Type.ARRAY,
        items: formulaSchema,
      },
      recoveryStatus: { type: Type.STRING, enum: ['full', 'partial', 'failed'] },
      unrecoverableTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      recoveryNotes: { type: Type.STRING },
    },
    required: ['recoveredTopicExplanations', 'recoveredFormulas', 'recoveryStatus', 'unrecoverableTopics', 'recoveryNotes'],
  };

  const prompt = `You are performing targeted gap recovery for a document intelligence system.

Material: "${materialTitle}"

MISSING TOPICS (these were NOT adequately represented in the initial synthesis):
${missingTopics.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

RELEVANT SOURCE CHUNK INTELLIGENCE (these chunks likely contain the missing topics):
${JSON.stringify(relevantChunks, null, 2)}

═══════════════════════════════════════
RECOVERY TASK
═══════════════════════════════════════

For EACH missing topic, search the chunk intelligence and produce:
1. A COMPLETE TopicExplanation (quickExplanation, detailedExplanation, deepDive)
2. Any formulas associated with this topic (EXACT notation)

RULES:
- Only recover information that is ACTUALLY in the chunk intelligence provided
- If a missing topic is genuinely not in the chunk intelligence: add to unrecoverableTopics
- Preserve EXACT formula notation (Y = −0.947 + 2.448X, not paraphrased)
- Include precise source references from the chunks
- Do NOT hallucinate information not present in the chunks

Recovery Status:
- "full" = all missing topics recovered
- "partial" = some recovered, some unrecoverable
- "failed" = no missing topics could be recovered from these chunks`;

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

// ── Handler: analyzeExplanation ───────────────────────────────────────────────

interface AnalyzeExplanationRequest extends BaseIdentityRequest {
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
  const { session, explanation, topicName, materialContext, materialId, materialVersion } = payload as AnalyzeExplanationRequest;
  if (!explanation || typeof explanation !== 'string') {
    throw { status: 400, message: 'analyzeExplanation: explanation is required and must be a string' };
  }
  if (!session || typeof session !== 'object') {
    throw { status: 400, message: 'analyzeExplanation: session object is required' };
  }
  if (!session.topicId || typeof session.topicId !== 'string') {
    throw { status: 400, message: 'analyzeExplanation: session.topicId is required and must be a string' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'analyzeExplanation: Strict source identity is required.' };
  }

  const ai = getClient();
  const trimmedExplanation = trimExplanation(explanation);

  let validatedContext = materialContext ?? '';
  if (Buffer.byteLength(validatedContext, 'utf8') > MAX_CONTEXT_BYTES) {
    validatedContext = validatedContext.slice(0, MAX_CONTEXT_BYTES);
    console.warn(`[api/ai] analyzeExplanation: Context truncated to ${MAX_CONTEXT_BYTES} bytes.`);
  }

  const topic = topicName ?? session.topicId;

  const prompt = `You are an educational AI evaluating a student's understanding.

Topic being taught: ${topic}
${validatedContext ? `\nRelevant material context:\n${validatedContext}` : ''}

The student was asked to explain: "${topic}"

The student's explanation:
"${trimmedExplanation}"

Evaluate this explanation carefully:
1. Identify which key concepts the student correctly demonstrated (studentEvidence)
2. Identify what evidence you expected to see for each key concept (expectedEvidence)
3. Identify what is missing from their explanation (missingEvidence)
4. Detect any misconceptions — incorrect statements or confused relationships
5. Assign an overall status based on quality of the actual explanation

CRITICAL RULES:
- GROUNDING: Base evaluation STRICTLY on the "Relevant material context". Do NOT invent facts or rely on outside knowledge. If insufficient context: return "Insufficient source evidence to evaluate this point."
- Base studentEvidence ONLY on what the student actually said
- If student's explanation contains errors: classify as potential_misconception, NOT mastered
- masteryIndex scores must be calculated honestly:
  - conceptCoverage (0–35): how many key concepts were correctly addressed
  - explanationQuality (0–25): clarity and accuracy
  - followupPerformance (0–20): set to 10 as baseline (no followup yet)
  - consistency (0–20): internal consistency
  - total = sum (0–100)`;

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

// ── Handler: generateFollowUpQuestion ────────────────────────────────────────

interface GenerateFollowUpRequest extends BaseIdentityRequest {
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
  const { analysis, materialId, materialVersion } = payload as GenerateFollowUpRequest;
  if (!analysis || typeof analysis !== 'object' || !analysis.topic) {
    throw { status: 400, message: 'generateFollowUpQuestion: valid analysis object with a topic is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'generateFollowUpQuestion: Strict source identity is required.' };
  }

  const ai = getClient();

  const weakConcepts = (analysis.concepts ?? []).filter(
    (c: any) => c.status === 'potential_misconception' || c.status === 'partial' || c.status === 'weak'
  );
  const targetConcept = weakConcepts[0] ?? analysis.concepts?.[0] ?? { concept: analysis.topic };
  const missingEvidence = targetConcept.missingEvidence ?? [];

  const schema = {
    type: Type.OBJECT,
    properties: {
      question:      { type: Type.STRING },
      rationale:     { type: Type.STRING },
      targetConcept: { type: Type.STRING },
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

// ── Handler: generateRepair ───────────────────────────────────────────────────

interface GenerateRepairRequest extends BaseIdentityRequest {
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
  const { analysis, materialId, materialVersion } = payload as GenerateRepairRequest;
  if (!analysis || typeof analysis !== 'object' || !analysis.topic) {
    throw { status: 400, message: 'generateRepair: valid analysis object with a topic is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'generateRepair: Strict source identity is required.' };
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
5. Is completely specific to "${analysis.topic}" — no unrelated topic references

The repair must target the EXACT weakness identified, not generic content.`;

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

// ── Handler: evaluateReExplanation ────────────────────────────────────────────

interface EvaluateReExplanationRequest extends BaseIdentityRequest {
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
  const { session, reExplanation, materialId, materialVersion } = payload as EvaluateReExplanationRequest;
  if (!reExplanation || typeof reExplanation !== 'string') {
    throw { status: 400, message: 'evaluateReExplanation: reExplanation is required and must be a string' };
  }
  if (!session || typeof session !== 'object') {
    throw { status: 400, message: 'evaluateReExplanation: session object is required' };
  }
  if (!materialId || typeof materialVersion !== 'number') {
    throw { status: 400, message: 'evaluateReExplanation: Strict source identity is required.' };
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
Update masteryIndex to reflect improvement (or lack thereof) compared to the previous attempt.
If the student addressed previous gaps, conceptCoverage and explanationQuality should increase.
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
  discoverChunkTopics,
  mergeTopicCandidates,
  extractChunkIntelligence,
  aggregateMaterial,
  auditCompleteness,
  recoverMissingTopics,
  analyzeExplanation,
  generateFollowUpQuestion,
  generateRepair,
  evaluateReExplanation,
};

// ── Vercel Serverless entry point ─────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  let body: { method?: string; payload?: any };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Invalid JSON body' } });
  }

  const { method, payload } = body ?? {};

  if (!method || typeof method !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing method in request body' } });
  }

  const handle = HANDLERS[method];
  if (!handle) {
    return res.status(404).json({ error: { code: 'UNKNOWN_METHOD', message: `Unknown method: ${method}` } });
  }

  try {
    const result = await Promise.race([
      handle(payload ?? {}),
      new Promise((_, reject) =>
        setTimeout(
          () => reject({ status: 504, code: 'AI_PROVIDER_TIMEOUT', message: 'Provider timeout exceeded' }),
          55000
        )
      ),
    ]);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err && err.status === 400) {
      console.warn(`[api/ai] Validation failed:`, err.message);
      return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: err.message } });
    }

    if (err && (err.status === 503 || err.status === 504)) {
      return res.status(err.status).json({ error: { code: err.code || 'AI_PROVIDER_UNAVAILABLE', message: err.message } });
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
          operation: method,
        },
      });
    }

    console.error(`[api/ai] ${method} failed:`, err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_API_ERROR',
        message: msg,
      },
    });
  }
}
