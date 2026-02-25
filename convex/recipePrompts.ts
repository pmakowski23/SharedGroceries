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
      "sourcePartName": "Burger Sauce",
      "usedAmount": 15,
      "usedUnit": "g",
      "kcalPer100": 165,
      "proteinPer100": 31,
      "carbsPer100": 0.0,
      "fatPer100": 3.6
    }`;

const ingredientJsonShapePerUnit = `{
      "name": "ingredient name",
      "amount": 2,
      "unit": "clove",
      "sourcePartName": "Burger Sauce",
      "usedAmount": 1,
      "usedUnit": "tbsp",
      "kcalPerUnit": 4.5,
      "proteinPerUnit": 0.2,
      "carbsPerUnit": 1.0,
      "fatPerUnit": 0.0
    }`;

export const recipeGenerationPrompt = (
  description: string,
  goalsContext: string,
  servings: number,
  options?: {
    strictPreserve?: boolean;
  },
): string => `
${options?.strictPreserve === true ? "Convert this pasted recipe into structured JSON without losing information." : "Generate a recipe based on this description:"} "${description}"
${goalsContext}

Return valid JSON with exactly this shape:
{
  "name": "Recipe name",
  "description": "Short description",
  "servings": ${servings},
  "mealTags": ["Dinner"],
  "instructions": ["Step 1", "Step 2"],
  "parts": [
    {
      "name": "Main",
      "position": 0,
      "scale": 1,
      "yieldAmount": 300,
      "yieldUnit": "g",
      "instructions": ["Prepare this part"],
      "ingredients": [
        ${ingredientJsonShapeMassVolume}
      ]
    }
  ]
}

Rules:
- Treat the meal description as the user's primary preference.
- If nutrition goals context is provided, treat it as user preferences/constraints and align ingredient choices and macros accordingly.
- Always set "servings" to exactly ${servings}.
- ${options?.strictPreserve === true ? "Strict preserve mode is enabled. Keep all ingredients and all cooking phases from the source recipe." : "When information is missing, infer realistic details that match the user's request."}
- ${options?.strictPreserve === true ? "Do NOT summarize or collapse source steps. Keep distinct procedural steps, including assembly and sub-recipes." : "Keep steps concise and practical."}
- ${options?.strictPreserve === true ? 'Preserve sub-recipe sections as separate entries inside "parts" (for example "Burger" and "Burger Sauce").' : 'Return one or more "parts" and place ingredients under the correct part.'}
- Include part-specific instructions in each part's \`instructions\` array, and keep top-level \`instructions\` as an overall combined flow.
- If one part consumes a portion of another prepared part, set \`sourcePartName\`, \`usedAmount\`, and \`usedUnit\` on that ingredient line.
- Do not use \`sourcePartName\` for normal ingredients that are bought directly.
- \`yieldAmount\` and \`yieldUnit\` describe total prepared output for that part when relevant (sauce, dressing, etc.).
- ${options?.strictPreserve === true ? 'For lines like "salt to taste" or "pepper to taste", include them with small estimated amounts and sensible macros.' : 'If ingredient amounts are vague, pick reasonable estimates.'}
- For oils listed for frying, count ONLY the oil absorbed by the food in ingredient amounts/macros.
- Assume 5% of total frying oil is absorbed unless absorbed oil amount is explicitly stated.
- Do NOT count full pan/deep-fry oil volume in nutrition totals (nobody consumes all frying oil used in cooking).
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

export const recipeRegenerationPromptForMissingItems = (
  originalPrompt: string,
  firstAttemptResponseText: string,
  missingIngredients: Array<string>,
  missingStepTokens: Array<string>,
  missingSectionTokens: Array<string>,
): string => `
You returned incomplete JSON for a recipe import. Retry and return complete JSON.

Original user recipe text:
"""${originalPrompt}"""

Your previous JSON response:
"""${firstAttemptResponseText}"""

Missing elements that MUST be represented:
- Missing ingredient tokens: ${missingIngredients.length > 0 ? missingIngredients.join(", ") : "none"}
- Missing instruction tokens/phases: ${missingStepTokens.length > 0 ? missingStepTokens.join(", ") : "none"}
- Missing section/component headers: ${missingSectionTokens.length > 0 ? missingSectionTokens.join(", ") : "none"}

Return valid JSON with the same schema as before.

Critical rules:
- Preserve all meaningful ingredients and procedural phases from the original source.
- Include "to taste" seasoning lines with small estimated amounts/macros.
- Keep assembly/finalization instructions when present.
- Do not include markdown fences.
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
