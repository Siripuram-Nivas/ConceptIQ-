import type { ProcessedMaterial, ExtractedConcept, KeyTerm, MaterialSection, SourceReference, ProcessingManifest, ChunkIntelligence } from '../types';

// ── Document Sectioning ────────────────────────────────────────────────────────

function extractSectionsOffline(content: string): MaterialSection[] {
  const sections: MaterialSection[] = [];
  
  // Try parsing by canonical PAGE or SLIDE markers emitted by our parsers
  const pageRegex = /--- (PAGE|SLIDE) (\d+) ---/gi;
  let match;
  
  // Reset regex state
  pageRegex.lastIndex = 0;
  
  match = pageRegex.exec(content);
  
  if (!match) {
    // Fallback: If no markers, split by bold markdown headers or just return one big section
    const lines = content.split('\n');
    let currentSection: MaterialSection | null = null;
    let fallbackSections: MaterialSection[] = [];

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
        // Start a default section
        currentSection = {
          id: `sec-0`,
          title: 'Content',
          content: line + '\n',
          pageNumber: 1,
        };
      }
    });

    if (currentSection) fallbackSections.push(currentSection);
    
    // If still empty or just one giant chunk, at least we preserve the full content, not truncated!
    if (fallbackSections.length === 0) {
      return [{ id: 'sec-0', title: 'Content', content: content, pageNumber: 1 }];
    }
    return fallbackSections;
  }

  // We found markers, parse by page/slide
  let currentMarker: RegExpExecArray | null = match;
  while (currentMarker !== null) {
    const type = currentMarker[1].toUpperCase(); // PAGE or SLIDE
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
    location: sec.pageNumber ? (sec.title.includes('Slide') ? `Slide ${sec.pageNumber}` : `Page ${sec.pageNumber}`) : `Section: ${sec.title}`,
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
  const words = content.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
  return words.join(' ');
}

// ── Chunking & Concurrency ─────────────────────────────────────────────────────

const MAX_CHUNK_CHARS = 30_000;

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

// ── Live AI path ───────────────────────────────────────────────────────────────

function computeHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// ── Live AI path ───────────────────────────────────────────────────────────────

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      
      const status = err.status || 500;
      // Retry on 502 (API down during startup/crash), 503/504 (Provider down) or fetch network errors
      const shouldRetry = status === 502 || status === 503 || status === 504 || err.message?.includes('fetch failed');
      
      if (!shouldRetry) throw err;
      
      attempt++;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1))); // 1s, 2s, 4s
    }
  }
  throw new Error('Unreachable');
}

async function callExtractChunkIntelligence(materialText: string, materialTitle: string) {
  return callWithRetry(async () => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'extractChunkIntelligence',
        payload: { materialText, materialTitle },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw { status: response.status, message: `AI chunk extraction failed (${response.status}): ${errData?.error?.message || errData?.error || 'Unknown'}` };
    }

    return response.json();
  });
}

async function callAggregateMaterial(materialTitle: string, chunks: any[]) {
  return callWithRetry(async () => {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'aggregateMaterial',
        payload: { materialTitle, chunks },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw { status: response.status, message: `AI aggregation failed (${response.status}): ${errData?.error?.message || errData?.error || 'Unknown'}` };
    }

    return response.json();
  });
}

// ── MaterialProcessor ─────────────────────────────────────────────────────────

export interface ProcessorOptions {
  materialId: string;
  onProgress?: (manifest: ProcessingManifest, newChunks: ChunkIntelligence[]) => void;
  existingManifest?: ProcessingManifest;
  isDemo?: boolean;
}

