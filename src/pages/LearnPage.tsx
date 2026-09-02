import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Brain } from 'lucide-react';
import { ALL_TOPICS } from '../data/topics';

export function LearnPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-32">
        <div className="mb-8">
          <h1 className="font-display font-bold text-display-lg text-fg">Choose a Concept</h1>
          <p className="text-muted mt-1">Select a topic to teach the AI.</p>
        </div>

        <div className="space-y-3">
          {ALL_TOPICS.map((topic) => (
            <Link
              key={topic.id}
              to={`/learn/${topic.slug}`}
              className="block w-full rounded-2xl border border-border bg-surface hover:bg-surface-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{topic.subject}</p>
                  <h2 className="font-display font-semibold text-display-sm text-fg">{topic.title}</h2>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{topic.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <Clock size={12} /> {topic.estimatedMinutes} min
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <Brain size={12} /> {topic.concepts.length} concepts
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      topic.difficulty === 'beginner' ? 'bg-success-light text-success' :
                      topic.difficulty === 'intermediate' ? 'bg-accent/20 text-fg/70' :
                      'bg-ai-light text-ai'
                    }`}>
                      {topic.difficulty}
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
