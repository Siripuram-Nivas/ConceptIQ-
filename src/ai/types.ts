import type { SessionAnalysis, AdaptiveQuestion, RepairContent, LearningSession } from '../types';

export interface AIProvider {
  analyzeExplanation(session: LearningSession, explanation: string, materialContext: string): Promise<SessionAnalysis>;
  generateFollowUpQuestion(analysis: SessionAnalysis): Promise<AdaptiveQuestion>;
  detectMisconception(analysis: SessionAnalysis): Promise<SessionAnalysis>;
  generateRepair(analysis: SessionAnalysis): Promise<RepairContent>;
  evaluateReExplanation(session: LearningSession, reExplanation: string, materialContext: string): Promise<SessionAnalysis>;
}