export class MaterialProcessor {
  async processText(
    content: string, 
    originalFileName?: string,
    options?: ProcessorOptions
  ): Promise<{ processed: ProcessedMaterial; manifest: ProcessingManifest; chunks: ChunkIntelligence[] }> {
    const title = extractTitle(content, originalFileName);
    const sourceFingerprint = computeHash(content);
    
    // Extract FULL sections
    const sections = extractSectionsOffline(content);
    const sourceReferences = createSourceReferencesOffline(sections);

    const isDemo = options?.isDemo ?? false;

    if (isDemo) {
      // Demo mode fallback...
      await new Promise(r => setTimeout(r, 800));
      const summary = generateSummaryOffline(content);
      const concepts = this.extractConceptsDemo(content);
      const keyTerms = this.extractKeyTermsDemo(content);
      const suggestedLearningPath = concepts.slice(0, 5).map(c => c.name);
      
      const manifest: ProcessingManifest = {
        processingRunId: 'demo-run', sourceFingerprint, materialVersion: 1, promptVersion: '1', modelVersion: '1', schemaVersion: '1', processorVersion: '1',
        sourceExtractionStatus: 'succeeded', chunkProcessingStatus: 'succeeded', aggregationStatus: 'succeeded', indexingStatus: 'pending', knowledgeMapStatus: 'pending',
        totalPages: 1, totalChunks: 1, completedChunks: 1, failedChunks: 0
      };
      
      const processed = { 
        title, summary, explanation: 'Demo explanation', sections, concepts, keyTerms, keyIdeas: [], importantResults: [], groundedClaims: [], sourceAwareInsights: [], sourceReferences, suggestedLearningPath
      };
      return { processed, manifest, chunks: [] };
    }

    // LIVE MODE: 10X Architecture
    const chunks = chunkSections(sections);
    
    // Initialize or resume manifest
    const manifest: ProcessingManifest = options?.existingManifest ?? {
      processingRunId: crypto.randomUUID(),
      sourceFingerprint,
      materialVersion: 1,
      promptVersion: '1.0',
      modelVersion: 'gemini-2.5-flash',
      schemaVersion: '1.0',
      processorVersion: '2.0',
      sourceExtractionStatus: 'succeeded',
      chunkProcessingStatus: 'pending',
      aggregationStatus: 'pending',
      indexingStatus: 'pending',
      knowledgeMapStatus: 'pending',
      totalPages: sections.length,
      totalChunks: chunks.length,
      completedChunks: 0,
      failedChunks: 0
    };

    const chunkIntelligences: ChunkIntelligence[] = [];
    manifest.chunkProcessingStatus = 'processing';
    if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

    const concurrency = 3;
    let i = 0;
    
    while (i < chunks.length) {
      const batch = chunks.slice(i, i + concurrency);
      
      const promises = batch.map(async (chunk, batchIdx) => {
        const chunkIndex = i + batchIdx;
        const pageStart = Math.min(...chunk.pages, 1);
        const pageEnd = Math.max(...chunk.pages, 1);
        const chunkHash = computeHash(chunk.text);
        
        const pageRange = chunk.pages.length > 0 ? ` (Pages ${pageStart}-${pageEnd})` : '';
        const chunkTitle = `${title}${pageRange}`;
        
        try {
          const aiResult = await callExtractChunkIntelligence(chunk.text, chunkTitle);
          
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
            sourceReferences: [], // from aiResult eventually
          };
          
          return { success: true, chunkIntel };
        } catch (error) {
          console.error(`Chunk ${chunkIndex} processing failed:`, error);
          return { success: false, error };
        }
      });

      const results = await Promise.all(promises);
      
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        manifest.failedChunks += failed.length;
        manifest.chunkProcessingStatus = 'failed';
        if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
        throw new Error(`Failed to process document chunk(s). Aborting to prevent data corruption. Error: ${failed[0].error}`);
      }

      for (const result of results) {
        if (result.success && result.chunkIntel) {
          chunkIntelligences.push(result.chunkIntel);
          manifest.completedChunks++;
        }
      }
      
      if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
      i += concurrency;
    }

    manifest.chunkProcessingStatus = 'succeeded';
    manifest.aggregationStatus = 'processing';
    if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

    // Aggregation Phase
    const aggregatedConcepts: Map<string, ExtractedConcept> = new Map();
    const aggregatedRelationships: any[] = [];
    const aggregatedKeyTerms: Map<string, KeyTerm> = new Map();
    const aggregatedKeyIdeas: any[] = [];
    const aggregatedImportantResults: any[] = [];
    const aggregatedGroundedClaims: any[] = [];

    // Combine local items
    for (const intel of chunkIntelligences) {
      intel.concepts.forEach(c => {
        const canonicalId = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (!aggregatedConcepts.has(canonicalId)) {
          aggregatedConcepts.set(canonicalId, {
            id: canonicalId, name: c.name, canonicalName: c.name, aliases: [],
            definition: c.definition, keyPoints: c.keyPoints || [], relatedConcepts: c.relatedConcepts || [],
            sourceReference: (c as any).sourceReferences?.join('; ') || 'Unknown',
            masteryStatus: 'not_started', evidence: [], missingEvidence: []
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
    }

    // Server-side Aggregation
    // Send minimal chunk representation to save bytes
    const aggregationPayload = chunkIntelligences.map(ci => ({
      chunkIndex: ci.chunkIndex,
      concepts: ci.concepts.map(c => c.name),
      keyIdeas: ci.keyIdeas,
      importantResults: ci.importantResults
    }));

    let globalIntelligence;
    try {
      globalIntelligence = await callAggregateMaterial(title, aggregationPayload);
      manifest.aggregationStatus = 'succeeded';
    } catch (e) {
      manifest.aggregationStatus = 'failed';
      if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);
      throw e;
    }

    const finalResult: ProcessedMaterial & { relationships?: any[] } = {
      title,
      summary: globalIntelligence.summary || 'Summary unavailable.',
      explanation: globalIntelligence.explanation || 'Explanation unavailable.',
      sourceAwareInsights: globalIntelligence.sourceAwareInsights || [],
      sections, 
      concepts: Array.from(aggregatedConcepts.values()),
      keyTerms: Array.from(aggregatedKeyTerms.values()),
      keyIdeas: aggregatedKeyIdeas,
      importantResults: aggregatedImportantResults,
      groundedClaims: aggregatedGroundedClaims,
      sourceReferences,
      suggestedLearningPath: globalIntelligence.suggestedLearningPath || [],
      relationships: aggregatedRelationships,
    };

    if (options?.onProgress) options.onProgress(manifest, chunkIntelligences);

    return { processed: finalResult, manifest, chunks: chunkIntelligences };
  }

  // ── Demo-only concept extraction (offline heuristic) ──────────────────────

  private extractConceptsDemo(content: string): ExtractedConcept[] {
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
          sourceReference: `Source reference unavailable`,
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

  private extractKeyTermsDemo(content: string): KeyTerm[] {
    const words = content.split(/\s+/).filter(w => w.length > 6 && w.length < 20).slice(0, 10);
    return words.slice(0, 4).map(term => ({
      term: term.replace(/[^a-z0-9]/gi, ''),
      definition: `${term} is a term used in this material.`,
    }));
  }
}

export function createMaterialProcessor(): MaterialProcessor {
  return new MaterialProcessor();
}
