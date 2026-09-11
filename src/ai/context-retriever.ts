import type { ProcessedMaterial, ExtractedConcept } from '../types';

export function retrieveRelevantContext(concept: ExtractedConcept | { name: string; sourceReference?: string; relatedConcepts?: string[] }, material: ProcessedMaterial): string {
  if (!material || !material.sections || material.sections.length === 0) return '';

  const conceptName = concept.name.toLowerCase();
  
  // 1. Try to find the exact source references from the concept
  const sourceRefs = concept.sourceReference?.toLowerCase() || '';
  
  // We'll collect the top relevant sections (up to 5)
  const scoredSections = material.sections.map(section => {
    let score = 0;
    const titleLower = section.title.toLowerCase();
    const contentLower = section.content.toLowerCase();
    
    // Check if this section's title/page is referenced in the concept's sourceReference
    // e.g. "page 6", "slide 3"
    const isExplicitlyReferenced = 
      (section.pageNumber && sourceRefs.includes(`page ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`pages ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`slide ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`slides ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`page(s) ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`slide(s) ${section.pageNumber}`)) ||
      sourceRefs.includes(titleLower);

    if (isExplicitlyReferenced) score += 100;
    
    // Score from material keyIdeas and importantResults that reference this section and mention the concept
    if (material.keyIdeas) {
      material.keyIdeas.forEach(idea => {
        const ideaLower = (idea.idea + ' ' + (idea.explanation || '')).toLowerCase();
        if (ideaLower.includes(conceptName)) {
          const refs = (idea.sourceReferences || []).join(' ').toLowerCase();
          if (
            (section.pageNumber && refs.includes(`page ${section.pageNumber}`)) ||
            (section.pageNumber && refs.includes(`slide ${section.pageNumber}`)) ||
            refs.includes(titleLower)
          ) {
            score += 30;
          }
        }
      });
    }

    if (material.importantResults) {
      material.importantResults.forEach(res => {
        const resLower = (res.result + ' ' + (res.significance || '')).toLowerCase();
        if (resLower.includes(conceptName)) {
          const refs = (res.sourceReferences || []).join(' ').toLowerCase();
          if (
            (section.pageNumber && refs.includes(`page ${section.pageNumber}`)) ||
            (section.pageNumber && refs.includes(`slide ${section.pageNumber}`)) ||
            refs.includes(titleLower)
          ) {
            score += 30;
          }
        }
      });
    }

    // Check for exact concept name match in title
    if (titleLower.includes(conceptName)) score += 50;
    
    // Check for exact concept name match in content
    const matchCount = (contentLower.match(new RegExp(conceptName, 'g')) || []).length;
    score += matchCount * 5;
    
    // Check for related concepts and key terms
    if (concept.relatedConcepts) {
      concept.relatedConcepts.forEach(rc => {
        if (contentLower.includes(rc.toLowerCase())) score += 2;
      });
    }
    
    return { section, score };
  });

  // Sort by score descending and take top 5 that have a score > 0
  const topSections = scoredSections
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.section);

  // RETURN EMPTY if no relevant sections found (INSUFFICIENT_CONTEXT)
  // Removed silent fallback to sections[0]
  if (topSections.length === 0) {
    return '';
  }

  // Build the context string
  let context = '';
  if (material.summary) {
    context += `MATERIAL SUMMARY:\n${material.summary}\n\n`;
  }
  
  context += `RELEVANT SECTIONS FOR "${concept.name}":\n`;
  topSections.forEach(sec => {
    context += `\n--- ${sec.title} ---\n${sec.content}\n`;
  });

  if (material.keyTerms && material.keyTerms.length > 0) {
    context += `\nKEY TERMS:\n`;
    material.keyTerms.forEach(t => {
      context += `- ${t.term}: ${t.definition}\n`;
    });
  }

  return context.substring(0, 40_000); 
}
