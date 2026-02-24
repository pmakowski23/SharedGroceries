import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Minus, Plus, X } from "lucide-react";
import { AddRecipeDialog } from "./AddRecipeDialog";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

type PlannedMeal = {
  _id: Id<"mealPlans">;
  date: string;
  mealType: string;
  servings: number;
  recipeName: string;
  totalKcal?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
};

type MealSlotsProps = {
  mealPlan: Array<PlannedMeal> | undefined;
  currentDateKey: string;
};

export function MealSlots({
  mealPlan,
  currentDateKey,
}: MealSlotsProps) {
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const removeMeal = useMutation(api.mealPlans.removeMeal);
  const updateServings = useMutation(api.mealPlans.updateServings);
  const dayMeals = useMemo(
    () => (mealPlan ?? []).filter((m) => m.date === currentDateKey),
    [currentDateKey, mealPlan],
  );
  const mealPlanLoaded = mealPlan !== undefined;

  if (!mealPlanLoaded) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {MEAL_TYPES.map((mealType) => {
        const meal = dayMeals.find((m) => m.mealType === mealType);

        return (
          <Card key={mealType}>
            <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">{mealType}</h3>
              {meal && (
                <div className="text-xs text-muted-foreground">
                  {Math.round(meal.totalKcal ?? 0)} kcal
                </div>
              )}
            </div>

            {meal ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {meal.recipeName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void removeMeal({ mealPlanId: meal._id })}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${meal.recipeName}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Servings:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      void updateServings({
                        mealPlanId: meal._id,
                        servings: Math.max(1, meal.servings - 1),
                      })
                    }
                    className="h-6 w-6 rounded-full"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-medium">{meal.servings}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      void updateServings({
                        mealPlanId: meal._id,
                        servings: meal.servings + 1,
                      })
                    }
                    className="h-6 w-6 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>P: {Math.round(meal.totalProtein ?? 0)}g</span>
                  <span>C: {Math.round(meal.totalCarbs ?? 0)}g</span>
                  <span>F: {Math.round(meal.totalFat ?? 0)}g</span>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedMealType(mealType)}
                className="w-full border-dashed text-muted-foreground hover:text-foreground"
              >
                + Add recipe
              </Button>
            )}
            </CardContent>
          </Card>
        );
      })}

      <AddRecipeDialog
        open={selectedMealType !== null}
        date={currentDateKey}
        mealType={selectedMealType}
        onOpenChange={(open) => {
          if (!open) setSelectedMealType(null);
        }}
      />
    </div>
  );
}
