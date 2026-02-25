import {
  isGramOrMilliliterUnit,
  normalizeUnitShortName,
  type MassVolumeIngredientMacros,
  type PerUnitIngredientMacros,
} from "./ingredientNutrition";

export type IngredientMacroValues = MassVolumeIngredientMacros | PerUnitIngredientMacros;

export type IngredientMacroInput = {
  name: string;
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

export type NormalizedIngredientMacros = IngredientMacroValues & {
  correctionFactor: 1 | 10 | 100;
  kcalWasRepaired: boolean;
};

function normalizeMacroValue(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field} in AI response`);
  }
  return value;
}

function macroCaloriesMass(values: MassVolumeIngredientMacros): number {
  return values.proteinPer100 * 4 + values.carbsPer100 * 4 + values.fatPer100 * 9;
}

function macroCaloriesPerUnit(values: PerUnitIngredientMacros): number {
  return values.proteinPerUnit * 4 + values.carbsPerUnit * 4 + values.fatPerUnit * 9;
}

function isNaturallyNearZeroIngredient(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.includes("water") ||
    normalized.includes("salt") ||
    normalized.includes("black coffee") ||
    normalized.includes("unsweetened tea") ||
    normalized.includes("vinegar")
  );
}

function isLikelyCalorieDenseIngredient(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  const keywords = [
    "cheese",
    "parmesan",
    "pecorino",
    "mozzarella",
    "cheddar",
    "chicken",
    "beef",
    "pork",
    "turkey",
    "salmon",
    "tuna",
    "meat",
    "pasta",
    "rice",
    "flour",
    "bread",
    "oat",
    "nut",
    "seed",
    "oil",
    "butter",
    "cream",
    "chocolate",
    "avocado",
  ];
  return keywords.some((keyword) => normalized.includes(keyword));
}

function isLikelyProduceIngredient(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  const produceKeywords = [
    "cauliflower",
    "broccoli",
    "zucchini",
    "spinach",
    "lettuce",
    "cucumber",
    "tomato",
    "pepper",
    "onion",
    "garlic",
    "carrot",
    "celery",
    "cabbage",
    "kale",
    "eggplant",
    "mushroom",
  ];
  return produceKeywords.some((keyword) => normalized.includes(keyword));
}

function chooseBestCorrectionFactor(
  ingredient: IngredientMacroInput,
  baseValues: MassVolumeIngredientMacros,
): 1 | 10 | 100 {
  const candidates: Array<1 | 10 | 100> = [1, 10, 100];
  const isDense = isLikelyCalorieDenseIngredient(ingredient.name);
  const isProduce = isLikelyProduceIngredient(ingredient.name);
  let best = { factor: 1 as 1 | 10 | 100, score: Number.POSITIVE_INFINITY };

  for (const factor of candidates) {
    const scaled: MassVolumeIngredientMacros = {
      amount: ingredient.amount,
      unit: "g",
      kcalPer100: baseValues.kcalPer100 * factor,
      proteinPer100: baseValues.proteinPer100 * factor,
      carbsPer100: baseValues.carbsPer100 * factor,
      fatPer100: baseValues.fatPer100 * factor,
    };
    const massPer100 = scaled.proteinPer100 + scaled.carbsPer100 + scaled.fatPer100;
    const kcalFromMacros = macroCaloriesMass(scaled);
    const kcalConsistencyError =
      Math.abs(scaled.kcalPer100 - kcalFromMacros) / Math.max(kcalFromMacros, 0.05);

    if (massPer100 <= 0 || massPer100 > 105 || scaled.kcalPer100 > 900) {
      continue;
    }

    if (isProduce && (scaled.proteinPer100 > 6 || scaled.fatPer100 > 4)) {
      continue;
    }

    let score = kcalConsistencyError;
    if (factor !== 1) {
      score += 0.02;
    }
    if (isDense && ingredient.amount >= 10 && massPer100 < 8) {
      score += 2;
    }

    if (score < best.score) {
      best = { factor, score };
    }
  }

  return best.factor;
}

function repairMassKcal(values: MassVolumeIngredientMacros): {
  kcalPer100: number;
  kcalWasRepaired: boolean;
} {
  const kcalFromMacros = macroCaloriesMass(values);
  if (kcalFromMacros <= 0.01) {
    return { kcalPer100: values.kcalPer100, kcalWasRepaired: false };
  }
  if (values.kcalPer100 >= kcalFromMacros) {
    return { kcalPer100: values.kcalPer100, kcalWasRepaired: false };
  }
  const relativeError =
    Math.abs(values.kcalPer100 - kcalFromMacros) / Math.max(kcalFromMacros, 0.05);
  if (relativeError <= 0.35) {
    return { kcalPer100: values.kcalPer100, kcalWasRepaired: false };
  }
  return { kcalPer100: kcalFromMacros, kcalWasRepaired: true };
}

function repairPerUnitKcal(values: PerUnitIngredientMacros): {
  kcalPerUnit: number;
  kcalWasRepaired: boolean;
} {
  const kcalFromMacros = macroCaloriesPerUnit(values);
  if (kcalFromMacros <= 0.01) {
    return { kcalPerUnit: values.kcalPerUnit, kcalWasRepaired: false };
  }
  if (values.kcalPerUnit >= kcalFromMacros) {
    return { kcalPerUnit: values.kcalPerUnit, kcalWasRepaired: false };
  }
  const relativeError =
    Math.abs(values.kcalPerUnit - kcalFromMacros) / Math.max(kcalFromMacros, 0.05);
  if (relativeError <= 0.35) {
    return { kcalPerUnit: values.kcalPerUnit, kcalWasRepaired: false };
  }
  return { kcalPerUnit: kcalFromMacros, kcalWasRepaired: true };
}

function toMassMacroValues(ingredient: IngredientMacroInput): MassVolumeIngredientMacros {
  if (!("kcalPer100" in ingredient)) {
    throw new Error(`Invalid per-unit macros for mass unit "${ingredient.unit}"`);
  }
  return {
    amount: ingredient.amount,
    unit: ingredient.unit,
    kcalPer100: normalizeMacroValue(ingredient.kcalPer100, "kcalPer100"),
    proteinPer100: normalizeMacroValue(ingredient.proteinPer100, "proteinPer100"),
    carbsPer100: normalizeMacroValue(ingredient.carbsPer100, "carbsPer100"),
    fatPer100: normalizeMacroValue(ingredient.fatPer100, "fatPer100"),
  };
}

function toPerUnitMacroValues(ingredient: IngredientMacroInput): PerUnitIngredientMacros {
  if (!("kcalPerUnit" in ingredient)) {
    throw new Error(`Invalid per-100 macros for non-mass unit "${ingredient.unit}"`);
  }
  return {
    amount: ingredient.amount,
    unit: ingredient.unit,
    kcalPerUnit: normalizeMacroValue(ingredient.kcalPerUnit, "kcalPerUnit"),
    proteinPerUnit: normalizeMacroValue(ingredient.proteinPerUnit, "proteinPerUnit"),
    carbsPerUnit: normalizeMacroValue(ingredient.carbsPerUnit, "carbsPerUnit"),
    fatPerUnit: normalizeMacroValue(ingredient.fatPerUnit, "fatPerUnit"),
  };
}

export function normalizeAndScaleIngredientMacros(
  ingredient: IngredientMacroInput,
): NormalizedIngredientMacros {
  const normalizedUnit = normalizeUnitShortName(ingredient.unit);
  if (!isGramOrMilliliterUnit(normalizedUnit)) {
    const perUnitValues = toPerUnitMacroValues({
      ...ingredient,
      unit: normalizedUnit,
    });
    const repaired = repairPerUnitKcal(perUnitValues);
    return {
      ...perUnitValues,
      unit: normalizedUnit,
      kcalPerUnit: repaired.kcalPerUnit,
      correctionFactor: 1,
      kcalWasRepaired: repaired.kcalWasRepaired,
    };
  }

  const macroValues = toMassMacroValues({
    ...ingredient,
    unit: normalizedUnit,
  });
  const macroMassPer100 =
    macroValues.proteinPer100 + macroValues.carbsPer100 + macroValues.fatPer100;
  const practicallyZero = macroValues.kcalPer100 <= 0.1 && macroMassPer100 <= 0.1;
  if (practicallyZero || isNaturallyNearZeroIngredient(ingredient.name)) {
    return { ...macroValues, correctionFactor: 1, kcalWasRepaired: false };
  }

  const correctionFactor = chooseBestCorrectionFactor(ingredient, macroValues);
  const scaledValues: IngredientMacroValues = {
    amount: ingredient.amount,
    unit: normalizedUnit,
    kcalPer100: macroValues.kcalPer100 * correctionFactor,
    proteinPer100: macroValues.proteinPer100 * correctionFactor,
    carbsPer100: macroValues.carbsPer100 * correctionFactor,
    fatPer100: macroValues.fatPer100 * correctionFactor,
  };
  const repaired = repairMassKcal(scaledValues);

  return {
    ...scaledValues,
    kcalPer100: repaired.kcalPer100,
    correctionFactor,
    kcalWasRepaired: repaired.kcalWasRepaired,
  };
}
