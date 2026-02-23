import { useQuery, useMutation, useAction } from "convex/react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { IngredientsList } from "../components/recipes/IngredientsList";
import { InstructionsList } from "../components/recipes/InstructionsList";
import { MacrosGrid } from "../components/recipes/MacrosGrid";
import { MealTagSelector, type MealTag } from "../components/recipes/MealTagSelector";
import { RecipeHeader } from "../components/recipes/RecipeHeader";
import { ServingsControl } from "../components/recipes/ServingsControl";
import { useScaledRecipeNutrition } from "../hooks/useScaledRecipeNutrition";

export function RecipeDetailPage() {
  const { recipeId } = useParams({ from: "/recipes/$recipeId" });
  const recipe = useQuery(api.recipes.get, {
    recipeId: recipeId as Id<"recipes">,
  });
  const ingredients = useQuery(api.recipes.getIngredients, {
    recipeId: recipeId as Id<"recipes">,
  });
  const addToGroceryList = useAction(api.recipes.addIngredientsToGroceryList);
  const updateMealTags = useMutation(api.recipes.updateMealTags);
  const navigate = useNavigate();

  const [adding, setAdding] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  if (recipe === undefined || ingredients === undefined) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (recipe === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Recipe not found.</p>
        <button
          onClick={() => void navigate({ to: "/recipes" })}
          className="mt-4 text-blue-500 underline text-sm"
        >
          Back to recipes
        </button>
      </div>
    );
  }

  const { displayServings, setServings, scale, totalMacros } =
    useScaledRecipeNutrition(recipe.servings, ingredients);

  const handleToggleMealTag = async (mealTag: MealTag) => {
    const hasTag = recipe.mealTags.includes(mealTag);
    const nextTags = hasTag
      ? recipe.mealTags.filter((tag) => tag !== mealTag)
      : [...recipe.mealTags, mealTag];
    if (nextTags.length === 0) {
      return;
    }

    setSavingTags(true);
    try {
      await updateMealTags({
        recipeId: recipeId as Id<"recipes">,
        mealTags: nextTags,
      });
    } finally {
      setSavingTags(false);
    }
  };

  const handleAddToGroceryList = async () => {
    setAdding(true);
    try {
      await addToGroceryList({
        recipeId: recipeId as Id<"recipes">,
        servings: displayServings,
      });
    } finally {
      setAdding(false);
    }
  };

  const onBack = () => {
    void navigate({ to: "/recipes" });
  };

  const decreaseServings = () => {
    setServings(Math.max(1, displayServings - 1));
  };

  const increaseServings = () => {
    setServings(displayServings + 1);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <RecipeHeader
        name={recipe.name}
        description={recipe.description}
        onBack={onBack}
      />
      <MealTagSelector
        activeTags={recipe.mealTags}
        saving={savingTags}
        onToggleTag={(tag) => void handleToggleMealTag(tag)}
      />
      <ServingsControl
        servings={displayServings}
        onDecrease={decreaseServings}
        onIncrease={increaseServings}
      />
      <MacrosGrid totalMacros={totalMacros} />
      <IngredientsList ingredients={ingredients} scale={scale} />
      <button
        onClick={() => void handleAddToGroceryList()}
        disabled={adding}
        className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        {adding ? "Adding..." : "Add Ingredients to Grocery List"}
      </button>
      <InstructionsList instructions={recipe.instructions} />
    </div>
  );
}
