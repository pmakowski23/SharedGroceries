import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { MinusIcon, PlusIcon } from "lucide-react";

type RecipeAIGeneratorProps = {
  showGenerate: boolean;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  includeGoalsContext: boolean;
  setIncludeGoalsContext: (value: boolean) => void;
  servingsCount: number;
  increaseServingsCount: () => void;
  decreaseServingsCount: () => void;
  generating: boolean;
  onGenerate: () => void;
};

function ServingsCount({
  servingsCount,
  increaseServingsCount,
  decreaseServingsCount,
}: {
  servingsCount: number;
  increaseServingsCount: () => void;
  decreaseServingsCount: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="space-y-0.5">
        <Label htmlFor="recipe-servings-count" className="text-sm">
          Servings in recipe
        </Label>
      </div>
      <ButtonGroup aria-label="Adjust recipe servings count" className="h-fit">
        <Button
          variant="outline"
          size="icon"
          type="button"
          onClick={decreaseServingsCount}
          aria-label="Decrease servings count"
          disabled={servingsCount <= 1}
        >
          <MinusIcon />
        </Button>
        <div
          id="recipe-servings-count"
          className="flex h-9 min-w-9 items-center justify-center rounded-md border text-sm font-semibold"
          aria-live="polite"
        >
          {servingsCount}
        </div>
        <Button
          variant="outline"
          size="icon"
          type="button"
          onClick={increaseServingsCount}
          aria-label="Increase servings count"
        >
          <PlusIcon />
        </Button>
      </ButtonGroup>
    </div>
  );
}

export function RecipeAIGenerator({
  showGenerate,
  aiPrompt,
  setAiPrompt,
  includeGoalsContext,
  setIncludeGoalsContext,
  servingsCount,
  increaseServingsCount,
  decreaseServingsCount,
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
            placeholder='Paste a recipe or describe a meal (e.g. "high-protein chicken stir fry for 2")...'
            rows={3}
            className="resize-none"
          />
          <ServingsCount
            servingsCount={servingsCount}
            increaseServingsCount={increaseServingsCount}
            decreaseServingsCount={decreaseServingsCount}
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
