import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BookOpen, ChevronRight } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';
import { DemoModeIndicator } from '../components/DemoModeIndicator';

export function StudySpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { currentSpace, materials, getKnowledgeMapForSpace, selectStudySpace, updateStudySpaceLastActive } =
    useStudySpaceStore();
  const [spaceMaterials, setSpaceMaterials] = useState<typeof materials>([]);

  useEffect(() => {
    if (spaceId) {
      selectStudySpace(spaceId);
      updateStudySpaceLastActive(spaceId);
    }
  }, [spaceId, selectStudySpace, updateStudySpaceLastActive]);

  useEffect(() => {
    if (currentSpace) {
      setSpaceMaterials(materials.filter((m) => currentSpace.materialIds.includes(m.id)));
    }
  }, [currentSpace, materials]);

  if (!currentSpace) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-muted">Study space not found.</p>
          <button
            onClick={() => navigate('/study-spaces')}
            className="text-ai underline mt-2 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            Back to study spaces →
          </button>
        </div>
      </div>
    );
  }

  const map = getKnowledgeMapForSpace(currentSpace.id);
  const totalConcepts =
    currentSpace.progress.conceptsMastered +
    currentSpace.progress.conceptsPartial +
    currentSpace.progress.conceptsWeak;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-32">
        <button
          onClick={() => navigate('/study-spaces')}
          className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors mb-8 min-h-[44px] -ml-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-display-lg text-fg mb-2">{currentSpace.title}</h1>
          {currentSpace.description && (
            <p className="text-muted leading-relaxed mb-3">{currentSpace.description}</p>
          )}

          {/* Progress Stats */}
          <div className="flex gap-4 mt-4 flex-wrap">
            <div className="px-3 py-1.5 rounded-full bg-success-light/30 border border-success/30">
              <span className="text-xs font-semibold text-success">{currentSpace.progress.conceptsMastered} Mastered</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30">
              <span className="text-xs font-semibold text-accent/80">{currentSpace.progress.conceptsPartial} Partial</span>
            </div>
            {currentSpace.progress.conceptsWeak > 0 && (
              <div className="px-3 py-1.5 rounded-full bg-warning-light/30 border border-warning/30">
                <span className="text-xs font-semibold text-warning/80">{currentSpace.progress.conceptsWeak} Weak</span>
              </div>
            )}
          </div>
        </div>

        {/* Materials Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">Materials ({spaceMaterials.length})</p>
            <button
              onClick={() => navigate(`/add-material-to-space/${currentSpace.id}`)}
              className="text-xs text-ai hover:text-ai/80 transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Add Material
            </button>
          </div>

          {spaceMaterials.length > 0 ? (
            <div className="space-y-2">
              {spaceMaterials.map((material) => (
                <div
                  key={material.id}
                  className="p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => navigate(`/material-overview/${material.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-fg">{material.title}</p>
                      <p className="text-xs text-muted mt-1">
                        {material.processingStatus === 'processing' && 'Processing...'}
                        {material.processingStatus === 'ready' &&
                          material.processedContent &&
                          `${material.processedContent.concepts.length} concepts`}
                        {material.processingStatus === 'failed' && 'Processing failed'}
                      </p>
                      {material.isDemoMode && <DemoModeIndicator />}
                    </div>
                    <ChevronRight size={16} className="text-muted flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-border bg-surface/50 text-center py-8">
              <p className="text-sm text-muted mb-3">No materials added yet</p>
              <button
                onClick={() => navigate(`/add-material-to-space/${currentSpace.id}`)}
                className="text-sm text-ai hover:text-ai/80 transition-colors"
              >
                + Add Material
              </button>
            </div>
          )}
        </div>

        {/* Knowledge Map Section */}
        {map && map.nodes.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Knowledge Map · {map.sourceCount} source{map.sourceCount !== 1 ? 's' : ''}
            </p>
            <div className="p-5 rounded-2xl border border-border bg-surface space-y-3">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-ai/10 mb-3">
                  <BookOpen size={20} className="text-ai" />
                </div>
                <p className="font-semibold text-fg mb-1">{totalConcepts} Concepts</p>
                <p className="text-xs text-muted mb-4">Organized into your knowledge map</p>
                <button
                  onClick={() => navigate(`/knowledge-map/${currentSpace.id}`)}
                  className="text-sm text-ai hover:text-ai/80 transition-colors"
                >
                  View Map →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Continue Learning Section */}
        {spaceMaterials.some((m) => m.processedContent) && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Continue Learning</p>
            <button
              onClick={() => {
                // Start teaching on first available concept
                const firstMaterial = spaceMaterials.find((m) => m.processedContent);
                if (firstMaterial?.processedContent?.concepts[0]) {
                  const concept = firstMaterial.processedContent.concepts[0];
                  navigate(`/teach-material/${firstMaterial.id}?concept=${encodeURIComponent(concept.name)}`);
                }
              }}
              className="w-full min-h-[52px] px-6 rounded-2xl bg-ai text-bg font-semibold text-sm hover:bg-ai/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              Start TeachBack →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
