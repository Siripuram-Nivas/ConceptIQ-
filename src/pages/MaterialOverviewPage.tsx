import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Zap } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';
import { useSessionStore } from '../store/session-store';
import { DemoModeIndicator } from '../components/DemoModeIndicator';

export function MaterialOverviewPage() {
  const navigate = useNavigate();
  const { materialId } = useParams<{ materialId: string }>();
  const { getMaterialById } = useStudySpaceStore();
  const currentMaterial = materialId ? getMaterialById(materialId) : null;
  const { startSession } = useSessionStore();
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);

  if (!currentMaterial) {
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

  const { processedContent, processingStatus, isDemoMode } = currentMaterial;

  if (processingStatus === 'processing') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ai/10 mb-4">
            <Zap size={24} className="text-ai animate-pulse" />
          </div>
          <h2 className="font-display font-bold text-display-md text-fg">Analyzing Material...</h2>
          <p className="text-muted text-sm">Extracting concepts, relationships, and learning path</p>
          {isDemoMode && <DemoModeIndicator />}
        </div>
      </div>
    );
  }

  if (!processedContent) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-muted">Processing failed. Please try again.</p>
          <button
            onClick={() => navigate('/add-material')}
            className="text-ai underline mt-2 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            Upload new material →
          </button>
        </div>
      </div>
    );
  }

  const handleStartTeachBack = (concept?: string) => {
    // Create a virtual topic from the material + concept
    const topicId = currentMaterial.id;
    startSession(topicId);
    navigate(`/teach-material/${currentMaterial.id}${concept ? `?concept=${encodeURIComponent(concept)}` : ''}`);
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

        {isDemoMode && (
          <div className="mb-8">
            <span className="inline-block px-3 py-1 bg-accent-yellow text-fg text-xs font-bold uppercase tracking-wider">Demo Material</span>
          </div>
        )}

        {/* Title & Summary */}
        <div className="mb-16">
          <h1 className="font-display text-display-lg text-fg leading-none mb-8">
            {processedContent.title}
          </h1>
          <div className="border-l-4 border-fg pl-6 py-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Summary</h2>
            <p className="text-xl font-medium text-fg/80 leading-relaxed max-w-3xl">
              {processedContent.summary}
            </p>
          </div>
        </div>

        {/* Concepts (What's Inside) */}
        <div className="mb-16">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">What's Inside</h2>
          <div className="flex flex-wrap gap-3">
            {processedContent.concepts.map((concept) => (
              <button
                key={concept.name}
                onClick={() => setSelectedConcept(selectedConcept === concept.name ? null : concept.name)}
                className={`px-4 py-2 border-2 border-fg font-bold text-sm transition-all hover:-translate-y-0.5 hover:shadow-editorial ${selectedConcept === concept.name
                    ? 'bg-accent-blue text-bg border-accent-blue'
                    : 'bg-surface text-fg'
                  }`}
              >
                {concept.name}
              </button>
            ))}
          </div>

          {/* Detailed View for Selected Concept */}
          {selectedConcept && (
            <div className="mt-8 p-6 lg:p-8 border-4 border-fg bg-accent-pink shadow-editorial">
              {processedContent.concepts
                .filter((c) => c.name === selectedConcept)
                .map((concept) => (
                  <div key={concept.name}>
                    <h3 className="font-display text-3xl font-bold text-fg mb-4">{concept.name}</h3>
                    <p className="text-lg font-medium text-fg/90 mb-6">{concept.definition}</p>

                    {concept.keyPoints.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-fg/60 uppercase tracking-wider mb-2">Key Points</p>
                        <ul className="space-y-2">
                          {concept.keyPoints.map((point, i) => (
                            <li key={i} className="flex gap-3 text-fg font-medium">
                              <span className="font-bold text-fg/50">0{i + 1}</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Key Terms */}
        {processedContent.keyTerms.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">Key Ideas</h2>
            <div className="space-y-4">
              {processedContent.keyTerms.map((term, i) => (
                <div key={term.term} className="editorial-card p-6 flex gap-6 items-start">
                  <span className="font-display text-4xl text-accent-yellow leading-none">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-bold text-xl text-fg mb-2">{term.term}</h3>
                    <p className="text-fg/80 font-medium leading-relaxed">{term.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source References */}
        {processedContent.sourceReferences.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">Source References</h2>
            <div className="space-y-4 border-t-2 border-fg pt-8">
              {processedContent.sourceReferences.map((ref) => (
                <div key={ref.id} className="flex gap-4">
                  <BookOpen size={24} className="text-accent-purple flex-shrink-0" />
                  <div>
                    <p className="font-bold text-fg mb-1">{ref.location}</p>
                    <p className="text-muted text-sm font-medium leading-relaxed max-w-2xl">{ref.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pt-10 border-t-4 border-fg">
          <h2 className="font-display text-4xl font-bold uppercase tracking-tight mb-8">Ready To Teach?</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => handleStartTeachBack(selectedConcept || undefined)}
              className="editorial-btn-primary text-xl"
            >
              {selectedConcept ? `Teach "${selectedConcept}"` : 'Teach A Concept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
