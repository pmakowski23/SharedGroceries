type MassVolumeIngredientPromptInput = {
  name: string;
  amount: number;
  unit: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
};

type PerUnitIngredientPromptInput = {
  name: string;
  amount: number;
  unit: string;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
};

type IngredientPromptInput =
  | MassVolumeIngredientPromptInput
  | PerUnitIngredientPromptInput;

const ingredientJsonShapeMassVolume = `{
      "name": "ingredient name",
      "amount": 200,
      "unit": "g",
      "kcalPer100": 165,
      "proteinPer100": 31,
      "carbsPer100": 0.0,
      "fatPer100": 3.6
    }`;

const ingredientJsonShapePerUnit = `{
      "name": "ingredient name",
      "amount": 2,
      "unit": "clove",
      "kcalPerUnit": 4.5,
      "proteinPerUnit": 0.2,
      "carbsPerUnit": 1.0,
      "fatPerUnit": 0.0
    }`;

export const recipeGenerationPrompt = (
  description: string,
  goalsContext: string,
  servings: number,
): string => `
Generate a recipe based on this description: "${description}"
${goalsContext}

Return valid JSON with exactly this shape:
{
  "name": "Recipe name",
  "description": "Short description",
  "servings": ${servings},
  "mealTags": ["Dinner"],
  "instructions": ["Step 1", "Step 2"],
  "ingredients": [
    ${ingredientJsonShapeMassVolume}
  ]
}

Rules:
- Treat the meal description as the user's primary preference.
- If nutrition goals context is provided, treat it as user preferences/constraints and align ingredient choices and macros accordingly.
- Always set "servings" to exactly ${servings}.
- For unit "g" or "ml", return ONLY per-100 fields:
  - kcalPer100, proteinPer100, carbsPer100, fatPer100
- For non g/ml units (piece, tbsp, tsp, cup, clove, etc.), return ONLY per-unit fields:
  - kcalPerUnit, proteinPerUnit, carbsPerUnit, fatPerUnit
- Never return both per-100 and per-unit field sets for the same ingredient.
- If unit is not "g" or "ml", do NOT include any per-100 keys.
- If unit is "g" or "ml", do NOT include any per-unit keys.
- Any ingredient that violates these key rules is considered an invalid answer.
- Use short unit names only: "g" and "ml" (never "gram", "grams", "milliliter", etc.).
- Return numeric values only (no strings, ranges, approximations, or units in the values).
- Use sensible, real-world nutritional data.
- Set mealTags using one or more from: Breakfast, Lunch, Dinner, Snack.
- Include at least 3 ingredients and 3 steps.
- Return ONLY valid JSON, no markdown fences.
`;

export const ingredientMacroRegenerationPrompt = (
  ingredient: IngredientPromptInput,
): string => `
Figure out accurate nutrition values for: ${ingredient.name}.
Previously saved macros for this ingredient were flagged as incorrect; do not anchor to them.

Current ingredient details:
- name: ${ingredient.name}
- amount: ${ingredient.amount}
- unit: ${ingredient.unit}

Return valid JSON with exactly this shape:
One of:
${ingredientJsonShapeMassVolume}
or
${ingredientJsonShapePerUnit}

Rules:
- Keep "name", "amount", and "unit" exactly as provided.
- For unit "g" or "ml", return ONLY:
  - kcalPer100, proteinPer100, carbsPer100, fatPer100
- For non g/ml units, return ONLY:
  - kcalPerUnit, proteinPerUnit, carbsPerUnit, fatPerUnit
- Never return both per-100 and per-unit field sets.
- If unit is not "g" or "ml", do NOT include any per-100 keys.
- If unit is "g" or "ml", do NOT include any per-unit keys.
- If you are unsure, still return only one allowed key set based on the unit.
- Use short unit names only: "g" and "ml" (never long names).
- kcal should be consistent with macros using: kcal ≈ (4 * protein) + (4 * carbs) + (9 * fat), allowing small rounding variance.
- Return numeric values only (no strings, ranges, approximations, or units in the values).
- Use sensible, real-world nutritional data.
- Return ONLY valid JSON, no markdown fences.
`;
