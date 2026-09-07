import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Map, User, Search, Library } from 'lucide-react';
import { ReactNode } from 'react';

const NAV_ITEMS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/learn', icon: BookOpen, label: 'Learn' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/study-spaces', icon: Library, label: 'Spaces' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function GlobalNavigation() {
  const location = useLocation();
  // Hide nav during active learning flows and unauthenticated/landing pages
  const hidePrefixes = [
    '/teach',
    '/teach-material',
    '/analysis',
    '/repair',
    '/mastery',
  ];
  const exactHides = [
    '/',
    '/login',
    '/signup',
    '/onboarding',
    '/demo'
  ];
  
  const hide = hidePrefixes.some((p) => location.pathname.startsWith(p)) || 
               exactHides.includes(location.pathname);

  if (hide) return null;

  return (
    <>
      {/* ── DESKTOP NAVIGATION (Visible >= md / 768px) ── */}
      <header className="hidden md:flex w-full sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="w-full max-w-[1440px] mx-auto px-6 xl:px-10 h-16 flex items-center justify-between gap-8">
          {/* Brand */}
          <Link
            to="/home"
            className="font-display font-black text-xl xl:text-2xl uppercase tracking-tighter text-white hover:text-accent-yellow transition-colors shrink-0"
          >
            CONCEPTIQ
          </Link>

          {/* Primary nav */}
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors rounded-lg ${
                    active
                      ? 'text-accent-yellow bg-accent-yellow/[0.08]'
                      : 'text-white/55 hover:text-white hover:bg-white/[0.05]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-accent-yellow rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            <Link
              to="/profile"
              className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.15] flex items-center justify-center hover:bg-white/[0.15] hover:border-white/30 transition-all"
              aria-label="Profile"
            >
              <User size={16} className="text-white" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── MOBILE / TABLET NAVIGATION (Visible < md / <768px) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        aria-label="Mobile main navigation"
      >
        <div className="max-w-[420px] mx-auto pointer-events-auto px-4">
          <div className="glass-panel flex p-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors rounded-[16px] ${
                    active
                      ? 'bg-surface-strong text-fg shadow-[inset_0_2px_0_0_#FFD24A]'
                      : 'text-muted hover:bg-surface-light hover:text-fg'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} className={active ? 'text-accent-yellow' : ''} />
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}

// ── AppShell ──
// Wraps authenticated pages to ensure they share the global navigation 
// and maintain a consistent maximum width and responsive padding.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100svh] flex flex-col bg-bg">
      <GlobalNavigation />
      {/*
        Mobile (<md): pb-28 reserves space for the fixed bottom dock.
        Desktop (>=md): pb-10 is just comfortable breathing room at the bottom.
      */}
      <main className="flex-1 w-full flex flex-col pb-28 md:pb-10">
        {children}
      </main>
    </div>
  );
}
