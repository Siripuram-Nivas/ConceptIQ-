import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, Zap, ArrowRight } from 'lucide-react';
import { useStudySpaceStore } from '../store/study-space-store';

export function MyStudySpacesPage() {
  const navigate = useNavigate();
  const { studySpaces, selectStudySpace, createStudySpace } = useStudySpaceStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = () => {
    if (newTitle.trim()) {
      const newSpaceId = createStudySpace(newTitle);
      setNewTitle('');
      setShowCreate(false);
      // Navigate to new space
      setTimeout(() => {
        selectStudySpace(newSpaceId);
        navigate(`/study-space/${newSpaceId}`);
      }, 0);
    }
  };

  const handleSelectSpace = (spaceId: string) => {
    selectStudySpace(spaceId);
    navigate(`/study-space/${spaceId}`);
  };

  // Sort by last studied (recent first)
  const sortedSpaces = [...studySpaces].sort(
    (a, b) => new Date(b.lastStudiedAt || b.updatedAt).getTime() - new Date(a.lastStudiedAt || a.updatedAt).getTime()
  );

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 pt-12 md:pt-20 pb-32 w-full">
        <div className="mb-12 border-b border-white/[0.05] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display font-black text-[3rem] md:text-[5rem] uppercase tracking-tighter leading-none text-white mb-4">STUDY<br/><span className="text-accent-yellow">SPACES</span></h1>
            <p className="text-lg md:text-xl font-bold uppercase tracking-wide text-white/60 max-w-xl">
              Each study space holds your materials, concepts, and progress.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="editorial-btn-primary whitespace-nowrap"
          >
            <Plus size={20} className="mr-2" />
            NEW SPACE
          </button>
        </div>



        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm flex items-center justify-center p-5 z-50 animate-fade-in">
            <div className="bg-bg border border-white/[0.1] p-8 max-w-lg w-full space-y-6 shadow-2xl rounded-[16px]">
              <h2 className="font-display font-black text-3xl uppercase tracking-tighter text-white">New Study Space</h2>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="e.g., Forensic Biology, Quantum Physics..."
                className="w-full px-4 py-4 bg-white/[0.045] border border-white/[0.14] rounded-[12px] text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent-yellow transition-all placeholder:text-white/45"
                autoFocus
              />
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowCreate(false)}
                  className="editorial-btn-outline flex-1"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim()}
                  className="editorial-btn-primary flex-1 disabled:opacity-50"
                >
                  CREATE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Study Spaces List */}
        {sortedSpaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedSpaces.map((space) => {
              const totalConcepts =
                space.progress.conceptsMastered +
                space.progress.conceptsPartial +
                space.progress.conceptsWeak;
              const lastActivity = space.lastStudiedAt
                ? new Date(space.lastStudiedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : new Date(space.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

              return (
                <button
                  key={space.id}
                  onClick={() => handleSelectSpace(space.id)}
                  className="group relative flex flex-col text-left bg-white/[0.02] border border-white/[0.08] hover:border-accent-yellow/50 rounded-[16px] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04] p-6 h-[280px]"
                >
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/70 group-hover:text-accent-yellow group-hover:border-accent-yellow/30 transition-colors">
                        <BookOpen size={24} />
                      </div>
                    </div>
                    
                    <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-white line-clamp-2 mb-2 group-hover:text-accent-yellow transition-colors">{space.title}</h2>
                    
                    {space.description && (
                      <p className="text-sm font-medium text-white/60 mb-4 line-clamp-2">{space.description}</p>
                    )}
                    
                    <div className="mt-auto pt-4 border-t border-white/[0.05] flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        {totalConcepts > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent-yellow bg-accent-yellow/10 px-2 py-1 rounded">
                            <Zap size={12} /> {totalConcepts} CONCEPTS
                          </span>
                        )}
                        {space.progress.conceptsMastered > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-success bg-success/10 px-2 py-1 rounded">
                            {space.progress.conceptsMastered} MASTERED
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                        <Clock size={12} /> LAST ACTIVE: {lastActivity}
                      </span>
                    </div>
                  </div>
                  
                  {/* Hover Affordance */}
                  <div className="absolute top-6 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight size={24} className="text-accent-yellow" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6">
              <BookOpen size={32} className="text-white/20" />
            </div>
            <p className="text-xl font-bold uppercase tracking-wide text-white mb-2">No study spaces yet.</p>
            <p className="text-base text-white/50 mb-8 max-w-md">Create your first study space to organize your materials and track your mastery.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="editorial-btn-primary"
            >
              <Plus size={20} className="mr-2" />
              NEW SPACE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
