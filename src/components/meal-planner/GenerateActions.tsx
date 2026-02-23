type GenerateActionsProps = {
  targetMacrosAvailable: boolean;
  generatingDayPlan: boolean;
  generatingGroceryList: boolean;
  onGenerateDayPlan: () => void;
  onGenerateGroceryList: () => void;
};

export function GenerateActions({
  targetMacrosAvailable,
  generatingDayPlan,
  generatingGroceryList,
  onGenerateDayPlan,
  onGenerateGroceryList,
}: GenerateActionsProps) {
  return (
    <>
      <button
        onClick={onGenerateDayPlan}
        disabled={generatingDayPlan || !targetMacrosAvailable}
        className="mb-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        {generatingDayPlan ? "Generating day plan..." : "Generate Day Plan (Fit Goals)"}
      </button>

      <button
        onClick={onGenerateGroceryList}
        disabled={generatingGroceryList}
        className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        {generatingGroceryList
          ? "Generating grocery list..."
          : "Generate Grocery List for This Week"}
      </button>
    </>
  );
}
