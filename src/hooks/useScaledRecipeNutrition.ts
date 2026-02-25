import { useMemo, useState } from "react";
import type { MacroTotals } from "../lib/nutrition";
import { ingredientMacrosForAmount } from "../lib/ingredientNutrition";

type IngredientNutrition = {
  amount: number;
  unit: string;
} & (
  | {
      kcalPer100: number;
      proteinPer100: number;
      carbsPer100: number;
      fatPer100: number;
    }
  | {
      kcalPerUnit: number;
      proteinPerUnit: number;
      carbsPerUnit: number;
      fatPerUnit: number;
    }
  );

export function useScaledRecipeNutrition(
  baseServings: number,
  ingredients: Array<IngredientNutrition>,
) {
  const [servings, setServings] = useState<number | null>(null);

  const displayServings = servings ?? baseServings;
  const scale = displayServings / baseServings;

  const totalMacros = useMemo<MacroTotals>(() => {
    return ingredients.reduce(
      (acc, ing) => {
        const ingredientTotals = ingredientMacrosForAmount(ing);
        return {
          kcal: acc.kcal + ingredientTotals.kcal * scale,
          protein: acc.protein + ingredientTotals.protein * scale,
          carbs: acc.carbs + ingredientTotals.carbs * scale,
          fat: acc.fat + ingredientTotals.fat * scale,
        };
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [ingredients, scale]);

  return { servings, setServings, displayServings, scale, totalMacros };
}
