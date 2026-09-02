import { useSessionStore } from '../store/session-store';
import { Brain, CheckCircle2 } from 'lucide-react';

export function ProfilePage() {
  const { session } = useSessionStore();
  const mastery = session?.finalAnalysis?.masteryIndex.total ?? session?.analysis?.masteryIndex.total;
  const misconceptions = session?.analysis?.misconceptions.length ?? 0;
  const resolved = session?.finalAnalysis ? misconceptions : 0;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-32">
        <h1 className="font-display font-bold text-display-lg text-fg mb-6">Progress</h1>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-5 rounded-2xl border border-border bg-surface">
            <Brain size={20} className="text-ai mb-2" />
            <p className="text-3xl font-display font-bold text-fg">{mastery ?? '—'}</p>
            <p className="text-xs text-muted mt-1">Latest mastery index</p>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-surface">
            <CheckCircle2 size={20} className="text-success mb-2" />
            <p className="text-3xl font-display font-bold text-fg">{resolved}</p>
            <p className="text-xs text-muted mt-1">Misconceptions resolved</p>
          </div>
        </div>
        {!session && (
          <p className="text-sm text-muted text-center py-8">Complete a session to see your progress.</p>
        )}
        <p className="text-xs text-muted leading-relaxed mt-4">
          Your learning evidence is used to personalize feedback. Raw recordings are not retained by default in this prototype.
        </p>
      </div>
    </div>
  );
}
