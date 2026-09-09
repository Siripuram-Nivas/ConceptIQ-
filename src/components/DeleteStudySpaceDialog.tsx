import { useStudySpaceStore } from '../store/study-space-store';

interface DeleteStudySpaceDialogProps {
  spaceId: string;
  spaceTitle: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function DeleteStudySpaceDialog({ spaceId, spaceTitle, onCancel, onSuccess }: DeleteStudySpaceDialogProps) {
  const { deleteStudySpace } = useStudySpaceStore();

  const handleDelete = () => {
    deleteStudySpace(spaceId);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface border-4 border-fg p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <h3 id="delete-dialog-title" className="font-display font-black text-2xl uppercase tracking-tighter mb-4">
          Delete "{spaceTitle}"?
        </h3>
        <div className="text-fg/80 font-medium mb-8 space-y-4">
          <p>
            This permanently removes this Study Space, its uploaded materials, concepts, Knowledge Map, progress, and learning history.
          </p>
          <p className="text-red-500 font-bold uppercase tracking-wider text-sm">
            This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border-2 border-fg font-bold uppercase tracking-wider hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-accent-purple"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-3 bg-red-500 text-white font-bold uppercase tracking-wider border-2 border-fg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-surface"
          >
            Delete Study Space
          </button>
        </div>
      </div>
    </div>
  );
}
