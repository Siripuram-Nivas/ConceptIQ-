import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { getTopicBySlug } from '../data/topics';

export function MaterialPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const topic = getTopicBySlug(slug ?? '');

  if (!topic) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-muted">Topic not found.</p>
          <Link to="/learn" className="text-ai underline mt-2 block">Back to topics</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors mb-8 min-h-[44px] -ml-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mb-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{topic.subject}</p>
          <h1 className="font-display font-bold text-display-lg text-fg">{topic.title}</h1>
          <p className="text-muted mt-2 leading-relaxed">{topic.referenceContent.summary}</p>
        </div>

        {topic.referenceContent.diagram && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-muted" />
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Reference Diagram</p>
            </div>
            <pre className="p-4 rounded-xl bg-surface border border-border text-xs font-mono text-fg/80 overflow-x-auto whitespace-pre">
              {topic.referenceContent.diagram}
            </pre>
          </div>
        )}

        <div className="mb-8">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Key Concepts</p>
          <div className="space-y-3">
            {topic.referenceContent.keyConcepts.map((c) => (
              <div key={c.name} className="p-4 rounded-xl border border-border bg-surface">
                <p className="font-semibold text-sm text-fg mb-1">{c.name}</p>
                <p className="text-sm text-muted leading-relaxed">{c.definition}</p>
                {c.relationships && c.relationships.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {c.relationships.map((r, i) => (
                      <li key={i} className="text-xs text-muted">· {r}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        <Link
          to={`/teach/${topic.slug}`}
          className="flex items-center justify-between w-full min-h-[60px] px-6 rounded-2xl bg-fg text-bg font-semibold text-base hover:bg-fg/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          <span>Teach the AI</span>
          <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  );
}
