import type {
  ProcessedMaterial,
  ExtractedConcept,
  KeyTerm,
  MaterialSection,
  SourceReference,
  ProcessingManifest,
  ChunkIntelligence,
  Formula,
  DocumentOutlineItem,
  TopicExplanation,
  DocumentOmission,
  CoverageEntry,
} from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CHUNK_CHARS = 30_000;
const CONCURRENCY = 3;
const MAX_AUDIT_CYCLES = 2;

// Hierarchical aggregation: if full payload > this, batch chunks before final synthesis
const AGGREGATION_BATCH_SIZE = 20;
const MAX_AGGREGATION_BYTES = 3_500_000; // Stay safely under 4MB backend limit

// ── Document Sectioning ────────────────────────────────────────────────────────

function extractSectionsOffline(content: string): MaterialSection[] {
  const sections: MaterialSection[] = [];
  const pageRegex = /--- (PAGE|SLIDE) (\d+) ---/gi;

  pageRegex.lastIndex = 0;
  let match = pageRegex.exec(content);

  if (!match) {
    // Fallback: split by markdown headers
    const lines = content.split('\n');
    let currentSection: MaterialSection | null = null;
    const fallbackSections: MaterialSection[] = [];

    lines.forEach((line, idx) => {
      const isBold = line.includes('**') || line.match(/^#+/);
      if (isBold && line.length < 100) {
        if (currentSection) fallbackSections.push(currentSection);
        currentSection = {
          id: `sec-${fallbackSections.length}`,
          title: line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim(),
          content: '',
          pageNumber: Math.floor(idx / 50) + 1,
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      } else {
        currentSection = {
          id: `sec-0`,
          title: 'Content',
          content: line + '\n',
          pageNumber: 1,
        };
      }
    });

    if (currentSection) fallbackSections.push(currentSection);

    if (fallbackSections.length === 0) {
      return [{ id: 'sec-0', title: 'Content', content, pageNumber: 1 }];
    }
    return fallbackSections;
  }

  // Parse by PAGE/SLIDE markers
  let currentMarker: RegExpExecArray | null = match;
  while (currentMarker !== null) {
    const type = currentMarker[1].toUpperCase();
    const num = parseInt(currentMarker[2], 10);
    const startIndex = currentMarker.index + currentMarker[0].length;

    const nextMarker = pageRegex.exec(content);
    const endIndex = nextMarker !== null ? nextMarker.index : content.length;

    const textContent = content.substring(startIndex, endIndex).trim();

    sections.push({
      id: `${type.toLowerCase()}-${num}`,
      title: `${type} ${num}`,
      content: textContent,
      pageNumber: num,
    });

    currentMarker = nextMarker;
  }

  return sections;
}

function createSourceReferencesOffline(sections: MaterialSection[]): SourceReference[] {
  return sections.map((sec, idx) => ({
    id: `ref-${idx}`,
    location: sec.pageNumber
      ? sec.title.includes('Slide')
        ? `Slide ${sec.pageNumber}`
        : `Page ${sec.pageNumber}`
      : `Section: ${sec.title}`,
    content: sec.content.slice(0, 300) + '...',
    conceptsReferenced: [sec.title],
  }));
}

function generateSummaryOffline(content: string): string {
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  return sentences.slice(0, 3).join('. ') + '.';
}

function extractTitle(content: string, fileName?: string): string {
  if (fileName) return fileName.replace(/\.[^/.]+$/, '');
  const lines = content.trim().split('\n');
  const firstLine = lines[0];
  if (firstLine && firstLine.length < 100) return firstLine.replace(/^#+\s*/, '').trim();
  return content.split(/\s+/).filter(w => w.length > 4).slice(0, 3).join(' ');
}

// ── Chunking ──────────────────────────────────────────────────────────────────

function chunkSections(sections: MaterialSection[]): { text: string; pages: number[] }[] {
  const chunks: { text: string; pages: number[] }[] = [];
  let currentText = '';
  let currentPages: number[] = [];

  for (const sec of sections) {
    const secText = `\n\n--- ${sec.title} ---\n${sec.content}`;

    if (currentText.length + secText.length > MAX_CHUNK_CHARS && currentText.length > 0) {
      chunks.push({ text: currentText, pages: [...currentPages] });
      currentText = secText;
      currentPages = sec.pageNumber ? [sec.pageNumber] : [];
    } else {
      currentText += secText;
      if (sec.pageNumber) currentPages.push(sec.pageNumber);
    }
  }

  if (currentText.length > 0) {
    chunks.push({ text: currentText, pages: currentPages });
  }

  return chunks;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function computeHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      const status = err.status || 500;
      const shouldRetry =
        status === 502 || status === 503 || status === 504 ||
        err.message?.includes('fetch failed');
      if (!shouldRetry) throw err;
      attempt++;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('Unreachable');
}

async function callDiscoverChunkTopics(materialText: string, materialTitle: string, materialId: string, materialVersion: number) {
  return callWithRetry(async () => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'discoverChunkTopics',
        payload: { materialText, materialTitle, materialId, materialVersion },
      }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw {
        status: response.status,
        message: `Topic discovery failed (${response.status}): ${errData?.error?.message || 'Unknown'}`,
      };
    }
    return response.json();
  });
}

