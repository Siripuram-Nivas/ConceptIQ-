import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LearningSession, SessionState } from '../types';
import { getAIProvider, isDemoMode } from '../ai';
import { DemoProvider } from '../ai/demo-provider';
import { idbStorage } from '../lib/idb-storage';
import { useStudySpaceStore } from './study-space-store';

const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  IDLE: ['EXPLAINING'],
  EXPLAINING: ['PROCESSING', 'IDLE'],
  PROCESSING: ['ANALYSIS', 'IDLE'],
  ANALYSIS: ['CHALLENGE', 'MASTERY'],
  CHALLENGE: ['CONFIDENCE'],
  CONFIDENCE: ['DIAGNOSIS'],
  DIAGNOSIS: ['REPAIR', 'MASTERY'],
  REPAIR: ['RE_EXPLAIN'],
  RE_EXPLAIN: ['PROCESSING'],
  MASTERY: ['IDLE'],
};

interface SessionStore {
  session: LearningSession | null;
  isDemo: boolean;
  error: string | null;

  startSession: (topicId: string) => void;
  updateExplanationDraft: (text: string) => void;
  submitExplanation: (text: string) => Promise<void>;
  submitFollowUp: (answer: string, confidence: number) => Promise<void>;
  completeRepair: () => void;
  submitReExplanation: (text: string) => Promise<void>;
  resetSession: () => void;
  clearError: () => void;
  transition: (nextState: SessionState) => boolean;
  resetDemo: () => void;
}

function createNewSession(topicId: string): LearningSession {
  return {
    id: crypto.randomUUID(),
    topicId,
    state: 'IDLE',
    explanation: '',
    startedAt: new Date(),
    isDemoMode: isDemoMode(),
  };
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      session: null,
      isDemo: isDemoMode(),
      error: null,

      transition(nextState) {
        const { session } = get();
        if (!session) return false;
        const allowed = VALID_TRANSITIONS[session.state];
        if (!allowed.includes(nextState)) {
          console.warn(`Invalid transition: ${session.state} → ${nextState}`);
          return false;
        }
        set((s) => ({ session: s.session ? { ...s.session, state: nextState } : null }));
        return true;
      },

      startSession(topicId) {
        set({ session: createNewSession(topicId), error: null });
        get().transition('EXPLAINING');
      },

      updateExplanationDraft(text) {
        set((s) => ({ session: s.session ? { ...s.session, explanation: text } : null }));
      },

      async submitExplanation(text) {
        const { session, transition } = get();
        if (!session) return;
        set((s) => ({ session: s.session ? { ...s.session, explanation: text } : null }));
        transition('PROCESSING');

        try {
          const provider = getAIProvider();
          const sessionWithText = { ...session, explanation: text };
          const analysis = await provider.analyzeExplanation(sessionWithText, text);
          const challenge = await provider.generateFollowUpQuestion(analysis);
          set((s) => ({
            session: s.session
              ? { ...s.session, analysis, challenge, state: 'ANALYSIS' }
              : null,
          }));
          if (!session.isDemoMode && (analysis.recommendedAction === 'mastered' || analysis.overallStatus === 'mastered')) {
            useStudySpaceStore.getState().syncSessionToMap(session.topicId, analysis);
          }
        } catch {
          set({ error: 'Analysis failed. Switching to Demo Mode.' });
          const demo = new DemoProvider();
          const sessionWithText = { ...session, explanation: text };
          const analysis = await demo.analyzeExplanation(sessionWithText, text);
          const challenge = await demo.generateFollowUpQuestion(analysis);
          set((s) => ({
            session: s.session ? { ...s.session, analysis, challenge, state: 'ANALYSIS' } : null,
            isDemo: true,
          }));
          if (!session.isDemoMode && (analysis.recommendedAction === 'mastered' || analysis.overallStatus === 'mastered')) {
            useStudySpaceStore.getState().syncSessionToMap(session.topicId, analysis);
          }
        }
      },

      async submitFollowUp(answer, confidence) {
        const { session, transition } = get();
        if (!session) return;
        set((s) => ({
          session: s.session
            ? { ...s.session, followUpAnswer: answer, followUpConfidence: confidence }
            : null,
        }));
        transition('CONFIDENCE');
        await new Promise((r) => setTimeout(r, 400));
        transition('DIAGNOSIS');
      },

      completeRepair() {
        get().transition('RE_EXPLAIN');
      },

      async submitReExplanation(text) {
        const { session, transition } = get();
        if (!session) return;
        set((s) => ({ session: s.session ? { ...s.session, reExplanation: text } : null }));
        transition('PROCESSING');

        try {
          const provider = getAIProvider();
          const sessionWithReExplain = { ...session, reExplanation: text };
          const finalAnalysis = await provider.evaluateReExplanation(sessionWithReExplain, text);
          set((s) => ({
            session: s.session ? { ...s.session, finalAnalysis, state: 'MASTERY' } : null,
          }));
          if (!session.isDemoMode) {
            useStudySpaceStore.getState().syncSessionToMap(session.topicId, finalAnalysis);
          }
        } catch {
          const demo = new DemoProvider();
          const finalAnalysis = await demo.evaluateReExplanation(session, text);
          set((s) => ({
            session: s.session ? { ...s.session, finalAnalysis, state: 'MASTERY' } : null,
            isDemo: true,
          }));
          if (!session.isDemoMode) {
            useStudySpaceStore.getState().syncSessionToMap(session.topicId, finalAnalysis);
          }
        }
      },

      resetSession() {
        set({ session: null, error: null });
      },

      resetDemo() {
        set({ session: null, error: null, isDemo: isDemoMode() });
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: 'conceptiq-session-store',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ session: state.session }),
    }
  )
);
