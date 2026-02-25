import { describe, expect, it } from "vitest";
import { ingredientMacroRegenerationPrompt, recipeGenerationPrompt } from "./recipePrompts";

describe("recipe prompts macro shape contract", () => {
  it("requires exactly one macro set and short unit names in generation prompt", () => {
    const prompt = recipeGenerationPrompt("Simple soup", "", 4);
    expect(prompt).toContain('For unit "g" or "ml", return ONLY per-100 fields');
    expect(prompt).toContain("For non g/ml units");
    expect(prompt).toContain("Never return both per-100 and per-unit field sets");
    expect(prompt).toContain('Use short unit names only: "g" and "ml"');
    expect(prompt).toContain('Always set "servings" to exactly 4.');
  });

  it("requires exactly one macro set in regeneration prompt", () => {
    const prompt = ingredientMacroRegenerationPrompt({
      name: "garlic",
      amount: 2,
      unit: "clove",
      kcalPerUnit: 4.5,
      proteinPerUnit: 0.2,
      carbsPerUnit: 1,
      fatPerUnit: 0,
    });
    expect(prompt).toContain('For unit "g" or "ml", return ONLY:');
    expect(prompt).toContain("For non g/ml units, return ONLY:");
    expect(prompt).toContain("Never return both per-100 and per-unit field sets");
    expect(prompt).toContain('Use short unit names only: "g" and "ml"');
  });
});
