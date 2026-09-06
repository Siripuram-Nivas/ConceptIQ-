import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';

const SUBJECT_CHIPS = [
  'Engineering',
  'Computer Science',
  'Science',
  'Medicine',
  'Business',
  'Forensics',
  'Other',
];

export function OnboardingPage() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [chip, setChip] = useState<string | null>(null);

  // If already onboarded, go straight to home
  if (user?.onboardingComplete) {
    navigate('/home', { replace: true });
    return null;
  }

  const handleStart = () => {
    const hint = chip ?? (subject.trim() || undefined);
    completeOnboarding(hint);
    navigate('/add-material');
  };

  const handleSkip = () => {
    completeOnboarding(undefined);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[700px] mx-auto px-5 pt-16 pb-32">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-16">
          <Link
            to="/"
            className="font-display font-bold text-lg uppercase tracking-tight text-fg hover:text-accent-purple transition-colors"
            aria-label="ConceptIQ home"
          >
            CONCEPTIQ
          </Link>
          <button
            onClick={handleSkip}
            className="text-sm font-bold uppercase tracking-wide text-muted hover:text-fg transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* Welcome */}
        {user?.name && (
          <p className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
            Welcome, {user.name}
          </p>
        )}

        <h1
          className="font-display font-black text-fg leading-none mb-6"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: '0.95', letterSpacing: '-0.03em' }}
        >
          LET'S START<br />WITH SOMETHING<br />YOU'RE LEARNING.
        </h1>
        <p className="text-base font-medium text-muted max-w-lg leading-relaxed mb-16 border-l-4 border-fg pl-6">
          Tell us what you're studying so ConceptIQ can help you focus. This is optional.
        </p>

        {/* Free text input */}
        <div className="mb-8">
          <label
            htmlFor="subject-input"
            className="block text-xs font-bold uppercase tracking-widest text-muted mb-3"
          >
            What are you studying?
          </label>
          <input
            id="subject-input"
            type="text"
            value={subject}
            onChange={e => { setSubject(e.target.value); setChip(null); }}
            placeholder="e.g. Computer Networks, Organic Chemistry, Criminal Law…"
            className="w-full glass-panel px-5 py-4 text-base font-medium text-fg placeholder-muted focus:outline-none focus:ring-2 focus:ring-fg focus:ring-offset-2"
          />
        </div>

        {/* Subject chips */}
        <div className="mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
            Or choose a subject area
          </p>
          <div
            className="flex flex-wrap gap-3"
            role="group"
            aria-label="Subject area options"
          >
            {SUBJECT_CHIPS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { setChip(s); setSubject(''); }}
                aria-pressed={chip === s}
                className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-fg transition-colors focus:outline-none focus:ring-2 focus:ring-fg focus:ring-offset-2 ${
                  chip === s
                    ? 'bg-fg text-bg'
                    : 'bg-surface text-fg hover:bg-fg/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={handleStart}
            className="editorial-btn-primary text-base flex-1 justify-center gap-3"
          >
            BRING YOUR MATERIAL
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <Link
            to="/demo"
            className="editorial-btn-outline text-base flex-1 justify-center"
          >
            EXPLORE DEMO
          </Link>
        </div>

      </div>
    </div>
  );
}
