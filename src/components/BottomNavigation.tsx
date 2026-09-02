import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Map, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/learn', icon: BookOpen, label: 'Learn' },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNavigation() {
  const location = useLocation();
  // Hide nav during active learning flow and material teaching
  const hide = [
    '/teach',
    '/teach-material',
    '/analysis',
    '/repair',
    '/mastery',
  ].some((p) => location.pathname.startsWith(p));

  if (hide) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-sm border-t border-border z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      <div className="flex max-w-lg mx-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai ${
                active ? 'text-fg' : 'text-muted hover:text-fg/70'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