async function callMergeTopicCandidates(materialTitle: string, chunkTopics: any[], materialId: string, materialVersion: number) {
  return callWithRetry(async () => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'mergeTopicCandidates',
        payload: { materialTitle, chunkTopics, materialId, materialVersion },
      }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw {
        status: response.status,
        message: `Topic merge failed (${response.status}): ${errData?.error?.message || 'Unknown'}`,
      };
    }
    return response.json();
  });
}

async function callExtractChunkIntelligence(materialText: string, materialTitle: string, materialId: string, materialVersion: number) {
  return callWithRetry(async () => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'extractChunkIntelligence',
        payload: { materialText, materialTitle, materialId, materialVersion },
      }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw {
        status: response.status,
        message: `Chunk extraction failed (${response.status}): ${errData?.error?.message || 'Unknown'}`,
      };
    }
    return response.json();
  });
}

async function callAggregateMaterial(
  materialTitle: string,
  chunks: any[],
  materialId: string,
  materialVersion: number,
  isPartial = false
) {
  return callWithRetry(async () => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'aggregateMaterial',
        payload: { materialTitle, chunks, isPartial, materialId, materialVersion },
      }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw {
        status: response.status,
        message: `Aggregation failed (${response.status}): ${errData?.error?.message || 'Unknown'}`,
      };
    }
    return response.json();
  });
}

async function callAuditCompleteness(
  materialTitle: string,
  documentOutline: any[],
  topicExplanations: any[],
  formulas: any[],
  importantResults: any[],
  materialId: string,
  materialVersion: number
) {
  return callWithRetry(async () => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'auditCompleteness',
        payload: { materialTitle, documentOutline, topicExplanations, formulas, importantResults, materialId, materialVersion },
      }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw {
        status: response.status,
        message: `Completeness audit failed (${response.status}): ${errData?.error?.message || 'Unknown'}`,
      };
    }
    return response.json();
  });
}

async function callRecoverMissingTopics(
  materialTitle: string,
  missingTopics: string[],
  relevantChunks: any[],
  materialId: string,
  materialVersion: number
) {
  return callWithRetry(async () => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'recoverMissingTopics',
        payload: { materialTitle, missingTopics, relevantChunks, materialId, materialVersion },
      }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw {
        status: response.status,
        message: `Recovery failed (${response.status}): ${errData?.error?.message || 'Unknown'}`,
      };
    }
    return response.json();
  });
}

// ── Demo-only helpers ─────────────────────────────────────────────────────────

