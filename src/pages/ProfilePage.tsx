import { useSessionStore } from '../store/session-store';
import { Brain, CheckCircle2 } from 'lucide-react';

export function ProfilePage() {
  const { session } = useSessionStore();
  const mastery = session?.finalAnalysis?.masteryIndex.total ?? session?.analysis?.masteryIndex.total;
  const misconceptions = session?.analysis?.misconceptions.length ?? 0;
  const resolved = session?.finalAnalysis ? misconceptions : 0;

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 pt-12 md:pt-20 pb-32 w-full">
        <div className="mb-12 border-b border-white/[0.05] pb-6">
          <h1 className="font-display font-black text-[3rem] md:text-[5rem] uppercase tracking-tighter leading-none text-white mb-4">PROFILE<br/><span className="text-accent-yellow">& PROGRESS</span></h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="p-8 rounded-[16px] bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between h-[200px]">
            <Brain size={24} className="text-accent-yellow mb-2" />
            <div>
              <p className="text-5xl font-display font-black text-white">{mastery ?? '—'}</p>
              <p className="text-sm font-bold uppercase tracking-widest text-white/50 mt-2">Latest mastery index</p>
            </div>
          </div>
          <div className="p-8 rounded-[16px] bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between h-[200px]">
            <CheckCircle2 size={24} className="text-success mb-2" />
            <div>
              <p className="text-5xl font-display font-black text-white">{resolved}</p>
              <p className="text-sm font-bold uppercase tracking-widest text-white/50 mt-2">Misconceptions resolved</p>
            </div>
          </div>
        </div>
        {!session && (
          <div className="p-12 text-center border border-white/[0.05] rounded-[16px] bg-white/[0.01]">
            <p className="text-lg font-bold uppercase tracking-widest text-white/50">Complete a session to see your progress.</p>
          </div>
        )}
        <div className="mt-12 max-w-2xl">
          <p className="text-sm font-medium text-white/40 leading-relaxed border-l-2 border-white/10 pl-4">
            Your learning evidence is used to personalize feedback. Raw recordings are not retained by default in this prototype.
          </p>
        </div>
      </div>
    </div>
  );
}
