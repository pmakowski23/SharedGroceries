import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type Suggestion = {
  canSuggest: boolean;
  bmr?: number | null;
  tdee?: number | null;
  reason?: string | null;
  suggestion?: {
    protein: number;
    carbs: number;
    fat: number;
  } | null;
};

type SuggestedTargetsSectionProps = {
  suggestion: Suggestion | undefined;
  onApplySuggestion: () => void;
};

export function SuggestedTargetsSection({
  suggestion,
  onApplySuggestion,
}: SuggestedTargetsSectionProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
      <h2 className="text-sm font-semibold text-muted-foreground">Suggested targets</h2>
      {suggestion?.canSuggest && suggestion.suggestion ? (
        <div className="text-xs text-muted-foreground">
          BMR {suggestion.bmr} kcal, TDEE {suggestion.tdee} kcal
        </div>
      ) : (
        <div className="text-xs text-accent">{suggestion?.reason}</div>
      )}
      <Button
        type="button"
        onClick={onApplySuggestion}
        disabled={!suggestion?.canSuggest}
        variant="secondary"
        className="w-full"
      >
        Apply suggested goals
      </Button>
      </CardContent>
    </Card>
  );
}
