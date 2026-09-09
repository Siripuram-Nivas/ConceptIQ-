import { useStudySpaceStore } from '../store/study-space-store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

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
    <AlertDialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-surface-strong border-border-strong sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl text-fg uppercase tracking-tight">
            Delete "{spaceTitle}"?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground leading-relaxed mt-2">
            This permanently removes this Study Space, its uploaded materials, active concepts, Knowledge Map, progress, and learning history.
            <br /><br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-3 sm:gap-2">
          <AlertDialogCancel 
            onClick={onCancel}
            className="editorial-btn-outline h-10 px-4 py-2 hover:bg-surface-light rounded-md border-border-strong"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="h-10 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md font-medium transition-colors"
          >
            Delete Study Space
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

