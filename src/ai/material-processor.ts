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
import { ClientRequestScheduler } from './scheduler.ts';
import type { PersistedJobState, OperationPhase } from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CHUNK_CHARS = 30_000;
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

/**
 * Network-only retry for transient infrastructure failures (502/503/504/fetch failed).
 * Explicitly does NOT retry 429 — that is the scheduler's responsibility.
 * Only used for aggregation/audit/recovery (post-chunk phases).
 */
async function callWithNetworkRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      const status = err.status || 500;
      // 429 must NOT be retried here — let it propagate to the caller
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







/**
 * Single authenticated fetch to /api/ai. Throws a normalized error on non-2xx.
 * 429 errors are NOT retried here — callers must handle them at the scheduler level.
 */
async function callApiMethod(method: string, payload: object): Promise<any> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, payload }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: { message: 'Unknown error', code: 'INTERNAL_API_ERROR' } }));
    // Propagate normalized error fields so the scheduler retry path can inspect them
    const normalized = errData?.error || {};
    throw {
      status: response.status,
      code: normalized.code || 'INTERNAL_API_ERROR',
      message: normalized.message || `${method} failed (${response.status})`,
      retryAfterMs: normalized.retryAfterMs ?? null,
      isRetryable: normalized.isRetryable ?? normalized.retryable ?? (response.status === 429 || response.status >= 500),
      requestId: normalized.requestId,
    };
  }
  return response.json();
}

async function callAggregateMaterial(
  materialTitle: string,
  chunks: any[],
  materialId: string,
  materialVersion: number,
  isPartial = false
) {
  return callWithNetworkRetry(() =>
    callApiMethod('aggregateMaterial', { materialTitle, chunks, isPartial, materialId, materialVersion })
  );
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
  return callWithNetworkRetry(() =>
    callApiMethod('auditCompleteness', { materialTitle, documentOutline, topicExplanations, formulas, importantResults, materialId, materialVersion })
  );
}

async function callRecoverMissingTopics(
  materialTitle: string,
  missingTopics: string[],
  relevantChunks: any[],
  materialId: string,
  materialVersion: number
) {
  return callWithNetworkRetry(() =>
    callApiMethod('recoverMissingTopics', { materialTitle, missingTopics, relevantChunks, materialId, materialVersion })
  );
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
    // SCHEDULER INITIALIZATION
    // ════════════════════════════════════════════════════════════════════
    
    const scheduler = await ClientRequestScheduler.getInstance(manifest.processingRunId, 'conservative');
    // ── Declare all mutable state BEFORE setCallbacks (avoid TDZ) ────────────
    const chunkIntelligences: ChunkIntelligence[] = [];
    const failedChunkIndices: number[] = [];
    const pausedChunkIndices: number[] = [];
    let visualLimitationsNoted = false;

    scheduler.setCallbacks(
      (job: PersistedJobState, result: any) => {
        if (job.operation === 'chunk') {
          const chunkHash = computeHash(job.payload.materialText);
          const chunkIntel: ChunkIntelligence = {
            processingRunId: manifest.processingRunId,
            materialId: options?.materialId || 'unknown',
            materialVersion: manifest.materialVersion,
            chunkId: crypto.randomUUID(),
            chunkHash,
            chunkIndex: job.payload.chunkIndex,
            pageStart: job.payload.pageStart,
            pageEnd: job.payload.pageEnd,
            concepts: result.concepts || [],
            keyTerms: result.keyTerms || [],
            keyIdeas: result.keyIdeas || [],
            importantResults: result.importantResults || [],
            relationships: result.relationships || [],
            groundedClaims: result.groundedClaims || [],
            sourceReferences: [],
          };
          (chunkIntel as any).formulas = result.formulas || [];
          (chunkIntel as any).visualLimitations = result.visualLimitations || [];
          (chunkIntel as any).tableNotes = result.tableNotes || [];
          
          if (result.visualLimitations?.length > 0) visualLimitationsNoted = true;

          chunkIntelligences.push(chunkIntel);
          manifest.completedChunks++;
          if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
        }
      },
      (job: PersistedJobState, isTerminal: boolean) => {
        if (job.operation === 'chunk' && isTerminal) {
          if (job.status === 'PROCESSING_PAUSED') {
            pausedChunkIndices.push(job.payload.chunkIndex);
          } else {
            failedChunkIndices.push(job.payload.chunkIndex);
            manifest.failedChunks++;
          }
          if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
        }
      },
      (msg: string) => {
        console.log(`[Scheduler] ${msg}`);
      }
    );

    // ════════════════════════════════════════════════════════════════════
    // PHASE 0: TOPIC DISCOVERY (Optional / Bypassed for now)
    // ════════════════════════════════════════════════════════════════════
    let globalDocumentOutline: DocumentOutlineItem[] = [];

    // ════════════════════════════════════════════════════════════════════
    // PHASE 1: CHUNK INTELLIGENCE (Durable Scheduler)
    // ════════════════════════════════════════════════════════════════════
    manifest.chunkProcessingStatus = 'processing';
    if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

    const chunkJobs = chunks.map((chunk, idx) => {
      const pageStart = chunk.pages.length > 0 ? Math.min(...chunk.pages) : 1;
      const pageEnd = chunk.pages.length > 0 ? Math.max(...chunk.pages) : 1;
      const chunkTitle = `${title} (Pages ${pageStart}–${pageEnd})`;
      
      return {
        jobId: `chunk-${manifest.processingRunId}-${idx}`,
        processingRunId: manifest.processingRunId,
        materialVersion: manifest.materialVersion,
        sourceFingerprint,
        operation: 'chunk' as OperationPhase,
        priority: 10,
        payload: {
          materialText: chunk.text,
          materialTitle: chunkTitle,
          materialId: options?.materialId || 'unknown',
          materialVersion: manifest.materialVersion,
          chunkIndex: idx,
          pageStart,
          pageEnd
        }
      };
    });

    // pausedChunkIndices declared above before setCallbacks (TDZ-safe)

    await scheduler.enqueueJobs(chunkJobs);
    await scheduler.start();

    // Block until chunks are finished
    await scheduler.waitForPhase('chunk');

    manifest.failedChunkIndices = failedChunkIndices;
    manifest.isPartial = failedChunkIndices.length > 0 || pausedChunkIndices.length > 0;

    if (chunkIntelligences.length === 0 && chunks.length > 0) {
      manifest.chunkProcessingStatus = pausedChunkIndices.length > 0 ? 'paused' as any : 'failed';
      manifest.aggregationStatus = 'failed';
      if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
      if (pausedChunkIndices.length > 0) {
        throw new Error(`RATE_LIMIT_RETRY_EXHAUSTED: AI SERVICE RATE LIMITED. ConceptIQ has preserved your document. Processed: 0 / ${chunks.length}. Waiting to retry: ${pausedChunkIndices.length}`);
      } else {
        throw new Error(`All chunks failed to process. Check API availability and retry.`);
      }
    }

    if (pausedChunkIndices.length > 0) {
      manifest.chunkProcessingStatus = 'paused' as any;
    } else if (failedChunkIndices.length > 0) {
      manifest.chunkProcessingStatus = 'partial';
    } else {
      manifest.chunkProcessingStatus = 'succeeded';
    }
    
    // Aggregation cannot proceed if chunks are incomplete or paused
    if (manifest.isPartial) {
      manifest.aggregationStatus = 'paused' as any;
      if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
      return { processed: null as any, manifest, chunks: chunkIntelligences }; // Return early
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
