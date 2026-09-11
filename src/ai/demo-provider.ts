import type { AIProvider } from './types';
import type { SessionAnalysis, AdaptiveQuestion, RepairContent, LearningSession } from '../types';
import {
  DEMO_INITIAL_ANALYSIS,
  DEMO_FINAL_ANALYSIS,
  DEMO_CHALLENGE,
  TCP_REPAIR_CONTENT,
} from '../data/demo/tcp-scenario';
import {
  DNA_MISCONCEPTION_SCENARIO,
  DNA_CHALLENGE,
  DNA_REPAIR,
} from '../data/demo/dna-scenario';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class DemoProvider implements AIProvider {
  private isDemo = true;

  async analyzeExplanation(session: LearningSession, _explanation: string, _materialContext: string): Promise<SessionAnalysis> {
    await delay(1800); // Simulate processing
    if (session.topicId === 'tcp-three-way-handshake') {
      return { ...DEMO_INITIAL_ANALYSIS };
    }
    if (session.topicId === 'dna-replication') {
      return { ...DNA_MISCONCEPTION_SCENARIO };
    }
    return { ...DEMO_INITIAL_ANALYSIS };
  }

  async generateFollowUpQuestion(analysis: SessionAnalysis): Promise<AdaptiveQuestion> {
    await delay(800);
    if (analysis.topic === 'TCP Three-Way Handshake') {
      return { ...DEMO_CHALLENGE };
    }
    return { ...DNA_CHALLENGE };
  }

  async detectMisconception(analysis: SessionAnalysis): Promise<SessionAnalysis> {
    await delay(600);
    return analysis;
  }

  async generateRepair(analysis: SessionAnalysis): Promise<RepairContent> {
    await delay(600);
    if (analysis.topic === 'TCP Three-Way Handshake') {
      return { ...TCP_REPAIR_CONTENT };
    }
    return { ...DNA_REPAIR };
  }

  async evaluateReExplanation(session: LearningSession, _reExplanation: string, _materialContext: string): Promise<SessionAnalysis> {
    await delay(2000);
    if (session.topicId === 'tcp-three-way-handshake') {
      return { ...DEMO_FINAL_ANALYSIS };
    }
    return {
      ...DEMO_FINAL_ANALYSIS,
      topic: 'DNA Replication',
      masteryIndex: { conceptCoverage: 31, explanationQuality: 22, followupPerformance: 17, consistency: 15, total: 85 },
    };
  }

  get isDemoMode(): boolean {
    return this.isDemo;
  }
}
