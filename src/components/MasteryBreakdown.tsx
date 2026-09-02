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
    <div className="space-y-3">
      {COMPONENTS.map(({ key, label, max }) => {
        const value = breakdown[key];
        const pct = (value / max) * 100;
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted">{label}</span>
              <span className="font-medium text-fg">{value} / {max}</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-ai rounded-full transition-all duration-700"
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
      <p className="text-[10px] text-muted pt-1 leading-relaxed">
        This prototype index estimates demonstrated understanding from explanation evidence and follow-up responses.
        It is not a standardized educational assessment.
      </p>
    </div>
  );
}
