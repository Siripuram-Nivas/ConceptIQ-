import type { AIProvider } from './types';
import type { SessionAnalysis, AdaptiveQuestion, RepairContent, LearningSession } from '../types';

// This provider calls a thin server proxy at /api/ai to protect API keys.
// The proxy lives in server/ and is only used in production or development with a key.
export class LiveAIProvider implements AIProvider {
  async analyzeExplanation(session: LearningSession, explanation: string): Promise<SessionAnalysis> {
    const enrichedPayload = this.enrichPayloadWithMaterialContext(session, explanation);
    return this.call('analyzeExplanation', enrichedPayload);
  }

  private enrichPayloadWithMaterialContext(session: LearningSession, explanation: string) {
    // topicId holds the material ID. We need to attach the actual material context for the backend
    // since the backend is stateless and doesn't have access to IndexedDB.
    let topicName = session.topicId;
    let materialContext = undefined;
    
    // In a browser environment, we can dynamically import the store to get the material
    try {
      // Find the concept name from the URL if we are in TeachBack
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const conceptFromUrl = params.get('concept');
        if (conceptFromUrl) topicName = conceptFromUrl;
      }
      
      // Import store safely
      const { useStudySpaceStore } = require('../store/study-space-store');
      const material = useStudySpaceStore.getState().getMaterialById(session.topicId);
      
      if (material && material.processedContent) {
        const { summary, keyTerms, sections, concepts } = material.processedContent;
        if (!topicName || topicName === session.topicId) {
          topicName = concepts[0]?.name || material.title;
        }
        
        const relevantSection = sections?.find((s: any) =>
          s.title.toLowerCase().includes(topicName.toLowerCase())
        );
        materialContext = relevantSection
          ? `${summary ?? ''}\n\n${relevantSection.title}:\n${relevantSection.content.slice(0, 3000)}`
          : `${summary ?? ''}\n\n${keyTerms?.map((t: any) => `${t.term}: ${t.definition}`).join('\n') ?? ''}`.slice(0, 4000);
      }
    } catch (e) {
      console.warn('Failed to enrich payload with material context', e);
    }

    return { session, explanation, topicName, materialContext };
  }

  async generateFollowUpQuestion(analysis: SessionAnalysis): Promise<AdaptiveQuestion> {
    return this.call('generateFollowUpQuestion', { analysis });
  }

  async detectMisconception(analysis: SessionAnalysis): Promise<SessionAnalysis> {
    return this.call('detectMisconception', { analysis });
  }

  async generateRepair(analysis: SessionAnalysis): Promise<RepairContent> {
    return this.call('generateRepair', { analysis });
  }

  async evaluateReExplanation(session: LearningSession, reExplanation: string): Promise<SessionAnalysis> {
    return this.call('evaluateReExplanation', { session, reExplanation });
  }

  private async call<T>(method: string, payload: unknown): Promise<T> {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, payload }),
    });
    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}
