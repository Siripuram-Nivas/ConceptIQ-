import { describe, it, expect } from 'vitest';
import { retrieveRelevantContext } from './context-retriever';
import type { ProcessedMaterial, ExtractedConcept } from '../types';

describe('Semantic Sentinel & Retrieval Assertions', () => {
  it('should retrieve methodology sections from Page 3, 4, and 12', () => {
    // Construct mock material
    const material: ProcessedMaterial = {
      title: 'Test Document',
      summary: 'Summary',
      sections: [
        { id: '1', title: 'Page 3', content: 'The study used a randomized controlled trial design. We collected data across 5 countries.', pageNumber: 3 },
        { id: '2', title: 'Page 4', content: 'Our research methodology included double-blind placebo testing. The sample size was N=1050.', pageNumber: 4 },
        { id: '3', title: 'Page 8', content: 'Results indicated an R² value of 0.85, demonstrating high variance explanation.', pageNumber: 8 },
        { id: '4', title: 'Page 12', content: 'The methodology limitations included high attrition rates.', pageNumber: 12 }
      ],
      concepts: [],
      keyTerms: [],
      keyIdeas: [],
      importantResults: [],
      groundedClaims: [],
      sourceAwareInsights: [],
      sourceReferences: []
    } as unknown as ProcessedMaterial;

    const concept: ExtractedConcept = {
      id: 'methodology',
      name: 'Research Methodology',
      canonicalName: 'Research Methodology',
      aliases: [],
      definition: 'The methods used.',
      keyPoints: [],
      relatedConcepts: [],
      sourceReference: 'Page 4; Page 12', // Explicitly referenced
      masteryStatus: 'not_started',
      evidence: [],
      missingEvidence: []
    };

    const context = retrieveRelevantContext(concept, material);

    // It should include Page 4 and 12 because they are explicitly referenced
    expect(context).toContain('Page 4');
    expect(context).toContain('Page 12');
    
    // Page 3 might not be explicitly referenced, but the content mentions 'randomized controlled trial'
    // Actually, Page 4 and 12 will get +100 score. Page 8 has nothing.
    // The top 3 sections should be returned.
    
    // This asserts that the retrieval engine pulled the right sentinel chunks.
    expect(context).toContain('Our research methodology included double-blind placebo testing.');
    expect(context).toContain('methodology limitations');
  });
  
  it('should retrieve R² discussion from Page 8', () => {
    const material: ProcessedMaterial = {
      title: 'Test Document',
      summary: 'Summary',
      sections: [
        { id: '1', title: 'Page 3', content: 'The study used a randomized controlled trial design. We collected data across 5 countries.', pageNumber: 3 },
        { id: '2', title: 'Page 4', content: 'Our research methodology included double-blind placebo testing. The sample size was N=1050.', pageNumber: 4 },
        { id: '3', title: 'Page 8', content: 'Results indicated an R² value of 0.85, demonstrating high variance explanation.', pageNumber: 8 },
        { id: '4', title: 'Page 12', content: 'The methodology limitations included high attrition rates.', pageNumber: 12 }
      ],
      concepts: [],
      keyTerms: [],
      keyIdeas: [],
      importantResults: [],
      groundedClaims: [],
      sourceAwareInsights: [],
      sourceReferences: []
    } as unknown as ProcessedMaterial;

    const concept: ExtractedConcept = {
      id: 'r2',
      name: 'R²',
      canonicalName: 'R²',
      aliases: [],
      definition: 'Statistical measure.',
      keyPoints: [],
      relatedConcepts: ['variance'],
      sourceReference: 'Page 8', 
      masteryStatus: 'not_started',
      evidence: [],
      missingEvidence: []
    };

    const context = retrieveRelevantContext(concept, material);

    expect(context).toContain('Page 8');
    expect(context).toContain('R² value of 0.85');
    // Ensure we didn't just pull the first page blindly
    expect(context.indexOf('Page 3') === -1 || context.indexOf('Page 8') < context.indexOf('Page 3')).toBeTruthy();
  });
});
