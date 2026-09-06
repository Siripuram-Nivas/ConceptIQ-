import type { MasteryBreakdown } from '../types';

interface Props {
  breakdown: MasteryBreakdown;
}

const COMPONENTS = [
  { key: 'conceptCoverage' as const, label: 'Concept Coverage', max: 35 },
  { key: 'explanationQuality' as const, label: 'Explanation Quality', max: 25 },
  { key: 'followupPerformance' as const, label: 'Follow-up', max: 20 },
  { key: 'consistency' as const, label: 'Consistency', max: 20 },
];

export function MasteryBreakdownComponent({ breakdown }: Props) {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h3 className="font-display font-black text-2xl uppercase tracking-tighter text-fg mb-4 pb-2 border-b border-border">Score Breakdown</h3>
        <div className="space-y-4">
          {COMPONENTS.map(({ key, label, max }) => {
            const value = breakdown[key];
            const pct = (value / max) * 100;
            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-sm uppercase tracking-wide text-fg">{label}</span>
                  <span className="font-display font-bold text-xl text-fg leading-none">{value} <span className="text-muted text-sm">/ {max}</span></span>
                </div>
                <div className="h-4 bg-bg border-2 border-fg flex">
                  <div
                    className="h-full bg-fg transition-all duration-700"
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted border-l-4 border-muted pl-4">
        This prototype index estimates demonstrated understanding from explanation evidence and follow-up responses.
        It is not a standardized educational assessment.
      </p>
    </div>
  );
}
