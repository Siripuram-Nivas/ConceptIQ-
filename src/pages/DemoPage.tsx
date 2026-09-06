import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Zap } from 'lucide-react';
import { DemoModeIndicator } from '../components/DemoModeIndicator';
import { useSessionStore } from '../store/session-store';
import { TCP_TOPIC } from '../data/demo/tcp-scenario';

const DEMO_STAGES = [
  { label: 'Select TCP Three-Way Handshake', route: `/learn/${TCP_TOPIC.slug}` },
  { label: 'Review the material', route: `/learn/${TCP_TOPIC.slug}` },
  { label: 'Teach the AI', route: `/teach/${TCP_TOPIC.slug}` },
  { label: 'Answer the challenge', route: '/analysis' },
  { label: 'See the misconception evidence', route: '/analysis' },
  { label: '60-second repair', route: '/repair' },
  { label: 'Re-explain', route: '/repair' },
  { label: 'View mastery result', route: '/mastery' },
];

export function DemoPage() {
  const navigate = useNavigate();
  const { session, resetDemo, startSession } = useSessionStore();
  const [currentStage, setCurrentStage] = useState(0);

  // If a previous demo run is persisted in a completed state, reset it on mount
  // so the demo page always starts with canonical data. This only clears the
  // active session — it does not touch materials or study spaces.
  useEffect(() => {
    if (session?.state === 'MASTERY') {
      resetDemo();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    resetDemo();
    setCurrentStage(0);
  };

  const handleStart = () => {
    resetDemo();
    startSession(TCP_TOPIC.id);
    navigate(`/teach/${TCP_TOPIC.slug}`);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 max-w-lg mx-auto w-full px-5 pt-8 pb-10 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-display-md text-fg">
              Concept<span className="text-ai">IQ</span>
            </h1>
          </div>
          <DemoModeIndicator />
        </div>

        <div className="flex-1 space-y-6">
          <div className="glass-panel p-6">
            <p className="text-xs font-bold text-accent-purple uppercase tracking-widest mb-2">Hero Demo</p>
            <h2 className="font-display font-black text-3xl text-fg uppercase tracking-tighter mb-2">TCP Three-Way Handshake</h2>
            <p className="text-base font-medium text-fg/80">The complete misconception detection journey.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Demo journey</p>
            <div className="glass-panel divide-y-4 divide-fg">
              {DEMO_STAGES.map((stage, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 px-6 py-4 ${
                    i < currentStage
                      ? 'bg-success/20 text-success'
                      : i === currentStage
                      ? 'bg-accent-yellow text-fg'
                      : 'text-muted'
                  }`}
                >
                  <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-sm font-bold border-2 border-fg ${
                    i < currentStage ? 'bg-success text-bg' :
                    i === currentStage ? 'bg-fg text-bg' :
                    'bg-surface text-muted border-muted'
                  }`}>{i < currentStage ? '✓' : i + 1}</span>
                  <span className="font-bold uppercase tracking-wide text-sm">{stage.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-12">
          <button
            onClick={handleStart}
            className="editorial-btn-primary w-full flex items-center justify-center gap-3 text-xl"
          >
            <Zap size={24} className="text-accent-yellow" /> START DEMO
          </button>
          <button
            onClick={handleReset}
            className="editorial-btn-outline w-full flex items-center justify-center gap-3 text-lg"
          >
            <RotateCcw size={20} /> RESET DEMO
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          No API key, microphone, or camera required.
        </p>
      </div>
    </div>
  );
}
