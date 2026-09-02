import type { AIProvider } from './types';
import type { SessionAnalysis, AdaptiveQuestion, RepairContent, LearningSession } from '../types';

// This provider calls a thin server proxy at /api/ai to protect API keys.
// The proxy lives in server/ and is only used in production or development with a key.
export class LiveAIProvider implements AIProvider {
  async analyzeExplanation(session: LearningSession, explanation: string): Promise<SessionAnalysis> {
    return this.call('analyzeExplanation', { session, explanation });
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
