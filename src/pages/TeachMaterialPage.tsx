import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';
import { useSessionStore } from '../store/session-store';
import { TeachBackRecorder } from '../components/TeachBackRecorder';

export function TeachMaterialPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getMaterialById } = useStudySpaceStore();
  const currentMaterial = materialId ? getMaterialById(materialId) : null;
  const { submitExplanation, updateExplanationDraft, session } = useSessionStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedConcept = searchParams.get('concept');

  useEffect(() => {
    if (!currentMaterial || currentMaterial.id !== materialId) {
      navigate('/add-material');
    }
  }, [materialId, currentMaterial, navigate]);

  if (!currentMaterial || !currentMaterial.processedContent) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-muted">Material not found.</p>
          <button
            onClick={() => navigate('/add-material')}
            className="text-ai underline mt-2 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            Upload material →
          </button>
        </div>
      </div>
    );
  }

  const { title: materialTitle, concepts } = currentMaterial.processedContent;
  const conceptToTeach = selectedConcept || concepts[0]?.name || 'Key Concept';

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
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:translate-x-1 hover:text-accent-purple transition-all mb-12"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mb-12">
          <h1 className="font-display text-display-xl text-fg leading-none mb-6">
            EXPLAIN IT LIKE YOU'RE <br />
            <span className="text-accent-yellow">TEACHING SOMEONE.</span>
          </h1>
          <div className="border-l-4 border-fg pl-6 py-2 mb-8">
            <p className="text-sm font-bold uppercase tracking-wider text-muted mb-1">Concept</p>
            <h2 className="text-3xl font-display font-bold text-fg">{conceptToTeach}</h2>
            <p className="text-sm font-medium text-fg/60 mt-2">From: {materialTitle}</p>
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
            placeholder={`Type your explanation for ${conceptToTeach} here...`}
          />
        </div>

        {concepts.length > 0 && (
          <div className="pt-8 border-t-2 border-fg">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Related Concepts to Mention</p>
            <div className="flex flex-wrap gap-2">
              {concepts.slice(0, 5).map((c) => (
                <span key={c.name} className="px-3 py-1.5 border-2 border-fg bg-surface text-fg font-bold text-xs uppercase transition-all hover:bg-fg hover:text-bg">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
