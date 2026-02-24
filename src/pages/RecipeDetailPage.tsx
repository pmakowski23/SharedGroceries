import { useQuery } from "convex/react";
import { Link, useParams } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AddIngredientsButton } from "../components/recipes/AddIngredientsButton";
import { IngredientsList } from "../components/recipes/IngredientsList";
import { InstructionsList } from "../components/recipes/InstructionsList";
import { MacrosGrid } from "../components/recipes/MacrosGrid";
import { MealTagSelector } from "../components/recipes/MealTagSelector";
import { RecipeHeader } from "../components/recipes/RecipeHeader";
import { ServingsControl } from "../components/recipes/ServingsControl";
import { Button } from "../components/ui/button";
import { useScaledRecipeNutrition } from "../hooks/useScaledRecipeNutrition";

export function RecipeDetailPage() {
  const { recipeId } = useParams({ from: "/recipes/$recipeId" });
  const recipe = useQuery(api.recipes.get, {
    recipeId: recipeId as Id<"recipes">,
  });
  const ingredients = useQuery(api.recipes.getIngredients, {
    recipeId: recipeId as Id<"recipes">,
  });

  const fallbackServings = recipe?.servings ?? 1;
  const fallbackIngredients = ingredients ?? [];
  const { displayServings, setServings, scale, totalMacros } =
    useScaledRecipeNutrition(fallbackServings, fallbackIngredients);

  if (recipe === undefined || ingredients === undefined) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (recipe === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Button type="button" variant="link" className="mt-4" asChild>
          <Link to="/recipes">Back to recipes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <RecipeHeader name={recipe.name} description={recipe.description} />
      <MealTagSelector
        recipeId={recipeId as Id<"recipes">}
        activeTags={recipe.mealTags}
      />
      <ServingsControl servings={displayServings} setServings={setServings} />
      <MacrosGrid totalMacros={totalMacros} />
      <IngredientsList ingredients={ingredients} scale={scale} />
      <AddIngredientsButton
        recipeId={recipeId as Id<"recipes">}
        servings={displayServings}
      />
      <InstructionsList instructions={recipe.instructions} />
    </div>
  );
}
