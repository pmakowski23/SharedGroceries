import { describe, expect, it } from "vitest";
import {
  ingredientMacroRegenerationPrompt,
  recipeGenerationPrompt,
  recipeRegenerationPromptForMissingItems,
} from "./recipePrompts";

describe("recipe prompts macro shape contract", () => {
  it("requires exactly one macro set and short unit names in generation prompt", () => {
    const prompt = recipeGenerationPrompt("Simple soup", "", 4);
    expect(prompt).toContain("count ONLY the oil absorbed by the food");
    expect(prompt).toContain("Assume 5% of total frying oil is absorbed");
    expect(prompt).toContain("Do NOT count full pan/deep-fry oil volume");
    expect(prompt).toContain('For unit "g" or "ml", return ONLY per-100 fields');
    expect(prompt).toContain("For non g/ml units");
    expect(prompt).toContain("Never return both per-100 and per-unit field sets");
    expect(prompt).toContain('Use short unit names only: "g" and "ml"');
    expect(prompt).toContain('Always set "servings" to exactly 4.');
  });

  it("includes strict preserve and to-taste rules for structured recipe import", () => {
    const prompt = recipeGenerationPrompt("Burger with sauce", "", 1, {
      strictPreserve: true,
    });
    expect(prompt).toContain("Strict preserve mode is enabled");
    expect(prompt).toContain("Do NOT summarize or collapse source steps");
    expect(prompt).toContain("Preserve sub-recipe sections as separate entries");
    expect(prompt).toContain("Include part-specific instructions");
    expect(prompt).toContain("include them with small estimated amounts");
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

  it("builds retry prompt with missing ingredient and step details", () => {
    const prompt = recipeRegenerationPromptForMissingItems(
      "burger recipe input",
      '{"name":"burger"}',
      ["ketchup", "mustard"],
      ["toast buns"],
      ["burger sauce"],
    );
    expect(prompt).toContain("Missing ingredient tokens: ketchup, mustard");
    expect(prompt).toContain("Missing instruction tokens/phases: toast buns");
    expect(prompt).toContain("Missing section/component headers: burger sauce");
    expect(prompt).toContain("Include \"to taste\" seasoning lines");
  });
});
