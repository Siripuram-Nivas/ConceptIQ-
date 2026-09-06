import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] md:w-[calc(100%-48px)] max-w-[1100px] bg-white/[0.06] backdrop-blur-[20px] border border-white/[0.14] shadow-[0_12px_40px_rgba(0,0,0,0.20)] rounded-[18px]">
      <div className="px-5 md:px-6 h-16 flex items-center justify-between gap-6">

        <Link
          to="/"
          className="font-display font-bold text-sm md:text-base uppercase tracking-widest text-fg shrink-0 hover:text-accent-yellow transition-colors"
          aria-label="ConceptIQ — go to home page"
        >
          CONCEPTIQ
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          <a
            href="#how-it-works"
            className="text-[13px] font-bold uppercase tracking-wide text-fg/75 hover:text-fg hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
          >
            How It Works
          </a>
          <a
            href="#evidence"
            className="text-[13px] font-bold uppercase tracking-wide text-fg/75 hover:text-fg hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
          >
            Evidence
          </a>
          <a
            href="#knowledge-map"
            className="text-[13px] font-bold uppercase tracking-wide text-fg/75 hover:text-fg hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
          >
            Knowledge Map
          </a>
          <Link
            to="/demo"
            className="text-[13px] font-bold uppercase tracking-wide text-fg/75 hover:text-fg hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
          >
            Demo
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/login"
            className="text-[13px] font-bold uppercase tracking-wide text-fg hover:text-accent-yellow transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center font-bold px-[18px] py-[12px] bg-accent-yellow text-black text-[13px] uppercase tracking-wide rounded-[10px] hover:bg-[#ffe07a] hover:-translate-y-[1px] transition-all"
          >
            START LEARNING <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-3">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center font-bold px-4 py-2 bg-accent-yellow text-black text-xs uppercase tracking-wide rounded-lg hover:bg-[#ffe07a] transition-colors"
          >
            START <ArrowRight size={14} className="ml-1" />
          </Link>
          <button
            onClick={() => setOpen(v => !v)}
            className="p-2 text-fg hover:text-accent-yellow transition-colors bg-transparent border-none"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav
          id="mobile-nav"
          className="md:hidden absolute top-[calc(100%+8px)] left-0 w-full bg-[#0D1220]/95 backdrop-blur-xl border border-white/10 rounded-[18px] shadow-2xl p-2 animate-slide-up overflow-hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col">
            <a
              href="#how-it-works"
              onClick={() => setOpen(false)}
              className="px-4 py-4 text-sm font-bold uppercase tracking-wide text-fg/80 hover:text-fg hover:bg-white/5 rounded-xl transition-colors"
            >
              How It Works
            </a>
            <a
              href="#evidence"
              onClick={() => setOpen(false)}
              className="px-4 py-4 text-sm font-bold uppercase tracking-wide text-fg/80 hover:text-fg hover:bg-white/5 rounded-xl transition-colors"
            >
              Evidence
            </a>
            <a
              href="#knowledge-map"
              onClick={() => setOpen(false)}
              className="px-4 py-4 text-sm font-bold uppercase tracking-wide text-fg/80 hover:text-fg hover:bg-white/5 rounded-xl transition-colors"
            >
              Knowledge Map
            </a>
            <Link
              to="/demo"
              onClick={() => setOpen(false)}
              className="px-4 py-4 text-sm font-bold uppercase tracking-wide text-fg/80 hover:text-fg hover:bg-white/5 rounded-xl transition-colors"
            >
              Demo
            </Link>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="px-4 py-4 border-t border-white/10 mt-2 text-sm font-bold uppercase tracking-wide text-accent-yellow hover:text-accent-yellow/80 transition-colors"
            >
              Log in
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
