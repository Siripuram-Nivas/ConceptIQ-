import { useNavigate, Link } from 'react-router-dom';
import { useSessionStore } from '../store/session-store';
import { ProgressRing } from '../components/ProgressRing';

function getLabel(score: number) {
  if (score >= 85) return 'Strong understanding';
  if (score >= 65) return 'Partial understanding';
  if (score >= 40) return 'Learning gap';
  return 'Needs work';
}

export function MasteryPage() {
  const navigate = useNavigate();
  const { session, resetSession, isDemo } = useSessionStore();

  if (!session) {
    navigate('/learn');
    return null;
  }

  const before = session.analysis?.masteryIndex.total ?? 0;
  const after = session.finalAnalysis?.masteryIndex.total ?? before;
  const beforeMisconceptions = session.analysis?.misconceptions.length ?? 0;
  const afterMisconceptions = session.finalAnalysis?.misconceptions.length ?? beforeMisconceptions;
  const improved = after > before;
  const finalConcepts = session.finalAnalysis?.concepts ?? session.analysis?.concepts ?? [];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1000px] mx-auto px-5 lg:px-10 pt-10 pb-32">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Session Result</p>
            <h1 className="font-display font-bold text-display-xl text-fg leading-none max-w-2xl">
              {improved ? 'YOUR UNDERSTANDING IMPROVED.' : 'SESSION COMPLETE.'}
            </h1>
          </div>
          {isDemo && <span className="px-3 py-1 bg-accent-yellow font-bold text-xs uppercase tracking-wider">Demo Mode</span>}
        </div>

        {/* Before / After */}
        {session.finalAnalysis && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="editorial-card p-8 bg-surface border-4 flex flex-col items-center">
              <p className="text-sm font-bold uppercase tracking-wider text-muted mb-6">Before</p>
              <div className="relative mb-6">
                <ProgressRing value={before} size={160} color="#000000" />
                <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold">{before}</span>
              </div>
              <p className="text-xl font-bold text-fg mb-2">{getLabel(before)}</p>
              <p className="text-sm font-medium text-warning uppercase tracking-wide">
                {beforeMisconceptions} misconception{beforeMisconceptions !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="editorial-card p-8 bg-accent-green text-bg border-4 border-fg flex flex-col items-center shadow-editorial transform md:-rotate-1">
              <p className="text-sm font-bold uppercase tracking-wider text-bg mb-6">After</p>
              <div className="relative mb-6">
                <ProgressRing value={after} size={160} color="#000000" />
                <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold text-fg">{after}</span>
              </div>
              <p className="text-xl font-bold text-fg mb-2">{getLabel(after)}</p>
              <p className="text-sm font-medium text-fg uppercase tracking-wide">
                {afterMisconceptions} misconception{afterMisconceptions !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {!session.finalAnalysis && (
          <div className="editorial-card p-12 bg-surface border-4 flex flex-col items-center mb-16 max-w-md mx-auto">
            <div className="relative mb-8">
              <ProgressRing value={before} size={200} color="#000000" />
              <span className="absolute inset-0 flex items-center justify-center font-display text-6xl font-bold">{before}</span>
            </div>
            <p className="text-2xl font-bold text-fg uppercase tracking-tight">{getLabel(before)}</p>
          </div>
        )}

        {/* Final Concepts List */}
        {finalConcepts.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-8 pb-4 border-b-4 border-fg">Final Concept Evidence</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {finalConcepts.map(c => (
                <div key={c.concept} className="p-4 border-2 border-fg bg-surface flex justify-between items-center">
                  <span className="font-bold text-fg">{c.concept}</span>
                  <span className={`text-xs font-bold uppercase px-2 py-1 ${c.status === 'mastered' ? 'bg-success text-bg' :
                      c.status === 'strong' ? 'bg-success-light text-success-dark' :
                        c.status === 'partial' ? 'bg-accent-yellow text-fg' :
                          'bg-warning text-bg'
                    }`}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t-4 border-fg">
          <Link
            to="/map"
            className="editorial-btn-primary flex-1 text-center text-xl"
          >
            View Knowledge Map
          </Link>
          <button
            onClick={() => { resetSession(); navigate('/learn'); }}
            className="editorial-btn-outline flex-1 text-center text-xl"
          >
            Teach Another Concept
          </button>
        </div>
      </div>
    </div>
  );
}