function extractConceptsDemo(content: string): ExtractedConcept[] {
  const concepts: ExtractedConcept[] = [];
  const regex = /\*\*([^*]+)\*\*/gm;
  const found = new Set<string>();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const term = (match[1] || '').trim();
    if (term.length > 2 && term.length < 100 && !found.has(term)) {
      found.add(term);
      concepts.push({
        id: term.toLowerCase().replace(/\s+/g, '-'),
        name: term,
        canonicalName: term,
        aliases: [],
        definition: `${term} is a key concept in this material.`,
        keyPoints: [`${term} is mentioned in the material`],
        relatedConcepts: [],
        sourceReference: 'Source reference unavailable',
        masteryStatus: 'not_started',
        evidence: [],
        missingEvidence: [],
      });
    }
  }

  if (concepts.length === 0) {
    const title = extractTitle(content, undefined);
    concepts.push({
      id: title.toLowerCase().replace(/\s+/g, '-'),
      name: title,
      canonicalName: title,
      aliases: [],
      definition: `${title} is the main concept in this material.`,
      keyPoints: ['Review the uploaded material to understand this concept'],
      relatedConcepts: [],
      sourceReference: 'Source reference unavailable',
      masteryStatus: 'not_started',
      evidence: [],
      missingEvidence: [],
    });
  }

  return concepts.slice(0, 8);
}

function extractKeyTermsDemo(content: string): KeyTerm[] {
  const words = content.split(/\s+/).filter(w => w.length > 6 && w.length < 20).slice(0, 10);
  return words.slice(0, 4).map(term => ({
    term: term.replace(/[^a-z0-9]/gi, ''),
    definition: `${term} is a term used in this material.`,
  }));
}

// ── ProcessorOptions ──────────────────────────────────────────────────────────

export interface ProcessorOptions {
  materialId: string;
  onProgress?: (manifest: ProcessingManifest, newChunks: ChunkIntelligence[]) => void;
  existingManifest?: ProcessingManifest;
  isDemo?: boolean;
}

// ── MaterialProcessor ─────────────────────────────────────────────────────────

