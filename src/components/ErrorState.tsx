import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
  onFallback?: () => void;
  fallbackLabel?: string;
}

export function ErrorState({ message, onRetry, onFallback, fallbackLabel }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 px-4 text-center" role="alert">
      <div className="w-12 h-12 rounded-full bg-warning-light flex items-center justify-center">
        <AlertCircle size={24} className="text-warning" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-fg">Something went wrong</p>
        <p className="text-sm text-muted">{message}</p>
      </div>
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-fg hover:bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai min-h-[44px]"
          >
            <RefreshCw size={14} /> Try again
          </button>
        )}
        {onFallback && (
          <button
            onClick={onFallback}
            className="px-4 py-2 rounded-xl bg-fg text-bg text-sm font-medium hover:bg-fg/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai min-h-[44px]"
          >
            {fallbackLabel ?? 'Use Demo Mode'}
          </button>
        )}
      </div>
    </div>
  );
}
