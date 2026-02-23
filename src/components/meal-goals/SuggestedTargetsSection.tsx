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
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Suggested targets</h2>
      {suggestion?.canSuggest && suggestion.suggestion ? (
        <div className="text-xs text-gray-500">
          BMR {suggestion.bmr} kcal, TDEE {suggestion.tdee} kcal
        </div>
      ) : (
        <div className="text-xs text-amber-600">{suggestion?.reason}</div>
      )}
      <button
        onClick={onApplySuggestion}
        disabled={!suggestion?.canSuggest}
        className="w-full border border-blue-200 text-blue-600 font-medium py-2.5 rounded-lg text-sm disabled:text-gray-400 disabled:border-gray-200"
      >
        Apply suggested goals
      </button>
    </div>
  );
}
