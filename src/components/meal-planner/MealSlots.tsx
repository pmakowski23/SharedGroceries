import { Id } from "../../../convex/_generated/dataModel";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

type PlannedMeal = {
  _id: Id<"mealPlans">;
  mealType: string;
  servings: number;
  recipeName: string;
  totalKcal?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
};

type RecipeListItem = {
  _id: Id<"recipes">;
  name: string;
  totalKcal?: number | null;
};

type MealSlotsProps = {
  mealPlanLoaded: boolean;
  dayMeals: Array<PlannedMeal>;
  recipes: Array<RecipeListItem>;
  addingSlot: string | null;
  setAddingSlot: (slot: string | null) => void;
  onAddMeal: (mealType: string, recipeId: Id<"recipes">) => void;
  onRemoveMeal: (mealPlanId: Id<"mealPlans">) => void;
  onUpdateServings: (mealPlanId: Id<"mealPlans">, servings: number) => void;
};

export function MealSlots({
  mealPlanLoaded,
  dayMeals,
  recipes,
  addingSlot,
  setAddingSlot,
  onAddMeal,
  onRemoveMeal,
  onUpdateServings,
}: MealSlotsProps) {
  if (!mealPlanLoaded) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {MEAL_TYPES.map((mealType) => {
        const meal = dayMeals.find((m) => m.mealType === mealType);
        const isAdding = addingSlot === mealType;

        return (
          <div key={mealType} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">{mealType}</h3>
              {meal && (
                <div className="text-xs text-gray-400">
                  {Math.round(meal.totalKcal ?? 0)} kcal
                </div>
              )}
            </div>

            {meal ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-800 font-medium">
                    {meal.recipeName}
                  </span>
                  <button
                    onClick={() => onRemoveMeal(meal._id)}
                    className="p-1 text-gray-300 hover:text-red-500"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">Servings:</span>
                  <button
                    onClick={() =>
                      onUpdateServings(meal._id, Math.max(1, meal.servings - 1))
                    }
                    className="w-6 h-6 rounded-full border text-xs flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="text-sm font-medium">{meal.servings}</span>
                  <button
                    onClick={() => onUpdateServings(meal._id, meal.servings + 1)}
                    className="w-6 h-6 rounded-full border text-xs flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  <span>P: {Math.round(meal.totalProtein ?? 0)}g</span>
                  <span>C: {Math.round(meal.totalCarbs ?? 0)}g</span>
                  <span>F: {Math.round(meal.totalFat ?? 0)}g</span>
                </div>
              </div>
            ) : isAdding ? (
              <div className="space-y-2">
                {recipes.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">
                    No recipes yet. Create one in the Recipes tab.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {recipes.map((recipe) => (
                      <button
                        key={recipe._id}
                        onClick={() => onAddMeal(mealType, recipe._id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 border border-gray-100"
                      >
                        <span className="font-medium">{recipe.name}</span>
                        <span className="text-gray-400 ml-2 text-xs">
                          {recipe.totalKcal} kcal
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setAddingSlot(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSlot(mealType)}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                + Add recipe
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
