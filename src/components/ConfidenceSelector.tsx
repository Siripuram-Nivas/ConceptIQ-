interface Props {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}

const LABELS = ['', 'Guessing', 'Unsure', 'Somewhat confident', 'Confident', 'Very confident'];

export function ConfidenceSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-fg/80">How confident are you in this answer?</p>
      <div className="flex gap-2" role="group" aria-label="Confidence rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            disabled={disabled}
            aria-pressed={value === n}
            aria-label={`${n} — ${LABELS[n]}`}
            className={`flex-1 min-h-[44px] rounded-lg border-2 font-semibold text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai ${
              value === n
                ? 'border-fg bg-fg text-bg'
                : 'border-border bg-surface text-fg hover:border-fg/40 hover:bg-surface-hover'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {n}
          </button>
        ))}
      </div>
      {value !== null && value !== undefined && (
        <p className="text-xs text-muted animate-fade-in">{LABELS[value ?? 0]}</p>
      )}
    </div>
  );
}
