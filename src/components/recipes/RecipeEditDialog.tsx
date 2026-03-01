import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";

type RecipeEditDialogProps = {
  open: boolean;
  prompt: string;
  errorMessage: string | null;
  submitting: boolean;
  onPromptChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
};

export function RecipeEditDialog({
  open,
  prompt,
  errorMessage,
  submitting,
  onPromptChange,
  onOpenChange,
  onSubmit,
}: RecipeEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit recipe with AI</DialogTitle>
          <DialogDescription>
            Describe what to change, for example: add chicken or make it high-protein.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder='e.g. "add chicken and reduce carbs"'
          rows={4}
          className="resize-none"
        />
        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !prompt.trim()}
        >
          {submitting ? "Generating..." : "Generate new version"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
