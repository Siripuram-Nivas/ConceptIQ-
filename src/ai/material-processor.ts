import type { ProcessedMaterial, ExtractedConcept, KeyTerm, MaterialSection, SourceReference } from '../types';
import { isDemoMode } from './index';

// ── Demo-only helpers (for DemoProvider / offline mode) ───────────────────────

function extractSectionsOffline(content: string): MaterialSection[] {
  const sections: MaterialSection[] = [];
  const lines = content.split('\n');
  let currentSection: MaterialSection | null = null;

  lines.forEach((line, idx) => {
    const isBold = line.includes('**') || line.match(/^#+/);
    if (isBold && line.length < 100) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        id: `sec-${sections.length}`,
        title: line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim(),
        content: '',
        pageNumber: Math.floor(idx / 50) + 1,
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  });

  if (currentSection) sections.push(currentSection);

  return sections.length > 0
    ? sections
    : [{ id: 'sec-0', title: 'Content', content: content.slice(0, 500), pageNumber: 1 }];
}

function createSourceReferencesOffline(sections: MaterialSection[]): SourceReference[] {
  return sections.slice(0, 3).map((sec, idx) => ({
    id: `ref-${idx}`,
    location: sec.pageNumber ? `Page ${sec.pageNumber}` : `Section: ${sec.title}`,
    content: sec.content.slice(0, 150) + '...',
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
  if (firstLine.length < 100) return firstLine.replace(/^#+\s*/, '').trim();
  const words = content.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
  return words.join(' ');
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

    // Always extract sections from the raw text — this is cheap and useful
    const sections = extractSectionsOffline(content);
    const sourceReferences = createSourceReferencesOffline(sections);

    if (isDemoMode()) {
      // Demo mode: use the offline heuristics (no AI call)
      await new Promise(r => setTimeout(r, 800)); // Simulate processing

      const summary = generateSummaryOffline(content);
      const concepts = this.extractConceptsDemo(content);
      const keyTerms = this.extractKeyTermsDemo(content);
      const suggestedLearningPath = concepts.slice(0, 5).map(c => c.name);

      return { title, summary, sections, concepts, keyTerms, sourceReferences, suggestedLearningPath };
    }

    // Live mode: call the real AI
    const aiResult = await callExtractConcepts(content, title);

    // Map AI response to our existing types
    const concepts: ExtractedConcept[] = (aiResult.concepts ?? []).map((c: any) => ({
      id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: c.name,
      canonicalName: c.name,
      aliases: [],
      definition: c.definition ?? '',
      keyPoints: c.keyPoints ?? [],
      relatedConcepts: c.relatedConcepts ?? [],
      sourceReference: `Source reference unavailable`,
      masteryStatus: 'not_started' as const,
      evidence: [],
      missingEvidence: [],
    }));

    const keyTerms: KeyTerm[] = (aiResult.keyTerms ?? []).map((t: any) => ({
      term: t.term,
      definition: t.definition,
    }));

    // Map relationships to edges — these are stored on the knowledge map not directly on ProcessedMaterial
    // We store them on the returned object using a non-breaking extension
    const result: ProcessedMaterial & { relationships?: any[] } = {
      title,
      summary: aiResult.summary ?? generateSummaryOffline(content),
      sections,
      concepts,
      keyTerms,
      sourceReferences,
      suggestedLearningPath: aiResult.suggestedLearningPath ?? concepts.slice(0, 5).map(c => c.name),
      relationships: aiResult.relationships ?? [],
    };

    return result;
  }

  // ── Demo-only concept extraction (offline heuristic) ──────────────────────

  private extractConceptsDemo(content: string): ExtractedConcept[] {
    // Only used in demo mode — not the primary live extraction path
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
          keyPoints: [`${term} is mentioned in the material`, `Understanding ${term} is essential for mastery`],
          relatedConcepts: [],
          sourceReference: `Source reference unavailable`,
          masteryStatus: 'not_started',
          evidence: [],
          missingEvidence: [],
        });
      }
    }

    // Fallback: produce a reasonable concept from the title
    if (concepts.length === 0) {
      const title = extractTitle(content, undefined);
      const fallback: ExtractedConcept = {
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
      };
      concepts.push(fallback);
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
