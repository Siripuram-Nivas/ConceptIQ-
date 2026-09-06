import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Brain, Target } from 'lucide-react';
import { ALL_TOPICS } from '../data/topics';

export function LearnPage() {
  return (
    <div className="w-full flex-1 flex flex-col">
      {/* ── DESKTOP HERO SECTION ── */}
      <div className="w-full border-b border-white/[0.05] relative overflow-hidden bg-bg/50">
        <div className="absolute top-0 right-0 w-[60%] h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent-purple/10 via-bg to-bg opacity-50 pointer-events-none" />
        
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-16 md:py-24 relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          
          <div className="flex flex-col max-w-3xl">
            <h1 className="font-display font-black text-[3.5rem] md:text-[5rem] lg:text-[7rem] uppercase tracking-tighter leading-[0.85] text-white drop-shadow-2xl mb-6">
              CHOOSE A<br />
              <span className="text-accent-yellow">CONCEPT</span>
            </h1>
            <p className="text-lg md:text-2xl font-bold uppercase tracking-widest text-white/70 max-w-xl border-l-[3px] border-accent-purple/50 pl-6">
              Select a topic below to teach the AI and map your understanding.
            </p>
          </div>

          {/* Desktop contextual panel */}
          <div className="hidden lg:flex flex-col gap-4 p-8 rounded-[16px] bg-white/[0.02] border border-white/[0.05] backdrop-blur-md min-w-[320px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-accent-yellow flex items-center gap-2 mb-2">
              <Target size={16} /> WHAT YOU'LL DO
            </h3>
            <ul className="flex flex-col gap-4 text-sm font-bold uppercase tracking-wide text-white/80">
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">1</span> EXPLAIN THE CONCEPT</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">2</span> GET CHALLENGED</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">3</span> REPAIR KNOWLEDGE GAPS</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">4</span> ACHIEVE MASTERY</li>
            </ul>
          </div>
          
        </div>
      </div>

      {/* ── CONCEPT CARDS GRID ── */}
      <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {ALL_TOPICS.map((topic) => (
            <Link
              key={topic.id}
              to={`/learn/${topic.slug}`}
              className="group relative flex flex-col h-full bg-white/[0.02] border border-white/[0.08] hover:border-accent-yellow/50 rounded-[16px] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04] hover:shadow-[0_8px_32px_-8px_rgba(255,210,74,0.15)]"
            >
              {/* Card Header (Category & Difficulty) */}
              <div className="p-6 md:p-8 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-accent-purple">{topic.subject}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[4px] ${
                    topic.difficulty === 'beginner' ? 'bg-success/20 text-success' :
                    topic.difficulty === 'intermediate' ? 'bg-accent-yellow/20 text-accent-yellow' :
                    'bg-accent-purple/20 text-accent-purple'
                  }`}>
                    {topic.difficulty}
                  </span>
                </div>
                
                {/* Title & Description */}
                <h2 className="font-display font-black text-3xl uppercase tracking-tighter text-white mb-4 line-clamp-2">{topic.title}</h2>
                <p className="text-sm md:text-base font-medium text-white/60 leading-relaxed mb-8 flex-1 line-clamp-3">{topic.description}</p>
                
                {/* Meta Stats */}
                <div className="flex items-center gap-4 mt-auto pt-6 border-t border-white/[0.05]">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                    <Clock size={16} className="text-white/40" /> {topic.estimatedMinutes} MIN
                  </span>
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
                    <Brain size={16} className="text-white/40" /> {topic.concepts.length} CONCEPTS
                  </span>
                </div>
              </div>

              {/* Interaction Affordance */}
              <div className="absolute top-6 right-6 md:top-8 md:right-8 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-accent-yellow flex items-center justify-center text-black shadow-lg">
                  <ChevronRight size={20} strokeWidth={3} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
