import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, Zap, Presentation, AlertTriangle, MoreVertical, Trash2, CheckCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';
import { useSessionStore } from '../store/session-store';
import { DemoModeIndicator } from '../components/DemoModeIndicator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

function CollapsibleSection({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-l-4 border-accent-purple pl-6 py-2 mb-8 bg-surface/50 rounded-r-lg">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-accent-purple mb-2 hover:opacity-80 transition-opacity"
      >
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {title}
      </button>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  );
}

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
          <h2 className="font-display font-bold text-display-md text-fg">Extracting Document Intelligence...</h2>
          <p className="text-muted text-sm max-w-md mx-auto">ConceptIQ is performing a deep semantic extraction of your document. This goes beyond simple search—we are building a full canonical outline, identifying key formulas, detecting missing context, and generating pedagogical recovery paths.</p>
          {isDemoMode && <DemoModeIndicator />}
        </div>
      </div>
    );
  }

  if (processingStatus === 'rate_limited') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-yellow/10 mb-4">
            <AlertTriangle size={24} className="text-accent-yellow animate-pulse" />
          </div>
          <h2 className="font-display font-bold text-display-md text-fg">AI Provider Rate Limited</h2>
          <p className="text-muted text-sm max-w-md mx-auto">Processing has hit an AI quota limit. ConceptIQ is automatically pacing requests and will resume when the quota refreshes. Your extraction progress is safely saved.</p>
        </div>
      </div>
    );
  }

  if (processingStatus === 'paused') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-strong mb-4">
            <Presentation size={24} className="text-muted" />
          </div>
          <h2 className="font-display font-bold text-display-md text-fg">Processing Paused</h2>
          <p className="text-muted text-sm max-w-md mx-auto">Extraction was paused to conserve API budgets or due to a browser tab change. You can resume processing later from the dashboard.</p>
        </div>
      </div>
    );
  }

  if (processingStatus === 'failed' || (!processedContent && processingStatus !== 'partial')) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <p className="text-muted">Document Intelligence extraction failed.</p>
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

  // We have processedContent (might be from a partial or successful run)
  if (!processedContent) return null; // Should not happen given above checks, but TypeScript needs it.

  const handleStartTeachBack = (concept?: string) => {
    const topicId = concept || currentMaterial.id;
    startSession(topicId, currentMaterial.id, currentMaterial.manifest?.materialVersion || 1);
    navigate(`/teach-material/${currentMaterial.id}${concept ? `?concept=${encodeURIComponent(concept)}` : ''}`);
  };

  const handleStartDocumentTeachBack = () => {
    const topicId = currentMaterial.id;
    startSession(topicId, currentMaterial.id, currentMaterial.manifest?.materialVersion || 1);
    navigate(`/teach-material/${currentMaterial.id}`);
  };

  const handleDeleteMaterial = () => {
    if (!currentMaterial) return;
    const spaceId = currentMaterial.studySpaceId;
    useStudySpaceStore.getState().deleteMaterial(currentMaterial.id);
    navigate(`/study-space/${spaceId}`);
  };

  const handleConfirmDeleteConcept = () => {
    if (!currentMaterial || !conceptToDelete) return;
    
    const conceptObj = processedContent?.concepts.find(c => c.name === conceptToDelete);
    if (conceptObj) {
      deleteConcept(conceptObj.id, currentMaterial.id);
    }
    
    setConceptToDelete(null);
    if (selectedConcept === conceptToDelete) {
      setSelectedConcept(null);
    }
  };

  const hasConcepts = processedContent && processedContent.concepts && processedContent.concepts.length > 0;
  const isComplete = processedContent.completenessAuditPassed;
  const outline = processedContent.documentOutline || [];
  const formulas = processedContent.formulas || [];
  const omissions = processedContent.omissions || [];

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

        {/* Header & Badges */}
        <div className="mb-12 relative">
          <div className="flex justify-between items-start mb-4">
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
              {processingStatus === 'partial' && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle size={12} /> Partial Extraction
                </span>
              )}
            </div>

            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-bold uppercase tracking-wide text-red-500 hover:text-red-400 transition-colors"
            >
              Delete Material
            </button>
          </div>

          <h1 className="font-display text-display-lg text-fg leading-none mb-4">
            {processedContent.title}
          </h1>

          {/* Document Coverage Status (§29) */}
          <div className={`p-4 rounded-lg flex items-start gap-4 mb-8 ${isComplete ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            {isComplete ? (
              <CheckCircle className="text-green-500 mt-1 flex-shrink-0" size={24} />
            ) : (
              <AlertTriangle className="text-red-500 mt-1 flex-shrink-0" size={24} />
            )}
            <div>
              <h3 className={`font-bold text-lg mb-1 ${isComplete ? 'text-green-500' : 'text-red-500'}`}>
                {isComplete ? 'Document Complete' : 'Incomplete Document Coverage'}
              </h3>
              <p className="text-sm text-fg/80 mb-2">
                {isComplete 
                  ? 'All major topics, subtopics, and formulas have been successfully extracted and verified against the canonical outline.'
                  : 'The AI could not confidently extract all required topics from this document. Teaching may be limited to recovered sections.'}
              </p>
              <div className="flex gap-4 text-xs font-bold text-fg/60 uppercase tracking-wide">
                <span>Topics: {outline.length}</span>
                <span>Formulas: {formulas.length}</span>
                <span>Omissions: {omissions.length}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleStartDocumentTeachBack}
              disabled={!isComplete && processingStatus === 'partial'}
              className={`editorial-btn-primary text-lg flex-1 ${(!isComplete && processingStatus === 'partial') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              TEACH ME THIS DOCUMENT
            </button>
          </div>
        </div>

        {/* Modals */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent className="bg-surface-strong border-border-strong sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl text-fg uppercase tracking-tight">
                Delete "{currentMaterial.title}"?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground leading-relaxed mt-2">
                This action cannot be undone. This material and all its extracted concepts will be removed from this study space.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-2">
              <AlertDialogCancel 
                onClick={() => setShowDeleteConfirm(false)}
                className="editorial-btn-outline h-10 px-4 py-2 hover:bg-surface-light rounded-md border-border-strong"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteMaterial}
                className="h-10 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md font-medium transition-colors"
              >
                Delete Material
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!conceptToDelete} onOpenChange={(open) => !open && setConceptToDelete(null)}>
          <AlertDialogContent className="bg-surface-strong border-border-strong sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl text-fg uppercase tracking-tight">
                Delete "{conceptToDelete}"?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground leading-relaxed mt-2 space-y-4">
                <p>This removes the concept from your ConceptIQ Knowledge Map.</p>
                <p className="font-bold">Your original study material will NOT be deleted.</p>
                <p>Your learning history will be preserved where possible.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-2">
              <AlertDialogCancel 
                onClick={() => setConceptToDelete(null)}
                className="editorial-btn-outline h-10 px-4 py-2 hover:bg-surface-light rounded-md border-border-strong"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDeleteConcept}
                className="h-10 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md font-medium transition-colors"
              >
                Delete Concept
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Primary Content Summaries */}
        <div className="mb-16 space-y-8">
          <div className="border-l-4 border-fg pl-6 py-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Summary</h2>
            <p className="text-xl font-medium text-fg/80 leading-relaxed max-w-3xl">
              {processedContent.summary}
            </p>
          </div>

          {processedContent.quickExplanation && (
            <div className="border-l-4 border-accent-blue pl-6 py-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-accent-blue mb-2">Quick Explanation</h2>
              <p className="text-lg font-medium text-fg/80 leading-relaxed max-w-3xl">
                {processedContent.quickExplanation}
              </p>
            </div>
          )}

          {processedContent.detailedExplanation && (
            <div className="border-l-4 border-fg pl-6 py-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Detailed Narrative</h2>
              <p className="text-lg font-medium text-fg/80 leading-relaxed max-w-3xl whitespace-pre-wrap">
                {processedContent.detailedExplanation}
              </p>
            </div>
          )}

          {processedContent.deepDive && (
            <CollapsibleSection title="Technical Deep Dive">
              <p className="text-lg font-medium text-fg/90 leading-relaxed max-w-3xl whitespace-pre-wrap">
                {processedContent.deepDive}
              </p>
            </CollapsibleSection>
          )}
        </div>

        {/* Document Outline (TOC) */}
        {outline.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6 flex items-center gap-3">
              <FileText className="text-fg" /> Document Contents
            </h2>
            <div className="bg-surface border-2 border-fg p-6 shadow-glass">
              <ul className="space-y-4">
                {outline.map((item, idx) => (
                  <li key={item.id} className="border-b border-fg/10 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-lg text-fg">{idx + 1}. {item.title}</span>
                      <span className="text-xs font-bold text-fg/50 uppercase">Sources: {item.sourceUnits.join(', ')}</span>
                    </div>
                    {item.subtopics && item.subtopics.length > 0 && (
                      <ul className="pl-6 list-disc text-sm text-fg/70 space-y-1 mt-2 marker:text-accent-blue">
                        {item.subtopics.map((sub, sidx) => (
                          <li key={sidx}>{sub}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Omissions & Limitations */}
        {omissions.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6 flex items-center gap-3 text-red-500">
              <AlertTriangle /> Extraction Limitations
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {omissions.map((omission) => (
                <div key={omission.omissionId} className="p-4 border border-red-500/30 bg-red-500/5 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-red-400">{omission.topic}</h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 bg-red-500/20 text-red-400 rounded">
                      {omission.severity}
                    </span>
                  </div>
                  <p className="text-sm text-fg/70 mb-2">Reason: {omission.reason.replace(/_/g, ' ')}</p>
                  {omission.sourceReference && (
                    <p className="text-xs text-fg/50 font-bold">Location: {omission.sourceReference}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulas */}
        {formulas.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6 text-accent-yellow">Extracted Formulas</h2>
            <div className="grid gap-6">
              {formulas.map((formula, idx) => (
                <div key={idx} className="p-6 border-2 border-accent-yellow bg-accent-yellow/5 flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/2">
                    <div className="bg-surface p-4 border border-fg font-mono text-lg text-center mb-4 overflow-x-auto">
                      {formula.expression}
                    </div>
                    <p className="text-sm text-fg/80 font-medium">{formula.significance}</p>
                    <p className="text-xs font-bold text-fg/50 uppercase mt-4">Source: {formula.sourceReferences.join(', ')}</p>
                  </div>
                  <div className="md:w-1/2">
                    <h4 className="text-xs font-bold text-fg/60 uppercase tracking-wider mb-2">Variables</h4>
                    <ul className="space-y-2">
                      {formula.variables.map((v, i) => (
                        <li key={i} className="text-sm font-medium text-fg/90 flex items-start gap-2">
                          <span className="text-accent-yellow">•</span>
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Concepts (What's Inside) */}
        <div className="mb-16">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6">Topic Explanations</h2>
          
          {!hasConcepts ? (
            <div className="border border-dashed border-fg/20 p-12 text-center rounded">
              <h3 className="font-display text-2xl font-bold uppercase mb-2">NO ACTIVE CONCEPTS</h3>
              <p className="text-muted mb-6">The AI could not extract targeted concepts from this material.</p>
              <button 
                onClick={() => navigate(`/study-space/${currentMaterial.studySpaceId}`)}
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
                <div className="mt-8 p-6 lg:p-8 border-4 border-fg bg-accent-blue/10 shadow-glass relative">
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
                                    className="w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-fg hover:bg-black/10 transition-colors flex items-center gap-2"
                                  >
                                    <Trash2 size={16} /> Delete Concept
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-lg font-medium text-fg/90 mb-6">{concept.definition}</p>

                        {concept.keyPoints && concept.keyPoints.length > 0 && (
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

        {/* Conclusions */}
        {processedContent.conclusions && processedContent.conclusions.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6 text-accent-purple">Conclusions & Takeaways</h2>
            <div className="space-y-4">
              {processedContent.conclusions.map((conclusion, i) => (
                <div key={i} className="p-5 border-l-4 border-accent-purple bg-surface shadow-sm">
                  <p className="font-medium text-lg text-fg">{conclusion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Ideas */}
        {processedContent.keyIdeas && processedContent.keyIdeas.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6 text-accent-blue">Key Ideas</h2>
            <div className="space-y-4">
              {processedContent.keyIdeas.map((idea: any, i: number) => (
                <div key={i} className="p-6 border-2 border-accent-blue bg-accent-blue/5">
                  <h3 className="font-bold text-xl text-fg mb-2">{idea.idea}</h3>
                  <p className="text-fg/80 font-medium leading-relaxed mb-3">{idea.explanation}</p>
                  <p className="text-sm text-fg/60 font-bold uppercase">Source: {(idea.sourceReferences || []).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important Results */}
        {processedContent.importantResults && processedContent.importantResults.length > 0 && (
          <div className="mb-16">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight mb-6 text-accent-pink">Important Results</h2>
            <div className="space-y-4">
              {processedContent.importantResults.map((res: any, i: number) => (
                <div key={i} className="p-6 border-2 border-accent-pink bg-accent-pink/5">
                  <h3 className="font-bold text-xl text-fg mb-2">{res.result || res.finding}</h3>
                  <p className="text-fg/80 font-medium leading-relaxed mb-3">{res.significance || res.implication}</p>
                  <p className="text-sm text-fg/60 font-bold uppercase">Source: {(res.sourceReferences || []).join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