export class MaterialProcessor {
  async processText(
    content: string,
    originalFileName?: string,
    options?: ProcessorOptions
  ): Promise<{ processed: ProcessedMaterial; manifest: ProcessingManifest; chunks: ChunkIntelligence[] }> {
    const title = extractTitle(content, originalFileName);
    const sourceFingerprint = computeHash(content);

    // ── Offline extraction (all modes) ────────────────────────────────────────
    const sections = extractSectionsOffline(content);
    const sourceReferences = createSourceReferencesOffline(sections);

    const isDemo = options?.isDemo ?? false;

    // ── DEMO MODE ─────────────────────────────────────────────────────────────
    if (isDemo) {
      await new Promise(r => setTimeout(r, 800));
      const summary = generateSummaryOffline(content);
      const concepts = extractConceptsDemo(content);
      const keyTerms = extractKeyTermsDemo(content);

      const manifest: ProcessingManifest = {
        processingRunId: 'demo-run',
        sourceFingerprint,
        materialVersion: 1,
        promptVersion: '1',
        modelVersion: 'demo',
        schemaVersion: '1',
        processorVersion: '2.1',
        sourceExtractionStatus: 'succeeded',
        chunkProcessingStatus: 'succeeded',
        aggregationStatus: 'succeeded',
        indexingStatus: 'pending',
        knowledgeMapStatus: 'pending',
        completenessAuditStatus: 'pending',
        totalPages: 1,
        totalChunks: 1,
        completedChunks: 1,
        failedChunks: 0,
        failedChunkIndices: [],
        auditCycles: 0,
        topicsDiscovered: concepts.length,
        topicsRepresented: concepts.length,
        isPartial: false,
      };

      const processed: ProcessedMaterial = {
        title,
        summary,
        quickExplanation: 'Demo explanation — upload a real document for AI-powered intelligence.',
        detailedExplanation: 'Demo explanation — upload a real document for AI-powered intelligence.',
        deepDive: 'Demo explanation — upload a real document for AI-powered intelligence.',
        explanation: 'Demo explanation',
        documentOutline: [],
        topicExplanations: [],
        sections,
        concepts,
        keyTerms,
        keyIdeas: [],
        importantResults: [],
        formulas: [],
        groundedClaims: [],
        sourceAwareInsights: [],
        sourceReferences,
        suggestedLearningPath: concepts.slice(0, 5).map(c => c.name),
        conclusions: [],
        omissions: [],
        coverageMatrix: [],
        completenessAuditPassed: false,
        visualLimitationsNoted: false,
      };

      return { processed, manifest, chunks: [] };
    }

    // ── LIVE MODE: Full §6 Pipeline ───────────────────────────────────────────

    const chunks = chunkSections(sections);

    const manifest: ProcessingManifest = options?.existingManifest ?? {
      processingRunId: crypto.randomUUID(),
      sourceFingerprint,
      materialVersion: 1,
      promptVersion: '2.0',
      modelVersion: 'gemini-3.6-flash',
      schemaVersion: '2.0',
      processorVersion: '2.1',
      sourceExtractionStatus: 'succeeded',
      chunkProcessingStatus: 'pending',
      aggregationStatus: 'pending',
      indexingStatus: 'pending',
      knowledgeMapStatus: 'pending',
      completenessAuditStatus: 'pending',
      totalPages: sections.length,
      totalChunks: chunks.length,
      completedChunks: 0,
      failedChunks: 0,
      failedChunkIndices: [],
      auditCycles: 0,
      topicsDiscovered: 0,
      topicsRepresented: 0,
      isPartial: false,
    };

    // ════════════════════════════════════════════════════════════════════
    // PHASE 0: TOPIC DISCOVERY (Explicit Outline Generation)
    // ════════════════════════════════════════════════════════════════════
    
    let globalDocumentOutline: DocumentOutlineItem[] = [];
    
    try {
      // 1. Discover local topics per chunk
      const localTopicsPromises = chunks.map((chunk, idx) => {
        const pageStart = chunk.pages.length > 0 ? Math.min(...chunk.pages) : 1;
        const pageEnd = chunk.pages.length > 0 ? Math.max(...chunk.pages) : 1;
        const chunkTitle = `${title} (Pages ${pageStart}–${pageEnd})`;
        return callDiscoverChunkTopics(chunk.text, chunkTitle, options?.materialId || 'unknown', manifest.materialVersion)
          .then(res => res.localTopics || [])
          .catch(err => {
            console.warn(`[MaterialProcessor] Topic discovery failed for chunk ${idx}:`, err);
            return [];
          });
      });
      
      const localTopicsArray = await Promise.all(localTopicsPromises);
      const flattenedTopics = localTopicsArray.flat();
      
      // 2. Merge topic candidates into a document outline
      if (flattenedTopics.length > 0) {
        const mergeResult = await callMergeTopicCandidates(title, flattenedTopics, options?.materialId || 'unknown', manifest.materialVersion);
        globalDocumentOutline = mergeResult.documentOutline || [];
        manifest.topicsDiscovered = globalDocumentOutline.length;
      }
    } catch (e) {
      console.error('[MaterialProcessor] Phase 0 (Topic Discovery) failed, falling back:', e);
      // Fallback is just empty documentOutline, audit completeness will still work
    }

    // ════════════════════════════════════════════════════════════════════
    // PHASE 1: CHUNK INTELLIGENCE (progressive — never abort on failure)
    // ════════════════════════════════════════════════════════════════════

    const chunkIntelligences: ChunkIntelligence[] = [];
    const failedChunkIndices: number[] = [];
    let visualLimitationsNoted = false;

    manifest.chunkProcessingStatus = 'processing';
    if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

    let i = 0;
    while (i < chunks.length) {
      const batch = chunks.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.allSettled(
        batch.map(async (chunk, batchIdx) => {
          const chunkIndex = i + batchIdx;
          const pageStart = chunk.pages.length > 0 ? Math.min(...chunk.pages) : 1;
          const pageEnd = chunk.pages.length > 0 ? Math.max(...chunk.pages) : 1;
          const chunkHash = computeHash(chunk.text);

          const pageRange = chunk.pages.length > 0 ? ` (Pages ${pageStart}–${pageEnd})` : '';
          const chunkTitle = `${title}${pageRange}`;

          const aiResult = await callExtractChunkIntelligence(
            chunk.text, 
            chunkTitle, 
            options?.materialId || 'unknown', 
            manifest.materialVersion
          );

          // Note visual limitations
          if (aiResult.visualLimitations?.length > 0) {
            visualLimitationsNoted = true;
          }

          const chunkIntel: ChunkIntelligence = {
            processingRunId: manifest.processingRunId,
            materialId: options?.materialId || 'unknown',
            materialVersion: manifest.materialVersion,
            chunkId: crypto.randomUUID(),
            chunkHash,
            chunkIndex,
            pageStart,
            pageEnd,
            concepts: aiResult.concepts || [],
            keyTerms: aiResult.keyTerms || [],
            keyIdeas: aiResult.keyIdeas || [],
            importantResults: aiResult.importantResults || [],
            relationships: aiResult.relationships || [],
            groundedClaims: aiResult.groundedClaims || [],
            sourceReferences: [],
          };

          // Attach formulas to chunk (stored separately for aggregation)
          (chunkIntel as any).formulas = aiResult.formulas || [];
          (chunkIntel as any).visualLimitations = aiResult.visualLimitations || [];
          (chunkIntel as any).tableNotes = aiResult.tableNotes || [];

          return { chunkIndex, chunkIntel };
        })
      );

      // Process results — persist successes, record failures (NEVER throw)
      for (let b = 0; b < batchResults.length; b++) {
        const batchResult = batchResults[b];
        const chunkIndex = i + b;

        if (batchResult.status === 'fulfilled') {
          chunkIntelligences.push(batchResult.value.chunkIntel);
          manifest.completedChunks++;
        } else {
          console.error(`[MaterialProcessor] Chunk ${chunkIndex} failed:`, batchResult.reason);
          failedChunkIndices.push(chunkIndex);
          manifest.failedChunks++;
        }
      }

      // Persist successful chunks immediately via onProgress
      if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
      i += CONCURRENCY;
    }

    // Update manifest after chunk phase
    manifest.failedChunkIndices = failedChunkIndices;
    manifest.isPartial = failedChunkIndices.length > 0;

    if (chunkIntelligences.length === 0) {
      // ALL chunks failed — nothing to aggregate
      manifest.chunkProcessingStatus = 'failed';
      manifest.aggregationStatus = 'failed';
      if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
      throw new Error(
        `All ${chunks.length} chunks failed to process. Cannot produce document intelligence. ` +
        `Check API availability and retry.`
      );
    }

    if (failedChunkIndices.length > 0) {
      manifest.chunkProcessingStatus = 'partial';
    } else {
      manifest.chunkProcessingStatus = 'succeeded';
    }

    // ════════════════════════════════════════════════════════════════════
    // PHASE 2: LOCAL AGGREGATION (concept deduplication)
    // ════════════════════════════════════════════════════════════════════

    const aggregatedConcepts: Map<string, ExtractedConcept> = new Map();
    const aggregatedKeyTerms: Map<string, KeyTerm> = new Map();
    const aggregatedKeyIdeas: any[] = [];
    const aggregatedImportantResults: any[] = [];
    const aggregatedRelationships: any[] = [];
    const aggregatedGroundedClaims: any[] = [];
    const aggregatedFormulas: any[] = [];

    for (const intel of chunkIntelligences) {
      intel.concepts.forEach(c => {
        const canonicalId = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (!aggregatedConcepts.has(canonicalId)) {
          aggregatedConcepts.set(canonicalId, {
            id: canonicalId,
            name: c.name,
            canonicalName: c.name,
            aliases: [],
            definition: c.definition,
            keyPoints: c.keyPoints || [],
            relatedConcepts: c.relatedConcepts || [],
            sourceReference: (c as any).sourceReferences?.join('; ') || 'Unknown',
            masteryStatus: 'not_started',
            evidence: [],
            missingEvidence: [],
          });
        }
      });

      intel.keyTerms.forEach(kt => {
        const canonicalTerm = kt.term.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (!aggregatedKeyTerms.has(canonicalTerm)) aggregatedKeyTerms.set(canonicalTerm, kt);
      });

      aggregatedKeyIdeas.push(...intel.keyIdeas);
      aggregatedImportantResults.push(...intel.importantResults);
      aggregatedRelationships.push(...intel.relationships);
      aggregatedGroundedClaims.push(...intel.groundedClaims);

      // Deduplicate formulas by expression
      const existingExpressions = new Set(aggregatedFormulas.map((f: any) => f.expression?.toLowerCase()));
      ((intel as any).formulas || []).forEach((f: any) => {
        if (!existingExpressions.has(f.expression?.toLowerCase())) {
          aggregatedFormulas.push(f);
          existingExpressions.add(f.expression?.toLowerCase());
        }
      });
    }

    // ════════════════════════════════════════════════════════════════════
    // PHASE 3: SERVER-SIDE AGGREGATION (full payload — no stripping)
    // ════════════════════════════════════════════════════════════════════

    manifest.aggregationStatus = 'processing';
    if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

    let globalIntelligence: any;

    // Build the full aggregation payload — send complete chunk intelligence
    const fullAggregationPayload = chunkIntelligences.map(ci => ({
      chunkIndex: ci.chunkIndex,
      pageStart: ci.pageStart,
      pageEnd: ci.pageEnd,
      concepts: ci.concepts,
      keyTerms: ci.keyTerms,
      keyIdeas: ci.keyIdeas,
      importantResults: ci.importantResults,
      relationships: ci.relationships,
      groundedClaims: ci.groundedClaims,
      formulas: (ci as any).formulas || [],
      visualLimitations: (ci as any).visualLimitations || [],
      tableNotes: (ci as any).tableNotes || [],
    }));

    // Check if payload fits in a single pass
    const payloadSize = new TextEncoder().encode(JSON.stringify(fullAggregationPayload)).length;

    try {
      if (payloadSize <= MAX_AGGREGATION_BYTES && chunkIntelligences.length <= AGGREGATION_BATCH_SIZE) {
        // ── Single-pass aggregation ──────────────────────────────────────
        globalIntelligence = await callAggregateMaterial(title, fullAggregationPayload, options?.materialId || 'unknown', manifest.materialVersion, manifest.isPartial);
      } else {
        // ── Hierarchical aggregation ─────────────────────────────────────
        // Step 1: Batch chunk intelligences into intermediate summaries
        const batchSummaries: any[] = [];
        for (let start = 0; start < fullAggregationPayload.length; start += AGGREGATION_BATCH_SIZE) {
          const batch = fullAggregationPayload.slice(start, start + AGGREGATION_BATCH_SIZE);
          const batchResult = await callAggregateMaterial(
            `${title} [Batch ${Math.floor(start / AGGREGATION_BATCH_SIZE) + 1}]`,
            batch,
            options?.materialId || 'unknown',
            manifest.materialVersion,
            manifest.isPartial
          );
          batchSummaries.push({
            chunkIndex: start,
            pageStart: batch[0]?.pageStart,
            pageEnd: batch[batch.length - 1]?.pageEnd,
            concepts: batchResult.topicExplanations || [],
            keyIdeas: batchResult.sourceAwareInsights || [],
            importantResults: batchResult.formulas?.map((f: any) => ({ result: f.expression, significance: f.significance, sourceReferences: f.sourceReferences })) || [],
            formulas: batchResult.formulas || [],
          });
        }
        // Step 2: Synthesize batch summaries into final intelligence
        globalIntelligence = await callAggregateMaterial(title, batchSummaries, options?.materialId || 'unknown', manifest.materialVersion, manifest.isPartial);
      }

      manifest.aggregationStatus = 'succeeded';
    } catch (e) {
      manifest.aggregationStatus = 'failed';
      if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
      throw e;
    }

    // ════════════════════════════════════════════════════════════════════
    // PHASE 4: COMPLETENESS AUDIT + TARGETED RECOVERY (§29–§37)
    // ════════════════════════════════════════════════════════════════════

    manifest.completenessAuditStatus = 'processing';
    if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

    let topicExplanations: TopicExplanation[] = globalIntelligence.topicExplanations || [];
    let formulas: Formula[] = [
      ...aggregatedFormulas,
      ...(globalIntelligence.formulas || []).filter((f: any) => {
        const existing = aggregatedFormulas.find((af: any) =>
          af.expression?.toLowerCase() === f.expression?.toLowerCase()
        );
        return !existing;
      }),
    ];
    const documentOutline: DocumentOutlineItem[] = globalDocumentOutline.length > 0 ? globalDocumentOutline : (globalIntelligence.documentOutline || []);
    let coverageMatrix: CoverageEntry[] = [];
    let completenessAuditPassed = false;

    // Build omissions (from chunk visual limitations + any flagged items)
    const omissions: DocumentOmission[] = [];
    for (const intel of chunkIntelligences) {
      const vl: string[] = (intel as any).visualLimitations || [];
      vl.forEach((lim: string, idx: number) => {
        omissions.push({
          omissionId: `visual-${intel.chunkIndex}-${idx}`,
          topic: lim,
          reason: 'visual_unavailable',
          severity: 'medium',
          recoverable: false,
          sourceReference: `Pages ${intel.pageStart}–${intel.pageEnd}`,
        });
      });
      const tn: string[] = (intel as any).tableNotes || [];
      tn.forEach((note: string, idx: number) => {
        if (note.includes('TABLE_PRESENT_TEXT_UNAVAILABLE')) {
          omissions.push({
            omissionId: `table-${intel.chunkIndex}-${idx}`,
            topic: `Table on Pages ${intel.pageStart}–${intel.pageEnd}`,
            reason: 'table_extraction_failed',
            severity: 'medium',
            recoverable: false,
            sourceReference: `Pages ${intel.pageStart}–${intel.pageEnd}`,
          });
        }
      });
    }

    // Add omissions from failed chunks
    failedChunkIndices.forEach(idx => {
      const chunk = chunks[idx];
      const pageRange = chunk?.pages.length > 0
        ? `Pages ${Math.min(...chunk.pages)}–${Math.max(...chunk.pages)}`
        : `Chunk ${idx}`;
      omissions.push({
        omissionId: `failed-chunk-${idx}`,
        topic: `Content from ${pageRange}`,
        reason: 'ai_failure',
        severity: 'high',
        recoverable: true,
        sourceReference: pageRange,
      });
    });

    // Add any omissions from AI synthesis
    (globalIntelligence.omissions || []).forEach((o: any) => {
      omissions.push({
        omissionId: o.omissionId || crypto.randomUUID(),
        topic: o.topic || 'Unknown',
        reason: o.reason || 'unknown',
        severity: o.severity || 'medium',
        recoverable: o.recoverable ?? false,
        sourceReference: o.sourceReference,
      });
    });

    // Run audit cycle(s)
    let auditCycles = 0;
    if (documentOutline.length > 0 && !manifest.isPartial) {
      try {
        while (auditCycles < MAX_AUDIT_CYCLES) {
          auditCycles++;
          manifest.auditCycles = auditCycles;

          const auditResult = await callAuditCompleteness(
            title,
            documentOutline,
            topicExplanations,
            formulas,
            aggregatedImportantResults,
            options?.materialId || 'unknown',
            manifest.materialVersion
          );

          coverageMatrix = auditResult.coverageMatrix || [];
          completenessAuditPassed = auditResult.overallPassed ?? false;

          if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

          if (completenessAuditPassed) break;

          const missingTopics: string[] = auditResult.missingTopics || [];
          if (missingTopics.length === 0) {
            // Nothing left to recover
            completenessAuditPassed = true;
            break;
          }

          if (auditCycles >= MAX_AUDIT_CYCLES) {
            // Final cycle — document any remaining missing topics as omissions
            missingTopics.forEach(t => {
              if (!omissions.find(o => o.topic === t)) {
                omissions.push({
                  omissionId: `unrecovered-${t.toLowerCase().replace(/\s+/g, '-')}`,
                  topic: t,
                  reason: 'aggregation_loss',
                  severity: 'high',
                  recoverable: true,
                  sourceReference: undefined,
                });
              }
            });
            break;
          }

          // TARGETED RECOVERY: only re-process chunks relevant to missing topics
          const relevantChunks = chunkIntelligences
            .filter(ci => {
              // Find chunks that might contain the missing topics
              const conceptNames = ci.concepts.map((c: any) => c.name.toLowerCase());
              const ideaTexts = ci.keyIdeas.map((k: any) => (k.idea + ' ' + k.explanation).toLowerCase());
              return missingTopics.some(topic =>
                conceptNames.some(cn => cn.includes(topic.toLowerCase()) || topic.toLowerCase().includes(cn)) ||
                ideaTexts.some(it => it.includes(topic.toLowerCase()))
              );
            })
            .map(ci => ({
              chunkIndex: ci.chunkIndex,
              pageStart: ci.pageStart,
              pageEnd: ci.pageEnd,
              concepts: ci.concepts,
              keyTerms: ci.keyTerms,
              keyIdeas: ci.keyIdeas,
              importantResults: ci.importantResults,
              formulas: (ci as any).formulas || [],
            }));

          if (relevantChunks.length > 0) {
            try {
              const recoveryResult = await callRecoverMissingTopics(
                title,
                missingTopics,
                relevantChunks,
                options?.materialId || 'unknown',
                manifest.materialVersion
              );

              // Merge recovered intelligence
              const recoveredExplanations: TopicExplanation[] = recoveryResult.recoveredTopicExplanations || [];
              const existingTopicIds = new Set(topicExplanations.map(te => te.topicId));
              recoveredExplanations.forEach(re => {
                if (!existingTopicIds.has(re.topicId)) {
                  topicExplanations.push(re);
                } else {
                  // Merge deeper explanation into existing
                  const existing = topicExplanations.find(te => te.topicId === re.topicId);
                  if (existing && re.deepDive && re.deepDive.length > existing.deepDive.length) {
                    existing.deepDive = re.deepDive;
                  }
                }
              });

              // Merge recovered formulas
              const recoveredFormulas: Formula[] = recoveryResult.recoveredFormulas || [];
              const existingExpressions = new Set(formulas.map((f: any) => f.expression?.toLowerCase()));
              recoveredFormulas.forEach(rf => {
                if (!existingExpressions.has(rf.expression?.toLowerCase())) {
                  formulas.push(rf);
                  existingExpressions.add(rf.expression?.toLowerCase());
                }
              });
            } catch (recoveryErr) {
              console.error('[MaterialProcessor] Recovery failed:', recoveryErr);
              // Recovery failure is non-fatal — document it
              missingTopics.forEach(t => {
                if (!omissions.find(o => o.topic === t)) {
                  omissions.push({
                    omissionId: `recovery-failed-${t.toLowerCase().replace(/\s+/g, '-')}`,
                    topic: t,
                    reason: 'ai_failure',
                    severity: 'high',
                    recoverable: true,
                    sourceReference: undefined,
                  });
                }
              });
            }
          }
        }

        manifest.completenessAuditStatus = completenessAuditPassed ? 'succeeded' : 'partial';
      } catch (auditErr) {
        console.error('[MaterialProcessor] Completeness audit failed:', auditErr);
        manifest.completenessAuditStatus = 'failed';
        // Non-fatal: document intelligence is still available, just not audited
      }
    } else if (manifest.isPartial) {
      // Cannot run completeness audit on partial data
      manifest.completenessAuditStatus = 'pending';
      completenessAuditPassed = false;
    }

    manifest.auditCycles = auditCycles;
    manifest.topicsDiscovered = documentOutline.length;
    manifest.topicsRepresented = topicExplanations.length;

    // ════════════════════════════════════════════════════════════════════
    // PHASE 5: FINALIZE
    // ════════════════════════════════════════════════════════════════════

    const finalResult: ProcessedMaterial = {
      title,
      summary: globalIntelligence.summary || 'Summary unavailable.',
      quickExplanation: globalIntelligence.quickExplanation || '',
      detailedExplanation: globalIntelligence.detailedExplanation || '',
      deepDive: globalIntelligence.deepDive || '',
      explanation: globalIntelligence.detailedExplanation || globalIntelligence.explanation || '',
      documentOutline,
      topicExplanations,
      sections,
      concepts: Array.from(aggregatedConcepts.values()),
      keyTerms: Array.from(aggregatedKeyTerms.values()),
      keyIdeas: aggregatedKeyIdeas,
      importantResults: aggregatedImportantResults,
      formulas,
      groundedClaims: aggregatedGroundedClaims,
      sourceAwareInsights: globalIntelligence.sourceAwareInsights || [],
      sourceReferences,
      suggestedLearningPath: globalIntelligence.suggestedLearningPath || [],
      conclusions: globalIntelligence.conclusions || [],
      omissions,
      coverageMatrix,
      completenessAuditPassed,
      visualLimitationsNoted,
    };

    manifest.indexingStatus = 'succeeded';
    if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

    return { processed: finalResult, manifest, chunks: chunkIntelligences };
  }
}

export function createMaterialProcessor(): MaterialProcessor {
  return new MaterialProcessor();
}
