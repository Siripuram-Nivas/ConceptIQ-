import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LearningSession, SessionState } from '../types';
import { getAIProvider, isDemoMode } from '../ai';
import { idbStorage } from '../lib/idb-storage';
import { useStudySpaceStore } from './study-space-store';
import { retrieveRelevantContext } from '../ai/context-retriever';
import type { ExtractedConcept } from '../types';

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

  startSession: (topicId: string, materialId?: string, materialVersion?: number) => void;
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

function createNewSession(topicId: string, materialId?: string, materialVersion?: number): LearningSession {
  return {
    id: crypto.randomUUID(),
    topicId,
    materialId,
    materialVersion,
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

      startSession(topicId, materialId, materialVersion) {
        set({ session: createNewSession(topicId, materialId, materialVersion), error: null });
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
          
          let materialContext = '';
          const materialId = session.materialId || session.topicId;
          const material = useStudySpaceStore.getState().getMaterialById(materialId);
          if (material?.processedContent) {
            const conceptName = session.topicId;
            const targetConcept = material.processedContent.concepts?.find((c: ExtractedConcept) => c.name.toLowerCase() === conceptName.toLowerCase());
            if (targetConcept) {
              materialContext = retrieveRelevantContext(targetConcept, material.processedContent);
            } else {
              materialContext = retrieveRelevantContext({ name: conceptName } as any, material.processedContent);
            }
          }
          
          const analysis = await provider.analyzeExplanation(sessionWithText, text, materialContext);
          const challenge = await provider.generateFollowUpQuestion(analysis);
          set((s) => ({
            session: s.session
              ? { ...s.session, analysis, challenge, state: 'ANALYSIS' }
              : null,
          }));
          if (!session.isDemoMode && (analysis.recommendedAction === 'mastered' || analysis.overallStatus === 'mastered')) {
            useStudySpaceStore.getState().syncSessionToMap(session.topicId, analysis);
          }
        } catch (error) {
          set({ error: 'AI processing failed. Please try again.' });
          transition('EXPLAINING');
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
          
          let materialContext = '';
          const materialId = session.materialId || session.topicId;
          const material = useStudySpaceStore.getState().getMaterialById(materialId);
          if (material?.processedContent) {
            const conceptName = session.topicId;
            const targetConcept = material.processedContent.concepts?.find((c: ExtractedConcept) => c.name.toLowerCase() === conceptName.toLowerCase());
            if (targetConcept) {
              materialContext = retrieveRelevantContext(targetConcept, material.processedContent);
            } else {
              materialContext = retrieveRelevantContext({ name: conceptName } as any, material.processedContent);
            }
          }
          
          const finalAnalysis = await provider.evaluateReExplanation(sessionWithReExplain, text, materialContext);
          set((s) => ({
            session: s.session ? { ...s.session, finalAnalysis, state: 'MASTERY' } : null,
          }));
          if (!session.isDemoMode) {
            useStudySpaceStore.getState().syncSessionToMap(session.topicId, finalAnalysis);
          }
        } catch (error) {
          set({ error: 'AI processing failed. Please try again.' });
          transition('RE_EXPLAIN');
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
