import { useMemo, useState } from "react";
import type { MacroTotals } from "../lib/nutrition";
import { computePartAwareMacros } from "../lib/recipePartNutrition";

type IngredientNutrition = {
  _id: string;
  partId?: string;
  sourcePartId?: string;
  usedAmount?: number;
  usedUnit?: string;
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

type RecipePartNutrition = {
  _id: string;
  name: string;
  scale: number;
  yieldAmount?: number;
  yieldUnit?: string;
};

export function useScaledRecipeNutrition(
  baseServings: number,
  parts: Array<RecipePartNutrition>,
  ingredients: Array<IngredientNutrition>,
) {
  const [servings, setServings] = useState<number | null>(null);
  const [partScaleOverrides, setPartScaleOverrides] = useState<Record<string, number>>({});

  const displayServings = servings ?? baseServings;
  const scale = displayServings / baseServings;

  const effectiveParts = useMemo(() => {
    if (parts.length === 0) {
      return [{ _id: "legacy-main", name: "Main", scale: 1 }];
    }
    return parts.map((part) => ({
      ...part,
      scale: partScaleOverrides[part._id] ?? part.scale,
    }));
  }, [parts, partScaleOverrides]);

  const totalMacros = useMemo<MacroTotals>(() => {
    const effectiveIngredients = ingredients.map((ingredient) => ({
      ...ingredient,
      partId: ingredient.partId ?? "legacy-main",
    }));
    const base = computePartAwareMacros(effectiveParts, effectiveIngredients).total;
    return {
      kcal: base.kcal * scale,
      protein: base.protein * scale,
      carbs: base.carbs * scale,
      fat: base.fat * scale,
    };
  }, [effectiveParts, ingredients, scale]);

  const setPartScale = (partId: string, nextScale: number) => {
    setPartScaleOverrides((prev) => ({
      ...prev,
      [partId]: Math.max(0.1, nextScale),
    }));
  };

  return {
    servings,
    setServings,
    displayServings,
    scale,
    totalMacros,
    partScaleOverrides,
    effectiveParts,
    setPartScale,
  };
}
