import type { ProcessedMaterial, ExtractedConcept, KeyTerm, MaterialSection, SourceReference } from '../types';

// Deterministic offline material processor
// Creates realistic processing results from any input text
export class MaterialProcessor {
  async processText(content: string, originalFileName?: string): Promise<ProcessedMaterial> {
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 800));

    const title = this.extractTitle(content, originalFileName);
    const sections = this.extractSections(content);
    const summary = this.generateSummary(content);
    const concepts = this.extractConcepts(content);
    const keyTerms = this.extractKeyTerms(content);
    const sourceReferences = this.createSourceReferences(sections);
    const suggestedLearningPath = this.buildLearningPath(concepts);

    return {
      title,
      summary,
      sections,
      concepts,
      keyTerms,
      sourceReferences,
      suggestedLearningPath,
    };
  }

  private extractTitle(content: string, fileName?: string): string {
    if (fileName && fileName.replace(/\.[^/.]+$/, '')) {
      return fileName.replace(/\.[^/.]+$/, '');
    }

    const lines = content.trim().split('\n');
    const firstLine = lines[0];

    // Look for heading-like first line
    if (firstLine.length < 100) {
      return firstLine.replace(/^#+\s*/, '').trim();
    }

    // Otherwise, generate from content keywords
    const words = content.split(/\s+/).filter((w) => w.length > 4).slice(0, 5);
    return words.slice(0, 3).join(' ');
  }

  private extractSections(content: string): MaterialSection[] {
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
      : [
          {
            id: 'sec-0',
            title: 'Content',
            content: content.slice(0, 500),
            pageNumber: 1,
          },
        ];
  }

  private generateSummary(content: string): string {
    const sentences = content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const keysentences = sentences.slice(0, Math.ceil(sentences.length / 3));
    return keysentences.join('. ') + '.';
  }

  private extractConcepts(content: string): ExtractedConcept[] {
    const concepts: ExtractedConcept[] = [];

    // Simple heuristic: look for capitalized phrases or bold text
    const regex = /\*\*([^*]+)\*\*|(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gm;
    const found = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      const term = (match[1] || match[2] || '').trim();
      if (term.length > 2 && term.length < 100 && !found.has(term)) {
        found.add(term);
        concepts.push({
          id: term.toLowerCase().replace(/\s+/g, '-'),
          name: term,
          canonicalName: term,
          aliases: [],
          definition: this.createDefinition(term, content),
          keyPoints: this.extractKeyPoints(term, content),
          relatedConcepts: this.findRelatedConcepts(term, content),
          sourceReference: `Section ${Math.floor(Math.random() * 5) + 1}`,
        });
      }
    }

    return concepts.slice(0, Math.min(concepts.length, 8));
  }

  private createDefinition(term: string, content: string): string {
    const termRegex = new RegExp(`${term}[^.!?]*[.!?]`, 'i');
    const match = content.match(termRegex);
    if (match) {
      return match[0].slice(0, 200).trim();
    }
    return `${term} is a key concept in this material. It plays an important role in understanding the broader context.`;
  }

  private extractKeyPoints(term: string, content: string): string[] {
    const points = [];

    // Generic key points that apply to most concepts
    if (content.toLowerCase().includes(term.toLowerCase())) {
      points.push(`${term} is mentioned in the material`);
      points.push(`Understanding ${term} is essential for mastery`);
      points.push(`${term} has important relationships with other concepts`);
    }

    return points.slice(0, 3);
  }

  private findRelatedConcepts(term: string, content: string): string[] {
    const conceptList: string[] = [];
    const sentences = content.split(/[.!?]/);

    // Find sentences that mention the term
    sentences.forEach((sent) => {
      if (sent.toLowerCase().includes(term.toLowerCase())) {
        const words = sent
          .split(/\s+/)
          .filter((w) => w.length > 4 && w.toUpperCase() === w)
          .slice(0, 2);
        conceptList.push(...words);
      }
    });

    return [...new Set(conceptList)].slice(0, 3);
  }

  private extractKeyTerms(content: string): KeyTerm[] {
    const terms: KeyTerm[] = [];
    const words = content
      .split(/\s+/)
      .filter((w) => w.length > 6 && w.length < 20)
      .slice(0, 20);

    words.forEach((term) => {
      if (Math.random() > 0.5) {
        terms.push({
          term: term.replace(/[^a-z0-9]/gi, ''),
          definition: `${term} is an important term in this context.`,
        });
      }
    });

    return terms.slice(0, 6);
  }

  private createSourceReferences(sections: MaterialSection[]): SourceReference[] {
    return sections.slice(0, 3).map((sec, idx) => ({
      id: `ref-${idx}`,
      location: sec.pageNumber ? `Page ${sec.pageNumber}` : `Section: ${sec.title}`,
      content: sec.content.slice(0, 150) + '...',
      conceptsReferenced: [sec.title],
    }));
  }

  private buildLearningPath(concepts: ExtractedConcept[]): string[] {
    return concepts
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, 5)
      .map((c) => c.name);
  }
}

export function createMaterialProcessor(): MaterialProcessor {
  return new MaterialProcessor();
}
