import { describe, expect, it } from "vitest";
import {
  detectStructuredRecipeInput,
  evaluateRecipeImportCompleteness,
} from "./recipeImportValidation";

const burgerSource = `
Burger:

5 oz (142g) 75/25 ground beef
1 tsp (3g) black pepper
1 tsp (3g) kosher salt
1 slice American cheese
1 Tbsp (15g) burger sauce
1 hamburger bun
Burger Sauce:

1/2 cup (145g) ketchup
1/2 cup (145g) mustard
3/4 cup (217g) mayonnaise
2 tsp (30g) Worcestershire
Kosher salt to taste
Pepper to taste
Directions
Burger:
Preheat your oven to 250F.
Place the patty on a baking tray.
Burger Sauce:
In a small bowl combine all ingredients.
Assembly:
Toast buns.
Spread the sauce on the top half of the bun.
`;

describe("recipe import validation", () => {
  it("detects structured recipe input", () => {
    expect(detectStructuredRecipeInput(burgerSource)).toBe(true);
    expect(detectStructuredRecipeInput("high protein pasta for dinner")).toBe(
      false,
    );
  });

  it("detects missing sauce ingredients and assembly phases", () => {
    const report = evaluateRecipeImportCompleteness(burgerSource, {
      ingredients: [
        { name: "ground beef" },
        { name: "american cheese" },
        { name: "hamburger bun" },
      ],
      instructions: [
        "Preheat oven and cook patty.",
        "Finish burger in cast iron and melt cheese.",
      ],
    });

    expect(report.isStructuredRecipe).toBe(true);
    expect(report.missingIngredients.some((token) => token.includes("ketchup"))).toBe(
      true,
    );
    expect(report.missingIngredients.some((token) => token.includes("mustard"))).toBe(
      true,
    );
    expect(report.missingStepTokens.some((token) => token.includes("toast buns"))).toBe(
      true,
    );
  });

  it("accepts complete output with sauce and assembly steps retained", () => {
    const report = evaluateRecipeImportCompleteness(burgerSource, {
      ingredients: [
        { name: "75/25 ground beef" },
        { name: "black pepper" },
        { name: "kosher salt" },
        { name: "american cheese" },
        { name: "burger sauce" },
        { name: "hamburger bun" },
        { name: "ketchup" },
        { name: "mustard" },
        { name: "mayonnaise" },
        { name: "worcestershire sauce" },
      ],
      instructions: [
        "Preheat your oven and cook the patty on a tray.",
        "Combine ketchup, mustard, mayonnaise, worcestershire, salt, and pepper to make burger sauce.",
        "Toast buns and spread sauce on the top half, then assemble with patty.",
      ],
    });

    expect(report.missingIngredients).toEqual([]);
    expect(report.missingStepTokens).toEqual([]);
  });
});
