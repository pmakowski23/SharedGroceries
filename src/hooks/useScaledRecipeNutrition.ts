import { useMemo, useState } from "react";
import type { MacroTotals } from "../lib/nutrition";

type IngredientNutrition = {
  amount: number;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
};

export function useScaledRecipeNutrition(
  baseServings: number,
  ingredients: Array<IngredientNutrition>,
) {
  const [servings, setServings] = useState<number | null>(null);

  const displayServings = servings ?? baseServings;
  const scale = displayServings / baseServings;

  const totalMacros = useMemo<MacroTotals>(() => {
    return ingredients.reduce(
      (acc, ing) => ({
        kcal: acc.kcal + ing.kcalPerUnit * ing.amount * scale,
        protein: acc.protein + ing.proteinPerUnit * ing.amount * scale,
        carbs: acc.carbs + ing.carbsPerUnit * ing.amount * scale,
        fat: acc.fat + ing.fatPerUnit * ing.amount * scale,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [ingredients, scale]);

  return { servings, setServings, displayServings, scale, totalMacros };
}
