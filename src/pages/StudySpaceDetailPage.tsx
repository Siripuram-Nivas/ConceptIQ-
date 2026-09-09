import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';
import { DemoModeIndicator } from '../components/DemoModeIndicator';
import { DeleteStudySpaceDialog } from '../components/DeleteStudySpaceDialog';

export function StudySpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { currentSpace, materials, getKnowledgeMapForSpace, selectStudySpace, updateStudySpaceLastActive } =
    useStudySpaceStore();
  const [spaceMaterials, setSpaceMaterials] = useState<typeof materials>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    <div className="w-full flex-1 flex flex-col">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 pt-8 pb-32 w-full">
        <button
          onClick={() => navigate('/study-spaces')}
          className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors mb-8 min-h-[44px] -ml-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="mb-16 border-b border-white/[0.05] pb-10">
          <div className="flex justify-between items-start mb-6">
            <h1 className="font-display font-black text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.85] uppercase tracking-tighter text-white">{currentSpace.title}</h1>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-3 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/[0.05]"
              >
                <MoreVertical size={24} />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-surface border-2 border-fg shadow-glass z-20 overflow-hidden">
                    <button 
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteDialog(true);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete Study Space
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          {currentSpace.description && (
            <p className="text-xl font-bold uppercase tracking-wide text-white/60 mb-8 max-w-3xl">{currentSpace.description}</p>
          )}

          {/* Progress Stats */}
          <div className="flex gap-4 flex-wrap">
            <div className="px-4 py-2 border-2 border-success text-success font-bold text-sm uppercase tracking-wider">
              {currentSpace.progress.conceptsMastered} Mastered
            </div>
            <div className="px-4 py-2 border-2 border-accent-purple text-accent-purple font-bold text-sm uppercase tracking-wider">
              {currentSpace.progress.conceptsPartial} Partial
            </div>
            {currentSpace.progress.conceptsWeak > 0 && (
              <div className="px-4 py-2 bg-accent-yellow border-2 border-fg text-fg font-bold text-sm uppercase tracking-wider">
                {currentSpace.progress.conceptsWeak} Weak
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Main Content (Left) */}
          <div className="lg:col-span-8 flex flex-col gap-16">
            
            {/* Materials Section */}
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-4 mb-8">
                <h2 className="font-display text-3xl font-black uppercase tracking-tighter text-white">Materials <span className="text-white/40">({spaceMaterials.length})</span></h2>
            <button
              onClick={() => navigate(`/add-material-to-space/${currentSpace.id}`)}
              className="text-sm font-bold uppercase tracking-wide text-accent-purple hover:underline"
            >
              + ADD MATERIAL
            </button>
          </div>

              {spaceMaterials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {spaceMaterials.map((material) => (
                    <div
                      key={material.id}
                      className="group p-6 rounded-[16px] bg-white/[0.02] border border-white/[0.08] hover:border-accent-yellow/50 flex flex-col justify-between h-[180px] cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04]"
                      onClick={() => navigate(`/material-overview/${material.id}`)}
                    >
                      <div>
                        <p className="font-display font-black text-2xl uppercase tracking-tighter text-white mb-2 line-clamp-2 group-hover:text-accent-yellow transition-colors">{material.title}</p>
                        {material.isDemoMode && <DemoModeIndicator />}
                      </div>
                      
                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/[0.05]">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                          {material.processingStatus === 'processing' && 'PROCESSING...'}
                          {material.processingStatus === 'ready' &&
                            material.processedContent &&
                            `${material.processedContent.concepts.length} CONCEPTS`}
                          {material.processingStatus === 'failed' && 'PROCESSING FAILED'}
                        </p>
                        <ChevronRight size={20} className="text-accent-yellow opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-white/[0.1] rounded-[16px] p-16 flex flex-col items-center text-center bg-white/[0.01]">
                  <p className="text-lg font-bold text-white/50 uppercase tracking-wide mb-4">No materials added yet.</p>
                  <button
                    onClick={() => navigate(`/add-material-to-space/${currentSpace.id}`)}
                    className="editorial-btn-primary mx-auto"
                  >
                    ADD MATERIAL
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* Action Sidebar */}
            <div className="sticky top-24 flex flex-col gap-8">
              
              {/* Continue Learning */}
              {spaceMaterials.some((m) => m.processedContent) && (
                <div className="p-8 rounded-[16px] bg-white/[0.02] border border-white/[0.08]">
                  <p className="text-xs font-bold text-accent-yellow uppercase tracking-widest mb-4">Continue Learning</p>
                  <h3 className="font-display font-black text-2xl uppercase tracking-tighter text-white mb-6">Ready to teach?</h3>
                  <button
                    onClick={() => {
                      // Start teaching on first available concept
                      const firstMaterial = spaceMaterials.find((m) => m.processedContent);
                      if (firstMaterial?.processedContent?.concepts[0]) {
                        const concept = firstMaterial.processedContent.concepts[0];
                        navigate(`/teach-material/${firstMaterial.id}?concept=${encodeURIComponent(concept.name)}`);
                      }
                    }}
                    className="editorial-btn-primary w-full text-lg flex justify-between items-center group"
                  >
                    START TEACHBACK
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              {/* Knowledge Map Section */}
              {map && map.nodes.length > 0 && (
                <div className="p-8 rounded-[16px] bg-white/[0.02] border border-white/[0.08] flex flex-col items-center text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-[12px] bg-white/[0.05] border border-white/[0.1] text-accent-yellow mb-6">
                    <BookOpen size={24} />
                  </div>
                  <p className="font-display font-black text-4xl text-white uppercase tracking-tighter mb-2">{totalConcepts}</p>
                  <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-8">Concepts in map</p>
                  <button
                    onClick={() => navigate(`/knowledge-map/${currentSpace.id}`)}
                    className="editorial-btn-accent w-full"
                  >
                    VIEW KNOWLEDGE MAP
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
        
        {showDeleteDialog && (
          <DeleteStudySpaceDialog
            spaceId={currentSpace.id}
            spaceTitle={currentSpace.title}
            onCancel={() => setShowDeleteDialog(false)}
            onSuccess={() => {
              setShowDeleteDialog(false);
              navigate('/study-spaces');
            }}
          />
        )}
      </div>
    </div>
  );
}
