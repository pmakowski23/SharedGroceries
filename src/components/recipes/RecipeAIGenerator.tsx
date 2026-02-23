import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Textarea } from "../ui/textarea";

type RecipeAIGeneratorProps = {
  showGenerate: boolean;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  generating: boolean;
  onGenerate: () => void;
};

export function RecipeAIGenerator({
  showGenerate,
  aiPrompt,
  setAiPrompt,
  generating,
  onGenerate,
}: RecipeAIGeneratorProps) {
  return (
    showGenerate && (
      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Generate with AI
          </h3>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder='Describe a meal (e.g. "high-protein chicken stir fry for 2")...'
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={onGenerate}
            disabled={generating || !aiPrompt.trim()}
            className="mt-2 w-full"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Generating...
              </span>
            ) : (
              "Generate Recipe"
            )}
          </Button>
        </CardContent>
      </Card>
    )
  );
}
