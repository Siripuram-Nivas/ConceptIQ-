import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, BrainCircuit, Zap, Presentation, AlertTriangle, MoreVertical, Trash2 } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';
import { useSessionStore } from '../store/session-store';
import { DemoModeIndicator } from '../components/DemoModeIndicator';

export function MaterialOverviewPage() {
  const navigate = useNavigate();
  const { materialId } = useParams<{ materialId: string }>();
  const { getMaterialById, deleteConcept } = useStudySpaceStore();
  const currentMaterial = materialId ? getMaterialById(materialId) : null;
  const { startSession } = useSessionStore();
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteMenuFor, setShowDeleteMenuFor] = useState<string | null>(null);
  const [conceptToDelete, setConceptToDelete] = useState<string | null>(null);

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
    const topicId = currentMaterial.id;
    startSession(topicId);
    navigate(`/teach-material/${currentMaterial.id}${concept ? `?concept=${encodeURIComponent(concept)}` : ''}`);
  };

  const handleDeleteMaterial = () => {
    if (!currentMaterial) return;
    const spaceId = currentMaterial.studySpaceId;
    useStudySpaceStore.getState().deleteMaterial(currentMaterial.id);
    navigate(`/space/${spaceId}`);
  };

  const handleConfirmDeleteConcept = () => {
    if (!currentMaterial || !conceptToDelete) return;
    
    // Find the canonical concept ID to delete
    const conceptObj = processedContent?.concepts.find(c => c.name === conceptToDelete);
    if (conceptObj) {
      deleteConcept(conceptObj.id, currentMaterial.id);
    }
    
    setConceptToDelete(null);
    if (selectedConcept === conceptToDelete) {
      setSelectedConcept(null);
    }
  };

  // Check if there are no concepts left
  const hasConcepts = processedContent && processedContent.concepts.length > 0;

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

        {/* Title, badge & Summary */}
        <div className="mb-16 relative">
          <div className="flex justify-between items-start mb-4">
            {/* Format badge */}
            <div className="flex flex-wrap items-center gap-3">
              {currentMaterial.type === 'pptx' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-yellow/20 border border-accent-yellow/40 rounded text-xs font-bold text-accent-yellow uppercase tracking-wide">
                  <Presentation size={11} /> PowerPoint
                </span>
              )}
              {currentMaterial.type === 'pptx' && currentMaterial.slideCount !== undefined && (
                <span className="px-3 py-1 bg-surface rounded text-xs font-bold text-fg/70 uppercase tracking-wide">
                  {currentMaterial.slideCount} Slides
                </span>
              )}
              <span className="px-3 py-1 bg-surface rounded text-xs font-bold text-fg/70 uppercase tracking-wide">
                {processedContent.concepts.length} Concepts
              </span>
            </div>

            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-bold uppercase tracking-wide text-red-500 hover:text-red-400 transition-colors"
            >
              Delete Material
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-surface border-4 border-fg p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-4">Delete Material?</h3>
                <p className="text-fg/80 font-medium mb-8">This action cannot be undone. This material and all its extracted concepts will be removed from this study space.</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 border-2 border-fg font-bold uppercase tracking-wider hover:bg-black/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteMaterial}
                    className="flex-1 px-4 py-3 bg-red-500 text-white font-bold uppercase tracking-wider border-2 border-fg hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {conceptToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-surface border-4 border-fg p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-4">Delete "{conceptToDelete}"?</h3>
                <div className="text-fg/80 font-medium mb-8 space-y-4">
                  <p>This removes the concept from your ConceptIQ Knowledge Map.</p>
                  <p className="text-accent-purple font-bold">Your original study material will NOT be deleted.</p>
                  <p>Your learning history will be preserved where possible.</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setConceptToDelete(null)}
                    className="flex-1 px-4 py-3 border-2 border-fg font-bold uppercase tracking-wider hover:bg-black/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeleteConcept}
                    className="flex-1 px-4 py-3 bg-red-500 text-white font-bold uppercase tracking-wider border-2 border-fg hover:bg-red-600"
                  >
                    Delete Concept
                  </button>
                </div>
              </div>
            </div>
          )}

          <h1 className="font-display text-display-lg text-fg leading-none mb-8">
            {processedContent.title}
          </h1>

          {/* PPTX warnings */}
          {currentMaterial.type === 'pptx' && currentMaterial.pptxWarnings && currentMaterial.pptxWarnings.length > 0 && (
            <div className="mb-6 p-4 bg-accent-yellow/10 border border-accent-yellow/30 rounded flex gap-3">
              <AlertTriangle size={16} className="text-accent-yellow flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-accent-yellow uppercase tracking-wide mb-1">Processing Notes</p>
                <ul className="space-y-1">
                  {currentMaterial.pptxWarnings.map((w, i) => (
                    <li key={i} className="text-xs text-fg/70 font-medium">{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

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
          
          {!hasConcepts ? (
            <div className="border border-dashed border-fg/20 p-12 text-center rounded">
              <h3 className="font-display text-2xl font-bold uppercase mb-2">NO ACTIVE CONCEPTS</h3>
              <p className="text-muted mb-6">Your study material is still available.</p>
              <button 
                onClick={() => navigate(`/space/${currentMaterial.studySpaceId}`)}
                className="editorial-btn-primary"
              >
                RETURN TO SPACE
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {processedContent.concepts.map((concept) => (
                  <button
                  key={concept.name}
                onClick={() => setSelectedConcept(selectedConcept === concept.name ? null : concept.name)}
                className={`px-4 py-2 border-2 border-fg font-bold text-sm transition-all hover:-translate-y-0.5 hover:shadow-glass ${selectedConcept === concept.name
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
            <div className="mt-8 p-6 lg:p-8 border-4 border-fg bg-accent-pink shadow-glass relative">
              {processedContent.concepts
                .filter((c) => c.name === selectedConcept)
                .map((concept) => (
                  <div key={concept.name}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-display text-3xl font-bold text-fg pr-8">{concept.name}</h3>
                      
                      {/* Concept Action Menu */}
                      <div className="relative">
                        <button 
                          onClick={() => setShowDeleteMenuFor(showDeleteMenuFor === concept.name ? null : concept.name)}
                          className="p-2 hover:bg-black/10 rounded-full transition-colors"
                        >
                          <MoreVertical size={20} className="text-fg" />
                        </button>
                        
                        {showDeleteMenuFor === concept.name && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowDeleteMenuFor(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-surface border-2 border-fg shadow-glass z-20 overflow-hidden">
                              <button 
                                onClick={() => {
                                  setShowDeleteMenuFor(null);
                                  handleStartTeachBack(concept.name);
                                }}
                                className="w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-black/5 transition-colors border-b border-fg/10 flex items-center gap-2"
                              >
                                <BrainCircuit size={16} /> TeachBack
                              </button>
                              <button 
                                onClick={() => {
                                  setShowDeleteMenuFor(null);
                                  setConceptToDelete(concept.name);
                                }}
                                className="w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={16} /> Delete Concept
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
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
            </>
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
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">
              {currentMaterial.type === 'pptx' ? 'Slide Sources' : 'Source References'}
            </h2>
            <div className="space-y-4 border-t border-border pt-8">
              {processedContent.sourceReferences.map((ref) => (
                <div key={ref.id} className="flex gap-4">
                  {currentMaterial.type === 'pptx'
                    ? <Presentation size={24} className="text-accent-yellow flex-shrink-0" />
                    : <BookOpen size={24} className="text-accent-purple flex-shrink-0" />
                  }
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
