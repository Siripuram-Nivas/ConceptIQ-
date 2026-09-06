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
      {/* ── DESKTOP NAVIGATION (Visible >= lg) ── */}
      <header className="hidden lg:flex w-full sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="w-full max-w-[1440px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link to="/home" className="font-display font-black text-2xl uppercase tracking-tighter text-white hover:text-accent-yellow transition-colors">
              CONCEPTIQ
            </Link>
            
            <nav className="flex items-center gap-8">
              {NAV_ITEMS.map(({ to, label }) => {
                const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${
                      active ? 'text-accent-yellow' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-white/60 hover:text-white transition-colors" aria-label="Search">
              <Search size={20} />
            </button>
            <Link to="/profile" className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
              <User size={18} className="text-white" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── MOBILE NAVIGATION (Visible < lg) ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        aria-label="Mobile main navigation"
      >
        <div className="max-w-[400px] mx-auto pointer-events-auto px-4">
          <div className="glass-panel flex p-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              // On mobile, spaces might crowd the dock, but we'll include it for parity
              const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors rounded-[16px] ${
                    active ? 'bg-surface-strong text-fg shadow-[inset_0_2px_0_0_#FFD24A]' : 'text-muted hover:bg-surface-light hover:text-fg'
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
      {/* On desktop, we want a max-width and margin-auto. On mobile, we need bottom padding for the dock. */}
      <main className="flex-1 w-full flex flex-col pb-32 lg:pb-12">
        {children}
      </main>
    </div>
  );
}
