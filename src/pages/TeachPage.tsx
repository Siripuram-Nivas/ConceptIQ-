import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TeachBackRecorder } from '../components/TeachBackRecorder';
import { useSessionStore } from '../store/session-store';
import { ALL_TOPICS } from '../data/topics';
import { isDemoMode } from '../ai';

export function TeachPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { startSession, submitExplanation, updateExplanationDraft, session } = useSessionStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topic = ALL_TOPICS.find((t) => t.slug === slug);

  useEffect(() => {
    if (topic && (!session || session.topicId !== topic.id)) {
      startSession(topic.id);
    }
  }, [topic, session, startSession]);

  if (!topic) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-muted">Topic not found.</p>
          <Link to="/learn" className="text-ai underline mt-2 block">Return to topics →</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (text: string) => {
    setIsSubmitting(true);
    try {
      await submitExplanation(text);
      navigate('/analysis');
    } catch (error) {
      console.error('Failed to submit explanation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1000px] mx-auto px-5 lg:px-10 pt-10 pb-32">
        <Link
          to={`/learn/${topic.slug}`}
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:translate-x-1 hover:text-accent-purple transition-all mb-12"
        >
          <ArrowLeft size={16} /> Back to material
        </Link>

        <div className="mb-12">
          <h1 className="font-display text-display-xl text-fg leading-none mb-6">
            EXPLAIN IT LIKE YOU'RE <br />
            <span className="text-accent-yellow">TEACHING SOMEONE.</span>
          </h1>
          <div className="border-l-4 border-fg pl-6 py-2 mb-8">
            <p className="text-sm font-bold uppercase tracking-wider text-muted mb-1">Concept</p>
            <h2 className="text-3xl font-display font-bold text-fg">{topic.title}</h2>
            <p className="text-sm font-medium text-fg/60 mt-2">Subject: {topic.subject}</p>
          </div>
          <p className="text-xl font-medium text-fg max-w-2xl leading-relaxed">
            Explain this concept in your own words. Include what it means, how it works, and why it matters. Don't look at your notes.
          </p>
        </div>

        <div className="mb-16">
          <TeachBackRecorder
            initialValue={session?.explanation || ''}
            onChange={updateExplanationDraft}
            onSubmit={handleSubmit}
            disabled={isSubmitting}
            placeholder={`Type your explanation for ${topic.title} here...`}
            demoText={isDemoMode() ? "TCP is a core internet protocol that makes sure data gets from point A to point B reliably. It breaks data into packets, sends them, and waits for an acknowledgment. If a packet is lost, TCP resends it. This guarantees that files aren't corrupted during transfer, unlike UDP which just fires data and forgets about it." : undefined}
          />
        </div>
      </div>
    </div>
  );
}
