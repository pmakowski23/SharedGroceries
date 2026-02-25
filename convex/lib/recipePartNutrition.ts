import { ingredientMacrosForAmount } from "./ingredientNutrition";

type MacroTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

type RecipePartLike = {
  _id: string;
  scale: number;
  yieldAmount?: number;
  yieldUnit?: string;
};

type RecipeIngredientLike = {
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

function addMacroTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

function scaleMacros(macros: MacroTotals, scale: number): MacroTotals {
  return {
    kcal: macros.kcal * scale,
    protein: macros.protein * scale,
    carbs: macros.carbs * scale,
    fat: macros.fat * scale,
  };
}

export function computeRecipePartMacros(
  parts: Array<RecipePartLike>,
  ingredients: Array<RecipeIngredientLike>,
): {
  total: MacroTotals;
  prepByPartId: Record<string, MacroTotals>;
  consumedByPartId: Record<string, MacroTotals>;
} {
  const partById = new Map(parts.map((part) => [part._id, part]));
  const referencedSourcePartIds = new Set(
    ingredients
      .filter((ingredient) => typeof ingredient.sourcePartId === "string")
      .map((ingredient) => ingredient.sourcePartId as string),
  );

  const prepByPartId: Record<string, MacroTotals> = {};
  for (const part of parts) {
    prepByPartId[part._id] = emptyMacros();
  }

  for (const ingredient of ingredients) {
    if (!ingredient.partId) continue;
    if (ingredient.sourcePartId) continue;
    const part = partById.get(ingredient.partId);
    if (!part) continue;
    const base = ingredientMacrosForAmount(ingredient);
    const scaled = scaleMacros(base, part.scale);
    prepByPartId[part._id] = addMacroTotals(prepByPartId[part._id], scaled);
  }

  const consumedByPartId: Record<string, MacroTotals> = {};
  for (const part of parts) {
    consumedByPartId[part._id] = emptyMacros();
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
      const sourcePrep = sourcePart ? prepByPartId[sourcePart._id] : null;
      const hasYield =
        sourcePart &&
        typeof sourcePart.yieldAmount === "number" &&
        sourcePart.yieldAmount > 0 &&
        typeof sourcePart.yieldUnit === "string" &&
        sourcePart.yieldUnit === ingredient.usedUnit;
      if (sourcePart && sourcePrep && hasYield) {
        const sourceYieldScaled = (sourcePart.yieldAmount as number) * sourcePart.scale;
        const usedAmountScaled = ingredient.usedAmount * consumerPart.scale;
        const ratio = usedAmountScaled / Math.max(0.000001, sourceYieldScaled);
        contribution = scaleMacros(sourcePrep, ratio);
      }
    }

    if (!contribution) {
      // If this part is being consumed via usage links, ignore its prep ingredients
      // here to avoid double counting whole batch + plated portion.
      if (
        ingredient.sourcePartId === undefined &&
        ingredient.partId &&
        referencedSourcePartIds.has(ingredient.partId)
      ) {
        continue;
      }
      const base = ingredientMacrosForAmount(ingredient);
      contribution = scaleMacros(base, consumerPart.scale);
    }

    consumedByPartId[consumerPart._id] = addMacroTotals(
      consumedByPartId[consumerPart._id],
      contribution,
    );
  }

  const total = Object.values(consumedByPartId).reduce(
    (acc, partMacros) => addMacroTotals(acc, partMacros),
    emptyMacros(),
  );

  return {
    total,
    prepByPartId,
    consumedByPartId,
  };
}
