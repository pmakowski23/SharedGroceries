import { ingredientMacrosForAmount } from "./ingredientNutrition";

export type MacroTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type RecipePartLike = {
  _id: string;
  name: string;
  scale: number;
  yieldAmount?: number;
  yieldUnit?: string;
};

export type RecipeIngredientLike = {
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

function emptyMacros(): MacroTotals {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

function add(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

function scale(macros: MacroTotals, factor: number): MacroTotals {
  return {
    kcal: macros.kcal * factor,
    protein: macros.protein * factor,
    carbs: macros.carbs * factor,
    fat: macros.fat * factor,
  };
}

export function computePartAwareMacros(
  parts: Array<RecipePartLike>,
  ingredients: Array<RecipeIngredientLike>,
) {
  const partById = new Map(parts.map((part) => [part._id, part]));
  const referencedSources = new Set(
    ingredients
      .filter((ingredient) => typeof ingredient.sourcePartId === "string")
      .map((ingredient) => ingredient.sourcePartId as string),
  );

  const prepByPartId: Record<string, MacroTotals> = {};
  const consumedByPartId: Record<string, MacroTotals> = {};
  for (const part of parts) {
    prepByPartId[part._id] = emptyMacros();
    consumedByPartId[part._id] = emptyMacros();
  }

  for (const ingredient of ingredients) {
    if (!ingredient.partId || ingredient.sourcePartId) continue;
    const part = partById.get(ingredient.partId);
    if (!part) continue;
    prepByPartId[part._id] = add(
      prepByPartId[part._id],
      scale(ingredientMacrosForAmount(ingredient), part.scale),
    );
  }

  for (const ingredient of ingredients) {
    if (!ingredient.partId) continue;
    const consumerPart = partById.get(ingredient.partId);
    if (!consumerPart) continue;
    let contribution: MacroTotals | null = null;

    if (
      ingredient.sourcePartId &&
      typeof ingredient.usedAmount === "number" &&
      ingredient.usedAmount > 0
    ) {
      const sourcePart = partById.get(ingredient.sourcePartId);
      if (
        sourcePart &&
        typeof sourcePart.yieldAmount === "number" &&
        sourcePart.yieldAmount > 0 &&
        sourcePart.yieldUnit === ingredient.usedUnit
      ) {
        const ratio =
          (ingredient.usedAmount * consumerPart.scale) /
          Math.max(0.000001, sourcePart.yieldAmount * sourcePart.scale);
        contribution = scale(prepByPartId[sourcePart._id], ratio);
      }
    }

    if (!contribution) {
      if (!ingredient.sourcePartId && referencedSources.has(ingredient.partId)) {
        continue;
      }
      contribution = scale(ingredientMacrosForAmount(ingredient), consumerPart.scale);
    }

    consumedByPartId[consumerPart._id] = add(consumedByPartId[consumerPart._id], contribution);
  }

  const total = Object.values(consumedByPartId).reduce((acc, part) => add(acc, part), emptyMacros());
  return { total, prepByPartId, consumedByPartId };
}
