import { FlaskConical } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export function DemoModeIndicator({ compact = false }: Props) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-fg border border-accent/40">
        <FlaskConical size={10} />
        DEMO
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30">
      <FlaskConical size={14} className="text-fg/70" />
      <span className="text-xs font-semibold tracking-wide text-fg/80">DEMO MODE</span>
    </div>
  );
}
