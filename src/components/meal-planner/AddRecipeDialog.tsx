import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type AddRecipeDialogProps = {
  open: boolean;
  date: string;
  mealType: string | null;
  onOpenChange: (open: boolean) => void;
};

export function AddRecipeDialog({
  open,
  date,
  mealType,
  onOpenChange,
}: AddRecipeDialogProps) {
  const recipes = useQuery(api.recipes.list, {}) ?? [];
  const addMeal = useMutation(api.mealPlans.addMeal);

  const handleAddMeal = async (recipeId: Id<"recipes">) => {
    if (!mealType) return;
    await addMeal({ date, mealType, recipeId, servings: 1 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Add recipe to {mealType}</DialogTitle>
          <DialogDescription>Choose a saved recipe for this meal slot.</DialogDescription>
        </DialogHeader>
        {recipes.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No recipes yet. Create one in the Recipes tab.
          </p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {recipes.map((recipe) => (
              <Button
                key={recipe._id}
                type="button"
                variant="outline"
                onClick={() => void handleAddMeal(recipe._id)}
                className="h-auto w-full justify-start px-3 py-2 text-left"
              >
                <div className="flex w-full items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{recipe.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {recipe.totalKcal} kcal
                  </span>
                </div>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
