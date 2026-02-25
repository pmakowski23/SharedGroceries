import { describe, expect, it } from "vitest";
import { computePartAwareMacros } from "./recipePartNutrition";

describe("computePartAwareMacros", () => {
  it("scales usage by consumer and source part scales", () => {
    const parts = [
      { _id: "main", name: "Main", scale: 2 },
      { _id: "sauce", name: "Sauce", scale: 1, yieldAmount: 100, yieldUnit: "g" },
    ];
    const ingredients = [
      {
        _id: "1",
        partId: "main",
        sourcePartId: "sauce",
        usedAmount: 25,
        usedUnit: "g",
        name: "sauce on plate",
        amount: 1,
        unit: "tbsp",
        kcalPerUnit: 0,
        proteinPerUnit: 0,
        carbsPerUnit: 0,
        fatPerUnit: 0,
      },
      {
        _id: "2",
        partId: "sauce",
        name: "mayo",
        amount: 100,
        unit: "g",
        kcalPer100: 680,
        proteinPer100: 1,
        carbsPer100: 1,
        fatPer100: 75,
      },
    ];

    const result = computePartAwareMacros(parts, ingredients);
    // 25g usage at main scale 2 => 50g consumed from sauce batch.
    expect(Math.round(result.total.kcal)).toBe(340);
  });
});
