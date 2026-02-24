import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

type RecipeAIGeneratorProps = {
  showGenerate: boolean;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  includeGoalsContext: boolean;
  setIncludeGoalsContext: (value: boolean) => void;
  generating: boolean;
  onGenerate: () => void;
};

export function RecipeAIGenerator({
  showGenerate,
  aiPrompt,
  setAiPrompt,
  includeGoalsContext,
  setIncludeGoalsContext,
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
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border p-3">
            <Label
              htmlFor="include-goals-context"
              className="text-sm text-muted-foreground"
            >
              Include my nutrition goals in AI prompt
            </Label>
            <Switch
              id="include-goals-context"
              checked={includeGoalsContext}
              onCheckedChange={setIncludeGoalsContext}
            />
          </div>
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
