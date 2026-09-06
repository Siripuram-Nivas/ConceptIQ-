import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface NavbarHeroProps {
  brandName?: string;
}

const NavbarHero: React.FC<NavbarHeroProps> = ({
  brandName = "ConceptIQ",
}) => {
  return (
    <div className="relative w-full min-h-screen flex flex-col overflow-hidden bg-bg">
      {/* Deep atmospheric environment */}
      <div className="atmospheric-bg">
        <div className="atmospheric-glow-purple" />
        <div className="atmospheric-glow-blue" />
        <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full mix-blend-screen opacity-10 blur-[100px] bg-[radial-gradient(circle,_theme('colors.accent.yellow')_0%,_transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col flex-grow">
        {/* --- Floating Glass Navbar --- */}
        <div className="py-4 px-6 md:px-10 mt-4 relative z-20 flex items-center justify-between gap-4 glass-panel rounded-[24px]">
          <Link to="/" className="font-display font-black text-2xl uppercase tracking-tighter text-fg hover:text-accent-purple transition-colors">
            {brandName}
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-muted">
            <span className="hover:text-fg cursor-pointer transition-colors">Learn</span>
            <span className="hover:text-fg cursor-pointer transition-colors">Materials</span>
            <span className="hover:text-fg cursor-pointer transition-colors">Map</span>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/login" className="text-muted hover:text-fg cursor-pointer text-xs md:text-sm font-bold tracking-widest uppercase transition-colors">
              Log In
            </Link>
            <Link to="/signup" className="editorial-btn-primary px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm">
              Start
            </Link>
          </div>
        </div>

        {/* --- Hero Section --- */}
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center pt-16 pb-20 px-4 md:px-12">
          {/* Left: Statement */}
          <div className="flex flex-col items-start z-10">
            <h1 className="text-[3.5rem] sm:text-7xl md:text-[5.5rem] lg:text-[7rem] font-display font-black uppercase tracking-tighter leading-[0.85] text-fg drop-shadow-2xl mb-8">
              DON'T JUST<br />
              READ IT.<br />
              <span className="text-accent-yellow">EXPLAIN IT.</span>
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl font-medium text-muted max-w-xl leading-relaxed mb-12 border-l-[3px] border-border pl-6">
              ConceptIQ turns your study material into a living knowledge system — then tests whether you actually understand it.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
              <Link 
                to="/signup" 
                className="editorial-btn-primary w-full sm:w-auto text-lg md:text-xl py-4 px-8"
              >
                START LEARNING <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                to="/demo" 
                className="editorial-btn-outline w-full sm:w-auto text-lg md:text-xl py-4 px-8 border-none bg-surface/40 hover:bg-surface/80"
              >
                TRY THE DEMO
              </Link>
            </div>
          </div>

          {/* Right: Glass Product Preview */}
          <div className="relative z-10 w-full max-w-md mx-auto lg:ml-auto lg:mr-0">
            {/* Glow behind the panel */}
            <div className="absolute inset-0 bg-accent-purple/20 blur-[60px] rounded-full mix-blend-screen transform scale-90 translate-y-4" />
            
            <div className="glass-strong p-8 relative flex flex-col gap-6">
              <div className="border-b border-border pb-4">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter text-fg mb-1">
                  TCP THREE-WAY HANDSHAKE
                </h3>
                <p className="text-xs font-bold text-muted uppercase tracking-widest">
                  SYN → SYN-ACK → ACK
                </p>
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-[10px] font-bold text-success uppercase tracking-widest flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} /> DEMONSTRATED
                  </p>
                  <p className="text-sm font-medium text-fg/90 pl-6">packet sequence</p>
                </div>
                
                <div>
                  <p className="text-[10px] font-bold text-warning uppercase tracking-widest flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} /> MISSING
                  </p>
                  <p className="text-sm font-medium text-fg/90 pl-6">purpose of final ACK</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="bg-accent-pink/20 border border-accent-pink/30 rounded-xl p-4 text-center">
                  <p className="text-xs font-bold text-accent-pink uppercase tracking-widest">
                    POTENTIAL GAP IDENTIFIED
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export { NavbarHero };
