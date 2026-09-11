import type { AIProvider } from './types';
import type { SessionAnalysis, AdaptiveQuestion, RepairContent, LearningSession } from '../types';

export class LiveAIProvider implements AIProvider {
  async analyzeExplanation(session: LearningSession, explanation: string, materialContext: string): Promise<SessionAnalysis> {
    const topicName = session.topicId; // fallback
    return this.call('analyzeExplanation', {
      session,
      explanation,
      topicName,
      materialContext,
      materialId: session.materialId || session.topicId,
      materialVersion: session.materialVersion || 1,
    });
  }

  async generateFollowUpQuestion(analysis: SessionAnalysis): Promise<AdaptiveQuestion> {
    return this.call('generateFollowUpQuestion', { 
      analysis,
      materialId: analysis.topic, // Note: The caller should ideally pass actual materialId here too.
      materialVersion: 1
    });
  }

  async detectMisconception(analysis: SessionAnalysis): Promise<SessionAnalysis> {
    return this.call('detectMisconception', { 
      analysis,
      materialId: analysis.topic,
      materialVersion: 1
    });
  }

  async generateRepair(analysis: SessionAnalysis): Promise<RepairContent> {
    return this.call('generateRepair', { 
      analysis,
      materialId: analysis.topic,
      materialVersion: 1
    });
  }

  async evaluateReExplanation(session: LearningSession, reExplanation: string, materialContext: string): Promise<SessionAnalysis> {
    return this.call('evaluateReExplanation', { 
      session, 
      reExplanation,
      materialContext,
      materialId: session.materialId || session.topicId,
      materialVersion: session.materialVersion || 1,
    });
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
