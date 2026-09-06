import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { ConceptEvidence, ConceptStatus } from '../types';

interface Props {
  concepts: ConceptEvidence[];
  showMissing?: boolean;
}

export function EvidencePanel({ concepts, showMissing = true }: Props) {
  return (
    <div className="space-y-4">
      {concepts.map((c) => (
        <div key={c.concept} className="space-y-2">
          <div className="flex items-center gap-2">
            {c.status === 'mastered' && <CheckCircle2 size={16} className="text-success flex-shrink-0" />}
            {c.status === 'strong' && <CheckCircle2 size={16} className="text-success/70 flex-shrink-0" />}
            {c.status === 'partial' && <AlertTriangle size={16} className="text-accent flex-shrink-0" />}
            {c.status === 'weak' && <AlertTriangle size={16} className="text-warning flex-shrink-0" />}
            {c.status === 'potential_misconception' && <AlertTriangle size={16} className="text-warning flex-shrink-0" />}
            {c.status === 'not_started' && <XCircle size={16} className="text-muted flex-shrink-0" />}
            <span className="font-semibold text-sm text-fg">{c.concept}</span>
            <ConceptStatusBadge status={c.status} />
          </div>
          {c.studentEvidence.length > 0 && (
            <div className="pl-6 space-y-1">
              {c.studentEvidence.map((e, i) => (
                <p key={i} className="text-xs text-muted flex items-start gap-1.5">
                  <span className="text-success mt-0.5">✓</span> {e}
                </p>
              ))}
            </div>
          )}
          {showMissing && c.missingEvidence.length > 0 && (
            <div className="pl-6 space-y-1">
              {c.missingEvidence.map((e, i) => (
                <p key={i} className="text-xs text-warning/80 flex items-start gap-1.5">
                  <span className="mt-0.5">⚠</span> {e}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ConceptStatusBadge({ status }: { status: ConceptStatus }) {
  const map: Record<ConceptStatus, { label: string; cls: string }> = {
    mastered: { label: 'Mastered', cls: 'bg-success text-bg border-2 border-success' },
    strong: { label: 'Strong', cls: 'bg-success text-bg border-2 border-success' },
    partial: { label: 'Partial', cls: 'bg-surface text-fg border-2 border-fg' },
    weak: { label: 'Weak', cls: 'bg-accent-yellow text-fg border-2 border-fg' },
    potential_misconception: { label: 'Uncertain', cls: 'bg-accent-pink text-fg border-2 border-fg' },
    not_started: { label: 'Not covered', cls: 'bg-surface text-muted border-2 border-muted' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${cls}`}>{label}</span>
  );
}
