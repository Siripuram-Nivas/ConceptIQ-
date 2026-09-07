import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5 text-center">
      <div className="space-y-6 max-w-md">
        <p className="text-9xl font-display font-black text-white/[0.04] select-none">404</p>
        <div className="-mt-8">
          <h1 className="font-display text-display-lg font-bold text-fg mb-3">Page not found.</h1>
          <p className="text-muted text-base">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <button
          onClick={() => navigate('/home')}
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-fg border border-border rounded-full px-6 py-3 hover:bg-white/[0.05] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
      </div>
    </div>
  );
}
