import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, Zap, ChevronRight } from 'lucide-react';
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
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-32">
        <div className="mb-8">
          <h1 className="font-display font-bold text-display-lg text-fg">My Study Spaces</h1>
          <p className="text-muted mt-2 leading-relaxed">
            Each study space holds your materials, concepts, and progress.
          </p>
        </div>

        {/* Create New Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 w-full min-h-[60px] px-6 rounded-2xl bg-fg text-bg font-semibold text-base hover:bg-fg/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai mb-8"
        >
          <Plus size={20} />
          New Study Space
        </button>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
            <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full space-y-4">
              <h2 className="font-display font-bold text-display-sm text-fg">New Study Space</h2>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="e.g., Forensic Biology, Quantum Physics..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-fg text-sm focus:outline-none focus:border-ai focus:ring-1 focus:ring-ai transition-colors placeholder:text-muted"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-border text-fg font-semibold text-sm hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim()}
                  className="flex-1 px-4 py-2 rounded-xl bg-fg text-bg font-semibold text-sm hover:bg-fg/90 disabled:opacity-50 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Study Spaces List */}
        {sortedSpaces.length > 0 ? (
          <div className="space-y-3">
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
                  className="w-full text-left p-5 rounded-2xl border border-border bg-surface hover:bg-surface-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={16} className="text-ai flex-shrink-0" />
                        <h2 className="font-display font-semibold text-display-sm text-fg">{space.title}</h2>
                      </div>
                      {space.description && (
                        <p className="text-xs text-muted mb-2 line-clamp-1">{space.description}</p>
                      )}
                      <div className="flex items-center gap-3">
                        {totalConcepts > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <Zap size={12} className="text-accent" />
                            {totalConcepts} concepts
                          </span>
                        )}
                        {space.progress.conceptsMastered > 0 && (
                          <span className="text-xs font-semibold text-success">
                            {space.progress.conceptsMastered} mastered
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted ml-auto">
                          <Clock size={12} />
                          {lastActivity}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-muted flex-shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen size={32} className="text-muted mx-auto mb-3 opacity-50" />
            <p className="text-muted mb-4">No study spaces yet.</p>
            <p className="text-sm text-muted/70 mb-4">Create your first study space to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
