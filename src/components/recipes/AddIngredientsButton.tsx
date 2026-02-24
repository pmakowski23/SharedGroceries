import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/button";

type AddIngredientsButtonProps = {
  recipeId: Id<"recipes">;
  servings: number;
};

export function AddIngredientsButton({
  recipeId,
  servings,
}: AddIngredientsButtonProps) {
  const addToGroceryList = useAction(api.recipes.addIngredientsToGroceryList);
  const [adding, setAdding] = useState(false);

  const handleAddToGroceryList = async () => {
    setAdding(true);
    try {
      await addToGroceryList({
        recipeId,
        servings,
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={() => void handleAddToGroceryList()}
      disabled={adding}
      className="mt-4 w-full"
    >
      {adding ? "Adding..." : "Add Ingredients to Grocery List"}
    </Button>
  );
}
