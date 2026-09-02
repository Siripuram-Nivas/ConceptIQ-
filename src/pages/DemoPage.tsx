import { useState } from 'react';
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
  const { resetDemo, startSession } = useSessionStore();
  const [currentStage, setCurrentStage] = useState(0);

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
          <div className="p-5 rounded-2xl border border-border bg-surface">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Hero Demo</p>
            <h2 className="font-display font-bold text-display-md text-fg">TCP Three-Way Handshake</h2>
            <p className="text-sm text-muted mt-1">The complete misconception detection journey.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">Demo journey</p>
            {DEMO_STAGES.map((stage, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                  i < currentStage
                    ? 'border-success/30 bg-success-light/30 text-success'
                    : i === currentStage
                    ? 'border-ai/40 bg-ai-light text-ai font-medium'
                    : 'border-border text-muted'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  i < currentStage ? 'bg-success text-white' :
                  i === currentStage ? 'bg-ai text-white' :
                  'bg-border text-muted'
                }`}>{i < currentStage ? '✓' : i + 1}</span>
                {stage.label}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 mt-8">
          <button
            onClick={handleStart}
            className="flex items-center justify-center gap-2 w-full min-h-[60px] rounded-2xl bg-fg text-bg font-bold text-base hover:bg-fg/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <Zap size={18} className="text-accent" /> Start Demo
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 w-full min-h-[52px] rounded-2xl border border-border text-fg font-semibold text-sm hover:bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <RotateCcw size={16} /> Reset Demo
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          No API key, microphone, or camera required.
        </p>
      </div>
    </div>
  );
}
