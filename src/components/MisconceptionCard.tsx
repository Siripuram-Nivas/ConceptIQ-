import { AlertTriangle, Eye } from 'lucide-react';
import type { Misconception, ConceptEvidence } from '../types';

interface Props {
  misconception: Misconception;
  conceptEvidence?: ConceptEvidence;
  confidence?: number;
}

export function MisconceptionCard({ misconception, conceptEvidence, confidence }: Props) {
  const isHighConfidence = (confidence ?? 0) >= 4;

  return (
    <div className="rounded-2xl border-2 border-warning/30 bg-warning-light/50 p-5 space-y-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle size={16} className="text-warning" />
        </div>
        <div>
          <p className="font-semibold text-fg text-sm">
            {isHighConfidence
              ? '⚠ Potential High-Confidence Misconception'
              : '⚠ Potential Misconception'}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {misconception.concept}
          </p>
        </div>
      </div>

      {isHighConfidence && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
          <span className="text-xs font-medium text-warning">Confidence {confidence}/5 + incomplete reasoning</span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-muted" />
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">Why this was flagged</p>
        </div>
        <p className="text-sm text-fg/80 leading-relaxed">{misconception.evidence}</p>
      </div>

      {conceptEvidence && (
        <div className="space-y-3 border-t border-warning/20 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">Expected</p>
              <div className="space-y-1">
                {conceptEvidence.expectedEvidence.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-xs text-fg/70">· {e}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">You explained</p>
              <div className="space-y-1">
                {conceptEvidence.studentEvidence.length > 0
                  ? conceptEvidence.studentEvidence.map((e, i) => (
                      <p key={i} className="text-xs text-fg/70">✓ {e}</p>
                    ))
                  : <p className="text-xs text-muted">Not mentioned</p>}
              </div>
            </div>
          </div>
          {conceptEvidence.missingEvidence.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-warning uppercase tracking-wide mb-1.5">Missing connection</p>
              <div className="space-y-1">
                {conceptEvidence.missingEvidence.map((e, i) => (
                  <p key={i} className="text-xs text-warning/90">⚠ {e}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
