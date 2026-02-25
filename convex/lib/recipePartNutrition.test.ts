import { describe, expect, it } from "vitest";
import { computeRecipePartMacros } from "./recipePartNutrition";

describe("recipePartNutrition", () => {
  it("counts only consumed portion from source part", () => {
    const parts = [
      {
        _id: "burger",
        scale: 1,
      },
      {
        _id: "sauce",
        scale: 1,
        yieldAmount: 200,
        yieldUnit: "g",
      },
    ];
    const ingredients = [
      {
        partId: "burger",
        name: "beef",
        amount: 100,
        unit: "g",
        kcalPer100: 250,
        proteinPer100: 20,
        carbsPer100: 0,
        fatPer100: 20,
      },
      {
        partId: "burger",
        name: "burger sauce",
        amount: 1,
        unit: "tbsp",
        sourcePartId: "sauce",
        usedAmount: 15,
        usedUnit: "g",
        kcalPerUnit: 0,
        proteinPerUnit: 0,
        carbsPerUnit: 0,
        fatPerUnit: 0,
      },
      {
        partId: "sauce",
        name: "mayonnaise",
        amount: 200,
        unit: "g",
        kcalPer100: 680,
        proteinPer100: 1,
        carbsPer100: 1,
        fatPer100: 75,
      },
    ];

    const result = computeRecipePartMacros(parts, ingredients);
    // 100g beef (250 kcal) + 15g of 200g mayo batch (102 kcal).
    expect(Math.round(result.total.kcal)).toBe(352);
  });
});
