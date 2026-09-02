import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/session-store';
import { RepairSession } from '../components/RepairSession';
import { TeachBackRecorder } from '../components/TeachBackRecorder';
import { getAIProvider } from '../ai';
import type { RepairContent } from '../types';

export function RepairPage() {
  const navigate = useNavigate();
  const { session, completeRepair, submitReExplanation, isDemo } = useSessionStore();
  const [repair, setRepair] = useState<RepairContent | null>(null);
  const [phase, setPhase] = useState<'loading' | 'repair' | 're-explain' | 'processing'>('loading');

  useEffect(() => {
    if (!session?.analysis) { navigate('/learn'); return; }
    const provider = getAIProvider();
    provider.generateRepair(session.analysis).then((r) => {
      setRepair(r);
      setPhase('repair');
    });
  }, []);

  const handleRepairComplete = () => {
    completeRepair();
    setPhase('re-explain');
  };

  const handleReExplain = async (text: string) => {
    setPhase('processing');
    await submitReExplanation(text);
    navigate('/mastery');
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1000px] mx-auto px-5 lg:px-10 pt-10 pb-32">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Concept Repair</p>
            <h1 className="font-display font-bold text-display-xl text-fg leading-none">
              {phase === 're-explain' ? 'NOW RE-EXPLAIN' : 'REPAIR THE GAP'}
            </h1>
          </div>
          {isDemo && <span className="px-3 py-1 bg-accent-yellow font-bold text-xs uppercase tracking-wider">Demo Mode</span>}
        </div>

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-fg border-t-accent-yellow rounded-full animate-spin mb-8" />
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-fg text-center">
              Preparing Your Repair...
            </h2>
          </div>
        )}

        {phase === 'repair' && repair && (
          <div className="animate-slide-up">
            <RepairSession repair={repair} onComplete={handleRepairComplete} />
          </div>
        )}

        {phase === 're-explain' && (
          <div className="space-y-8 animate-slide-up">
            <div className="border-4 border-fg bg-accent-blue p-6 lg:p-8 shadow-editorial">
              <p className="text-2xl font-bold text-bg leading-relaxed">
                Now explain the full concept again, incorporating what you just learned.
              </p>
            </div>

            <div className="border-4 border-fg p-6 bg-surface shadow-editorial">
              <TeachBackRecorder
                onSubmit={handleReExplain}
                placeholder="Explain again, now including the missing connection..."
              />
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-fg border-t-accent-blue rounded-full animate-spin mb-8" />
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-fg text-center">
              Evaluating...
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
