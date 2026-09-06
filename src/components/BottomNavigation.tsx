import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Map, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/learn', icon: BookOpen, label: 'Learn' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNavigation() {
  const location = useLocation();
  // Hide nav during active learning flow and material teaching
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-6"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      aria-label="Main navigation"
    >
      <div className="max-w-[320px] mx-auto pointer-events-auto">
        <div className="glass-panel flex p-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
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
  );
}
