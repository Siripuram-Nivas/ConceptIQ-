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
    <div className="w-full flex-1 flex flex-col">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 pt-8 pb-32 w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors mb-8 min-h-[44px] -ml-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mb-12 border-b border-white/[0.05] pb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-purple mb-2">{topic.subject}</p>
          <h1 className="font-display font-black text-[3rem] md:text-[5rem] uppercase tracking-tighter leading-[0.9] text-white mb-6">{topic.title}</h1>
          <p className="text-lg md:text-xl font-medium text-white/70 max-w-3xl leading-relaxed border-l-2 border-accent-purple/50 pl-4">
            {topic.referenceContent.summary}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {topic.referenceContent.diagram && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={16} className="text-white/40" />
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">Reference Diagram</p>
                </div>
                <pre className="p-6 rounded-[16px] bg-white/[0.02] border border-white/[0.08] text-sm font-mono text-white/70 overflow-x-auto whitespace-pre">
                  {topic.referenceContent.diagram}
                </pre>
              </div>
            )}

            <div className="mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-6">Key Concepts</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topic.referenceContent.keyConcepts.map((c) => (
                  <div key={c.name} className="p-6 rounded-[16px] border border-white/[0.05] bg-white/[0.01]">
                    <p className="font-bold text-base uppercase tracking-wide text-white mb-2">{c.name}</p>
                    <p className="text-sm text-white/60 leading-relaxed mb-4">{c.definition}</p>
                    {c.relationships && c.relationships.length > 0 && (
                      <ul className="space-y-1 border-t border-white/[0.05] pt-4 mt-auto">
                        {c.relationships.map((r, i) => (
                          <li key={i} className="text-xs font-medium text-white/40">· {r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar Action */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-24 p-8 rounded-[16px] border border-white/[0.05] bg-white/[0.01] flex flex-col gap-6">
              <div>
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter text-white mb-2">Ready to Explain?</h3>
                <p className="text-sm text-white/50">Teach the AI what you've learned. It will challenge your understanding.</p>
              </div>
              <Link
                to={`/teach/${topic.slug}`}
                className="editorial-btn-accent w-full flex items-center justify-between group"
              >
                <span>TEACH THE AI</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
