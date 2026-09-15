import type { ProcessedMaterial, ExtractedConcept } from '../types';

export function retrieveRelevantContext(
  concept: ExtractedConcept | { name: string; sourceReference?: string; relatedConcepts?: string[] },
  material: ProcessedMaterial
): string {
  if (!material) return '';

  const conceptName = concept.name.toLowerCase();
  const sourceRefs = concept.sourceReference?.toLowerCase() || '';

  // ── Score raw sections ───────────────────────────────────────────────────────
  const scoredSections = (material.sections || []).map(section => {
    let score = 0;
    const titleLower = section.title.toLowerCase();
    const contentLower = section.content.toLowerCase();

    // Explicit page/slide reference from concept metadata
    const isExplicitlyReferenced =
      (section.pageNumber && sourceRefs.includes(`page ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`pages ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`slide ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`slides ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`page(s) ${section.pageNumber}`)) ||
      (section.pageNumber && sourceRefs.includes(`slide(s) ${section.pageNumber}`)) ||
      sourceRefs.includes(titleLower);
    if (isExplicitlyReferenced) score += 100;

    // Keyword hits in section content/title
    if (titleLower.includes(conceptName)) score += 50;
    const matchCount = (contentLower.match(new RegExp(conceptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += matchCount * 5;

    // Related concepts
    if (concept.relatedConcepts) {
      concept.relatedConcepts.forEach(rc => {
        if (contentLower.includes(rc.toLowerCase())) score += 2;
      });
    }

    // Bonus if keyIdeas or importantResults reference this section AND mention the concept
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

    return { section, score };
  });

  const topSections = scoredSections
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.section);

  // If no raw section matched, we still check structured intelligence below
  const hasSectionContext = topSections.length > 0;

  // ── Score topicExplanations ──────────────────────────────────────────────────
  const relevantTopics = (material.topicExplanations || []).filter(te => {
    const combined = `${te.topicId} ${te.quickExplanation} ${te.detailedExplanation} ${te.deepDive}`.toLowerCase();
    return combined.includes(conceptName) ||
      (concept.relatedConcepts || []).some(rc => combined.includes(rc.toLowerCase()));
  });

  // ── Score formulas ───────────────────────────────────────────────────────────
  const relevantFormulas = (material.formulas || []).filter(f => {
    const combined = `${f.expression || ''} ${f.significance || ''} ${(f.variables || []).join(' ')}`.toLowerCase();
    return combined.includes(conceptName) ||
      (concept.relatedConcepts || []).some(rc => combined.includes(rc.toLowerCase()));
  });

  // ── Score importantResults ────────────────────────────────────────────────────
  const relevantResults = (material.importantResults || []).filter(res => {
    const combined = `${res.result} ${res.significance || ''}`.toLowerCase();
    return combined.includes(conceptName) ||
      (concept.relatedConcepts || []).some(rc => combined.includes(rc.toLowerCase()));
  });

  // ── Score groundedClaims ─────────────────────────────────────────────────────
  const relevantClaims = (material.groundedClaims || []).filter((claim: any) => {
    const combined = `${claim.claim || ''} ${claim.evidence || ''}`.toLowerCase();
    return combined.includes(conceptName);
  });

  // ── Return empty if no structured context found at all ────────────────────────
  if (!hasSectionContext && relevantTopics.length === 0 && relevantFormulas.length === 0 && relevantResults.length === 0) {
    return '';
  }

  // ── Build context string ─────────────────────────────────────────────────────
  let context = '';

  if (material.summary) {
    context += `MATERIAL SUMMARY:\n${material.summary}\n\n`;
  }

  // Topic explanations (highest fidelity — the AI synthesis of the topic)
  if (relevantTopics.length > 0) {
    context += `TOPIC EXPLANATIONS FOR "${concept.name}":\n`;
    relevantTopics.slice(0, 3).forEach(te => {
      context += `\n--- ${te.topicId} ---\n`;
      if (te.quickExplanation) context += `Quick: ${te.quickExplanation}\n`;
      if (te.detailedExplanation) context += `Detailed: ${te.detailedExplanation}\n`;
      if (te.deepDive) context += `Deep: ${te.deepDive}\n`;
      if ((te as any).sourceUnits?.length > 0) context += `Source: ${(te as any).sourceUnits.join(', ')}\n`;
    });
    context += '\n';
  }

  // Formulas (exact notation preserved)
  if (relevantFormulas.length > 0) {
    context += `RELEVANT FORMULAS:\n`;
    relevantFormulas.slice(0, 5).forEach((f) => {
      context += `- ${f.expression}: ${f.significance}`;
      if (f.variables?.length > 0) {
        context += ` [Variables: ${f.variables.join('; ')}]`;
      }
      if (f.sourceReferences?.length > 0) context += ` (${f.sourceReferences.join(', ')})`;
      context += '\n';
    });
    context += '\n';
  }

  // Important results
  if (relevantResults.length > 0) {
    context += `IMPORTANT RESULTS:\n`;
    relevantResults.slice(0, 5).forEach(res => {
      context += `- ${res.result}`;
      if (res.significance) context += ` — ${res.significance}`;
      if (res.sourceReferences?.length > 0) context += ` (${res.sourceReferences.join(', ')})`;
      context += '\n';
    });
    context += '\n';
  }

  // Raw sections (grounded source text)
  if (topSections.length > 0) {
    context += `RELEVANT SECTIONS FOR "${concept.name}":\n`;
    topSections.forEach(sec => {
      context += `\n--- ${sec.title} ---\n${sec.content}\n`;
    });
  }

  // Grounded claims
  if (relevantClaims.length > 0) {
    context += `\nGROUNDED CLAIMS:\n`;
    relevantClaims.slice(0, 3).forEach((claim: any) => {
      context += `- "${claim.claim}" — Evidence: ${claim.evidence || 'See source'}\n`;
    });
  }

  // Key terms (always helpful as a lexical anchor)
  if (material.keyTerms && material.keyTerms.length > 0) {
    const relevantTerms = material.keyTerms.filter(t =>
      t.term.toLowerCase().includes(conceptName) || conceptName.includes(t.term.toLowerCase())
    );
    if (relevantTerms.length > 0) {
      context += `\nKEY TERMS:\n`;
      relevantTerms.forEach(t => {
        context += `- ${t.term}: ${t.definition}\n`;
      });
    }
  }

  // Hard cap at 40k chars to avoid exceeding API context limits
  return context.substring(0, 40_000);
}

