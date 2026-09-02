import { useState } from 'react';

import type { RepairContent } from '../types';

interface Props {
  repair: RepairContent;
  onComplete: () => void;
}

export function RepairSession({ repair, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const total = repair.visualSteps.length;
  const current = repair.visualSteps[step];
  const isLast = step === total - 1;

  const typeIcon: Record<string, string> = {
    visual: '📊',
    explanation: '💡',
    analogy: '🔗',
    challenge: '🎯',
  };

  return (
    <div className="space-y-8 animate-fade-in border-4 border-fg bg-surface p-6 lg:p-10 shadow-editorial">
      <div className="flex items-center justify-between border-b-4 border-fg pb-6">
        <div className="flex gap-2">
          {repair.visualSteps.map((_, i) => (
            <div
              key={i}
              className={`h-3 rounded-none transition-all ${i === step ? 'w-12 bg-fg' : i < step ? 'w-6 bg-fg/40' : 'w-6 bg-fg/10'
                }`}
            />
          ))}
        </div>
        <span className="font-display font-bold text-2xl text-fg">{step + 1} / {total}</span>
      </div>

      <div className="py-4">
        <span className="text-3xl mb-6 block">{typeIcon[current.type]}</span>
        <p className="text-2xl font-medium leading-relaxed text-fg">{current.content}</p>
        {current.diagram && (
          <pre className="mt-8 p-6 bg-fg text-bg text-sm font-mono overflow-x-auto whitespace-pre font-bold">
            {current.diagram}
          </pre>
        )}
      </div>

      <div className="pt-8 border-t-4 border-fg">
        {isLast ? (
          <button
            onClick={onComplete}
            className="editorial-btn-primary w-full text-xl"
          >
            I'm Ready To Re-Explain
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="editorial-btn-outline w-full text-xl"
          >
            Next Step
          </button>
        )}
      </div>
    </div>
  );
}
