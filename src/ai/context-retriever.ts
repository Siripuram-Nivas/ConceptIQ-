import type { ProcessedMaterial, ExtractedConcept } from '../types';

export function retrieveRelevantContext(concept: ExtractedConcept, material: ProcessedMaterial): string {
  if (!material || !material.sections) return '';

  const conceptName = concept.name.toLowerCase();
  
  // 1. Try to find the exact source references from the concept
  const sourceRefs = concept.sourceReference?.toLowerCase() || '';
  
  // We'll collect the top relevant sections (up to 3)
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
    
    // Check for exact concept name match in title
    if (titleLower.includes(conceptName)) score += 50;
    
    // Check for exact concept name match in content
    const matchCount = (contentLower.match(new RegExp(conceptName, 'g')) || []).length;
    score += matchCount * 5;
    
    // Check for related concepts and key terms
    concept.relatedConcepts?.forEach(rc => {
      if (contentLower.includes(rc.toLowerCase())) score += 2;
    });
    
    return { section, score };
  });

  // Sort by score descending and take top 3 that have a score > 0
  const topSections = scoredSections
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.section);

  // If we couldn't find any direct matches, fallback to the first section
  if (topSections.length === 0 && material.sections.length > 0) {
    topSections.push(material.sections[0]);
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

  // The context string should be bounded reasonably so we don't send 10 pages when we only need 3
  // But we want ALL relevant text. We use 40000 chars which is easily safe.
  return context.substring(0, 40_000); 
}
