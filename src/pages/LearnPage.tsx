import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Brain, Target } from 'lucide-react';
import { ALL_TOPICS } from '../data/topics';

export function LearnPage() {
  return (
    <div className="w-full flex-1 flex flex-col">
      {/* ── HERO SECTION ── */}
      <div className="w-full border-b border-white/[0.05] relative overflow-hidden">
        {/* Atmospheric accent */}
        <div className="absolute top-0 right-0 w-[55%] h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent-purple/10 via-transparent to-transparent pointer-events-none" />

        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20
                        py-12 md:py-16 lg:py-20
                        relative z-10
                        flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 lg:gap-16">

          {/* ── LEFT: Editorial headline ── */}
          <div className="flex flex-col min-w-0">
            <h1 className="font-display font-black
                           text-[3rem] md:text-[5rem] lg:text-[6rem] xl:text-[7rem]
                           uppercase tracking-tighter leading-[0.85]
                           text-white drop-shadow-2xl mb-5">
              CHOOSE A<br />
              <span className="text-accent-yellow">CONCEPT</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl font-bold uppercase tracking-widest
                          text-white/60 max-w-lg
                          border-l-[3px] border-accent-purple/50 pl-5">
              Select a topic to teach the AI and map your understanding.
            </p>
          </div>

          {/* ── RIGHT: Contextual panel — desktop only (lg+) ── */}
          <div className="hidden lg:flex flex-col gap-3
                          p-7 rounded-[16px]
                          bg-white/[0.03] border border-white/[0.07]
                          backdrop-blur-md
                          shrink-0 w-[300px] xl:w-[340px]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-accent-yellow
                           flex items-center gap-2 mb-1">
              <Target size={14} /> WHAT YOU'LL DO
            </h3>
            <ol className="flex flex-col gap-3">
              {[
                'Explain the concept',
                'Get challenged',
                'Repair knowledge gaps',
                'Achieve mastery',
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-white/10 border border-white/10
                                   flex items-center justify-center
                                   text-[9px] font-black text-white/70 shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-white/75">{step}</span>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>

      {/* ── CONCEPT CARDS GRID ── */}
      <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-10 md:py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
          {ALL_TOPICS.map((topic) => (
            <Link
              key={topic.id}
              to={`/learn/${topic.slug}`}
              className="group relative flex flex-col h-full
                         bg-white/[0.02] border border-white/[0.08]
                         hover:border-accent-yellow/40
                         rounded-[16px] overflow-hidden
                         transition-all duration-300
                         hover:-translate-y-1
                         hover:bg-white/[0.04]
                         hover:shadow-[0_8px_32px_-8px_rgba(255,210,74,0.12)]"
            >
              <div className="p-6 md:p-7 lg:p-8 flex flex-col flex-1">
                {/* Category + Difficulty */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-accent-purple">
                    {topic.subject}
                  </p>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[4px] ${
                    topic.difficulty === 'beginner'     ? 'bg-success/20 text-success' :
                    topic.difficulty === 'intermediate' ? 'bg-accent-yellow/20 text-accent-yellow' :
                                                         'bg-accent-purple/20 text-accent-purple'
                  }`}>
                    {topic.difficulty}
                  </span>
                </div>

                {/* Title */}
                <h2 className="font-display font-black text-2xl md:text-3xl uppercase tracking-tighter
                               text-white mb-3 line-clamp-2 leading-tight">
                  {topic.title}
                </h2>

                {/* Description */}
                <p className="text-sm font-medium text-white/55 leading-relaxed mb-8 flex-1 line-clamp-3">
                  {topic.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-5 mt-auto pt-5 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
                    <Clock size={14} className="text-white/35" /> {topic.estimatedMinutes} MIN
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
                    <Brain size={14} className="text-white/35" /> {topic.concepts.length} CONCEPTS
                  </span>
                </div>
              </div>

              {/* Hover arrow */}
              <div className="absolute top-6 right-6 md:top-7 md:right-7
                              opacity-0 -translate-x-3
                              group-hover:opacity-100 group-hover:translate-x-0
                              transition-all duration-250">
                <div className="w-9 h-9 rounded-full bg-accent-yellow
                                flex items-center justify-center text-black shadow-lg">
                  <ChevronRight size={18} strokeWidth={3} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
