import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/session-store';

const ANALYSIS_STAGES = [
  'Listening to your explanation...',
  'Analyzing reasoning...',
  'Mapping concepts...',
  'Checking for gaps...',
  'Preparing a challenge...',
];

type Phase = 'loading' | 'evidence' | 'challenge' | 'confidence' | 'diagnosis';

export function AnalysisPage() {
  const navigate = useNavigate();
  const { session, submitFollowUp, isDemo } = useSessionStore();
  const [phase, setPhase] = useState<Phase>('loading');
  const [stageIdx, setStageIdx] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [followUpText, setFollowUpText] = useState('');

  useEffect(() => {
    if (!session) { navigate('/learn'); return; }
    if (session.state === 'ANALYSIS') {
      // Advance through loading stages then show evidence
      const timer = setInterval(() => {
        setStageIdx((i) => {
          if (i >= ANALYSIS_STAGES.length - 1) {
            clearInterval(timer);
            setPhase('evidence');
            return i;
          }
          return i + 1;
        });
      }, 500);
      return () => clearInterval(timer);
    }
    if (session.state === 'MASTERY') {
      navigate('/mastery');
    }
  }, [session, navigate]);

  if (!session) return null;

  const analysis = session.analysis;
  const challenge = session.challenge;
  const hasMisconception = (analysis?.misconceptions.length ?? 0) > 0;
  const misconception = analysis?.misconceptions[0];
  const misconceptEvidence = misconception
    ? analysis?.concepts.find((c) => c.status === 'potential_misconception')
    : undefined;

  const handleChallengeSubmit = async () => {
    if (!followUpText.trim() || confidence === null) return;
    setPhase('diagnosis');
    await submitFollowUp(followUpText, confidence);
    if (hasMisconception) {
      navigate('/repair');
    } else {
      navigate('/mastery');
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1000px] mx-auto px-5 lg:px-10 pt-10 pb-32">
        <div className="flex items-center justify-between mb-12">
          <h1 className="font-display font-bold text-display-xl text-fg leading-none">
            ANALYSIS
          </h1>
          {isDemo && <span className="px-3 py-1 bg-accent-yellow font-bold text-xs uppercase tracking-wider">Demo Mode</span>}
        </div>

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-fg border-t-accent-pink rounded-full animate-spin mb-8" />
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-fg text-center">
              {ANALYSIS_STAGES[stageIdx] || 'Analyzing...'}
            </h2>
          </div>
        )}

        {phase === 'evidence' && analysis && (
          <div className="space-y-16 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="editorial-card p-6 lg:p-8 bg-surface border-4">
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight mb-6 pb-4 border-b-2 border-fg/20">What You Demonstrated</h2>
                <ul className="space-y-4">
                  {analysis.concepts.filter(c => c.status === 'mastered' || c.status === 'strong' || c.status === 'partial').map((concept, i) => (
                    <li key={i} className="flex gap-3 text-lg font-medium text-fg">
                      <span className="text-success font-bold">✓</span>
                      {concept.concept}
                    </li>
                  ))}
                  {analysis.concepts.filter(c => c.status === 'mastered' || c.status === 'strong' || c.status === 'partial').length === 0 && (
                    <p className="text-fg/60 font-medium italic">No strong evidence detected yet.</p>
                  )}
                </ul>
              </div>

              <div className="editorial-card p-6 lg:p-8 bg-surface border-4">
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight mb-6 pb-4 border-b-2 border-fg/20">What's Missing</h2>
                <ul className="space-y-4">
                  {analysis.concepts.filter(c => c.status === 'weak' || c.status === 'not_started').map((concept, i) => (
                    <li key={i} className="flex gap-3 text-lg font-medium text-fg">
                      <span className="text-warning font-bold">→</span>
                      {concept.concept}
                    </li>
                  ))}
                  {analysis.concepts.filter(c => c.status === 'weak' || c.status === 'not_started').length === 0 && (
                    <p className="text-fg/60 font-medium italic">You covered the key points well.</p>
                  )}
                </ul>
              </div>
            </div>

            {hasMisconception && misconception && misconceptEvidence && (
              <div className="border-4 border-fg bg-accent-purple p-8 lg:p-12 shadow-editorial">
                <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-bg mb-4">Potential Misconception</h2>
                <div className="bg-bg p-6 border-2 border-fg mb-8">
                  <h3 className="font-bold text-fg uppercase tracking-wider text-sm mb-2">What you might be misunderstanding</h3>
                  <p className="text-xl font-medium text-fg leading-relaxed">{misconception.evidence}</p>
                </div>

                {challenge && (
                  <button
                    onClick={() => setPhase('challenge')}
                    className="editorial-btn-accent w-full text-xl"
                  >
                    Challenge Me
                  </button>
                )}
                {!challenge && (
                  <button
                    onClick={handleChallengeSubmit}
                    className="editorial-btn-accent w-full text-xl"
                  >
                    Repair The Gap
                  </button>
                )}
              </div>
            )}

            {!hasMisconception && (
              <div className="pt-8 border-t-4 border-fg">
                <button
                  onClick={() => navigate('/mastery')}
                  className="editorial-btn-primary w-full text-xl"
                >
                  See Mastery
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'challenge' && challenge && (
          <div className="space-y-12 animate-slide-up">
            <div className="border-4 border-fg p-8 bg-accent-pink shadow-editorial">
              <h2 className="font-display text-3xl font-bold text-fg mb-6">{challenge.question}</h2>
              <textarea
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="Type your answer..."
                rows={6}
                className="w-full px-6 py-6 border-2 border-fg bg-surface text-fg text-xl font-medium resize-none focus:outline-none focus:ring-4 focus:ring-fg transition-all"
              />
            </div>

            <button
              onClick={() => setPhase('confidence')}
              disabled={followUpText.trim().length < 5}
              className="editorial-btn-primary w-full text-xl"
            >
              Continue
            </button>
          </div>
        )}

        {phase === 'confidence' && (
          <div className="space-y-12 animate-slide-up">
            <div className="border-4 border-fg p-8 bg-surface shadow-editorial">
              <h2 className="font-display text-3xl font-bold text-fg mb-8 text-center">How confident are you in this answer?</h2>
              <div className="flex justify-between gap-4 max-w-2xl mx-auto">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfidence(level)}
                    className={`w-16 h-16 rounded-full border-4 font-display text-2xl font-bold transition-all ${confidence === level ? 'bg-accent-blue border-fg text-bg scale-110' : 'bg-surface border-fg text-fg hover:bg-fg/5'
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleChallengeSubmit}
              disabled={confidence === null}
              className="editorial-btn-primary w-full text-xl"
            >
              {hasMisconception ? 'Start Repair' : 'See Mastery'}
            </button>
          </div>
        )}

        {phase === 'diagnosis' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-fg border-t-accent-yellow rounded-full animate-spin mb-8" />
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-fg text-center">
              Diagnosing...
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
