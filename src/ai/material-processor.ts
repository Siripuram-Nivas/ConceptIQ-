import type { ProcessedMaterial, ExtractedConcept, KeyTerm, MaterialSection, SourceReference } from '../types';
import { isDemoMode } from './index';

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

async function callExtractConcepts(materialText: string, materialTitle: string) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'extractConcepts',
      payload: { materialText, materialTitle },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`AI concept extraction failed (${response.status}): ${err.error ?? 'Unknown'}`);
  }

  return response.json();
}

// ── MaterialProcessor ─────────────────────────────────────────────────────────

export class MaterialProcessor {
  async processText(content: string, originalFileName?: string): Promise<ProcessedMaterial> {
    const title = extractTitle(content, originalFileName);

    // Extract FULL sections, no truncation
    const sections = extractSectionsOffline(content);
    const sourceReferences = createSourceReferencesOffline(sections);

    if (isDemoMode()) {
      // Demo mode
      await new Promise(r => setTimeout(r, 800));
      const summary = generateSummaryOffline(content);
      const concepts = this.extractConceptsDemo(content);
      const keyTerms = this.extractKeyTermsDemo(content);
      const suggestedLearningPath = concepts.slice(0, 5).map(c => c.name);
      return { title, summary, sections, concepts, keyTerms, sourceReferences, suggestedLearningPath };
    }

    // LIVE MODE: Chunking to bypass Vercel timeout limits and preserve context limits
    const chunks = chunkSections(sections);
    const aggregatedConcepts: Map<string, ExtractedConcept> = new Map();
    const aggregatedRelationships: any[] = [];
    const aggregatedKeyTerms: Map<string, KeyTerm> = new Map();
    const summaries: string[] = [];

    const concurrency = 3;
    let i = 0;
    
    while (i < chunks.length) {
      const batch = chunks.slice(i, i + concurrency);
      
      const promises = batch.map(async (chunk) => {
        const pageRange = chunk.pages.length > 0 
          ? ` (Pages ${Math.min(...chunk.pages)}-${Math.max(...chunk.pages)})` 
          : '';
        const chunkTitle = `${title}${pageRange}`;
        
        try {
          const aiResult = await callExtractConcepts(chunk.text, chunkTitle);
          return { success: true, aiResult, chunk };
        } catch (error) {
          console.error('Chunk processing failed:', error);
          return { success: false, error };
        }
      });

      const results = await Promise.all(promises);
      
      // Check for failures
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        throw new Error(`Failed to process document chunk(s). Aborting to prevent data corruption. Error: ${failed[0].error}`);
      }

      // Aggregate
      for (const result of results) {
        if (!result.success || !result.aiResult || !result.chunk) continue;
        
        const res = result.aiResult;
        
        if (res.summary) summaries.push(res.summary);
        
        if (res.concepts) {
          res.concepts.forEach((c: any) => {
            const canonicalId = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
            // Build the source reference string from the chunk's pages
            const pagesStr = result.chunk!.pages.length > 0 
              ? (title.includes('.pptx') ? `Slide(s) ${result.chunk!.pages.join(', ')}` : `Page(s) ${result.chunk!.pages.join(', ')}`)
              : 'Unknown location';
            
            if (aggregatedConcepts.has(canonicalId)) {
              // Merge definition/keyPoints if needed, or append source reference
              const existing = aggregatedConcepts.get(canonicalId)!;
              if (!existing.sourceReference?.includes(pagesStr)) {
                existing.sourceReference += `; ${pagesStr}`;
              }
            } else {
              aggregatedConcepts.set(canonicalId, {
                id: canonicalId,
                name: c.name,
                canonicalName: c.name,
                aliases: [],
                definition: c.definition ?? '',
                keyPoints: c.keyPoints ?? [],
                relatedConcepts: c.relatedConcepts ?? [],
                sourceReference: pagesStr,
                masteryStatus: 'not_started' as const,
                evidence: [],
                missingEvidence: [],
              });
            }
          });
        }
        
        if (res.relationships) {
          aggregatedRelationships.push(...res.relationships);
        }
        
        if (res.keyTerms) {
          res.keyTerms.forEach((kt: any) => {
            const canonicalTerm = kt.term.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            if (!aggregatedKeyTerms.has(canonicalTerm)) {
              aggregatedKeyTerms.set(canonicalTerm, { term: kt.term, definition: kt.definition });
            }
          });
        }
      }

      i += concurrency;
    }

    const finalConcepts = Array.from(aggregatedConcepts.values());
    const finalKeyTerms = Array.from(aggregatedKeyTerms.values());
    
    // Simple summary aggregation (join the first sentence of each chunk's summary)
    const finalSummary = summaries.length > 0 
      ? summaries.map(s => s.split(/[.!?]/)[0].trim() + '.').join(' ')
      : generateSummaryOffline(content);

    const finalResult: ProcessedMaterial & { relationships?: any[] } = {
      title,
      summary: finalSummary,
      sections, // Full, non-truncated document!
      concepts: finalConcepts,
      keyTerms: finalKeyTerms,
      sourceReferences,
      suggestedLearningPath: finalConcepts.slice(0, 10).map(c => c.name),
      relationships: aggregatedRelationships,
    };

    return finalResult;
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
