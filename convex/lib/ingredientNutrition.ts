export type MassVolumeIngredientMacros = {
  amount: number;
  unit: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
};

export type PerUnitIngredientMacros = {
  amount: number;
  unit: string;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
};

export type StoredIngredientMacros = MassVolumeIngredientMacros | PerUnitIngredientMacros;

export function normalizeUnitShortName(unit: string): string {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "g" || normalized === "gram" || normalized === "grams") {
    return "g";
  }
  if (
    normalized === "ml" ||
    normalized === "milliliter" ||
    normalized === "milliliters"
  ) {
    return "ml";
  }
  return normalized;
}

export function isGramOrMilliliterUnit(unit: string): boolean {
  const normalized = normalizeUnitShortName(unit);
  return normalized === "g" || normalized === "ml";
}

export function normalizeIngredientMacroShape(
  ingredient: StoredIngredientMacros,
): StoredIngredientMacros {
  const unit = normalizeUnitShortName(ingredient.unit);
  const hasPer100 = "kcalPer100" in ingredient;
  const hasPerUnit = "kcalPerUnit" in ingredient;
  if (hasPer100 === hasPerUnit) {
    throw new Error("Ingredient must include exactly one macro set");
  }
  if (isGramOrMilliliterUnit(unit) && hasPerUnit) {
    throw new Error(`Unit "${unit}" requires per-100 macros`);
  }
  if (!isGramOrMilliliterUnit(unit) && hasPer100) {
    throw new Error(`Unit "${unit}" requires per-unit macros`);
  }
  return {
    ...ingredient,
    unit,
  };
}

export function scaleMacroByAmount(
  ingredient: StoredIngredientMacros,
  macro: "kcal" | "protein" | "carbs" | "fat",
): number {
  if ("kcalPer100" in ingredient) {
    let per100 = ingredient.fatPer100;
    if (macro === "kcal") per100 = ingredient.kcalPer100;
    else if (macro === "protein") per100 = ingredient.proteinPer100;
    else if (macro === "carbs") per100 = ingredient.carbsPer100;
    return (per100 * ingredient.amount) / 100;
  }
  let perUnit = ingredient.fatPerUnit;
  if (macro === "kcal") perUnit = ingredient.kcalPerUnit;
  else if (macro === "protein") perUnit = ingredient.proteinPerUnit;
  else if (macro === "carbs") perUnit = ingredient.carbsPerUnit;
  return perUnit * ingredient.amount;
}

export function ingredientMacrosForAmount(ingredient: StoredIngredientMacros) {
  return {
    kcal: scaleMacroByAmount(ingredient, "kcal"),
    protein: scaleMacroByAmount(ingredient, "protein"),
    carbs: scaleMacroByAmount(ingredient, "carbs"),
    fat: scaleMacroByAmount(ingredient, "fat"),
  };
}
