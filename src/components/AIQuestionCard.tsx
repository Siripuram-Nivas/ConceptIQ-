import { Brain } from 'lucide-react';
import type { AdaptiveQuestion } from '../types';

interface Props {
  question: AdaptiveQuestion;
}

export function AIQuestionCard({ question }: Props) {
  return (
    <div className="rounded-2xl border border-ai/20 bg-ai-light p-5 space-y-3 animate-slide-up">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-ai flex items-center justify-center">
          <Brain size={14} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-ai uppercase tracking-wide">AI Learner</span>
      </div>
      <p className="text-fg font-medium leading-relaxed text-base">
        I'm following you.{' '}
        <span className="text-ai">{question.question}</span>
      </p>
      <p className="text-xs text-muted">
        Take your time. Explain your reasoning.
      </p>
    </div>
  );
}
