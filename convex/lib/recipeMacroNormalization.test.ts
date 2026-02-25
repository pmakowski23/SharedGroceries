import { describe, expect, it } from "vitest";
import {
  type NormalizedIngredientMacros,
  normalizeAndScaleIngredientMacros,
} from "./recipeMacroNormalization";

function almostEqual(actual: number, expected: number, epsilon = 1e-3) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(epsilon);
}

function expectMassMacros(
  normalized: NormalizedIngredientMacros,
): Extract<NormalizedIngredientMacros, { kcalPer100: number }> {
  expect("kcalPer100" in normalized).toBe(true);
  if (!("kcalPer100" in normalized)) {
    throw new Error("Expected mass-volume macro shape");
  }
  return normalized;
}

describe("normalizeAndScaleIngredientMacros fixtures", () => {
  it("keeps tiny chicken values when they appear intentional", () => {
    const normalized = normalizeAndScaleIngredientMacros({
      name: "boneless, skinless chicken breast",
      amount: 170,
      unit: "g",
      kcalPer100: 0.0157,
      proteinPer100: 0.031,
      carbsPer100: 0,
      fatPer100: 0.0036,
    });

    expect(normalized.correctionFactor).toBe(1);
    expect(normalized.kcalWasRepaired).toBe(false);
    const mass = expectMassMacros(normalized);
    almostEqual(mass.proteinPer100, 0.031);
    almostEqual(mass.fatPer100, 0.0036);
    almostEqual(mass.kcalPer100, 0.0157);
  });

  it("keeps skim milk kcal when carbs are likely underreported", () => {
    const normalized = normalizeAndScaleIngredientMacros({
      name: "skim milk",
      amount: 60,
      unit: "ml",
      kcalPer100: 0.33,
      proteinPer100: 0.032,
      carbsPer100: 0.005,
      fatPer100: 0.001,
    });

    expect(normalized.correctionFactor).toBe(1);
    expect(normalized.kcalWasRepaired).toBe(false);
    almostEqual(expectMassMacros(normalized).kcalPer100, 0.33);
  });

  it("avoids overscaling cauliflower protein", () => {
    const normalized = normalizeAndScaleIngredientMacros({
      name: "cauliflower",
      amount: 227,
      unit: "g",
      kcalPer100: 0.025,
      proteinPer100: 0.011,
      carbsPer100: 0.005,
      fatPer100: 0.0003,
    });

    expect(normalized.correctionFactor).toBe(1);
    expect(normalized.kcalWasRepaired).toBe(false);
    const mass = expectMassMacros(normalized);
    almostEqual(mass.proteinPer100, 0.011);
    almostEqual(mass.kcalPer100, 0.025);
  });

  it("rescales pasta while preserving pecorino when plausibly per-100", () => {
    const pasta = normalizeAndScaleIngredientMacros({
      name: "dried fettuccine pasta",
      amount: 56.5,
      unit: "g",
      kcalPer100: 3.64,
      proteinPer100: 0.12,
      carbsPer100: 0.75,
      fatPer100: 0.01,
    });
    const pecorino = normalizeAndScaleIngredientMacros({
      name: "Pecorino Romano",
      amount: 5.5,
      unit: "g",
      kcalPer100: 4.1,
      proteinPer100: 0.36,
      carbsPer100: 0,
      fatPer100: 0.29,
    });

    expect(pasta.correctionFactor).toBe(100);
    expect(pasta.kcalWasRepaired).toBe(false);
    almostEqual(expectMassMacros(pasta).kcalPer100, 364);
    expect(pecorino.correctionFactor).toBe(1);
    expect(pecorino.kcalWasRepaired).toBe(false);
    almostEqual(expectMassMacros(pecorino).kcalPer100, 4.1);
  });

  it("repairs low kcal for parmesan and keeps garlic unchanged", () => {
    const parmesan = normalizeAndScaleIngredientMacros({
      name: "Parmigiano Reggiano",
      amount: 5.5,
      unit: "g",
      kcalPer100: 0.43,
      proteinPer100: 0.1,
      carbsPer100: 0,
      fatPer100: 0.036,
    });
    const garlic = normalizeAndScaleIngredientMacros({
      name: "garlic",
      amount: 1,
      unit: "g",
      kcalPer100: 0.0042,
      proteinPer100: 0.001,
      carbsPer100: 0.009,
      fatPer100: 0.0001,
    });

    expect(parmesan.correctionFactor).toBe(1);
    expect(parmesan.kcalWasRepaired).toBe(true);
    almostEqual(expectMassMacros(parmesan).kcalPer100, 0.724, 1e-3);
    expect(garlic.correctionFactor).toBe(1);
    expect(garlic.kcalWasRepaired).toBe(false);
    almostEqual(expectMassMacros(garlic).kcalPer100, 0.0042, 1e-4);
  });

  it("uses per-unit values for non g/ml units like garlic clove", () => {
    const normalized = normalizeAndScaleIngredientMacros({
      name: "garlic",
      amount: 1,
      unit: "clove",
      kcalPerUnit: 4.5,
      proteinPerUnit: 0.2,
      carbsPerUnit: 1,
      fatPerUnit: 0,
    });

    expect(normalized.correctionFactor).toBe(1);
    expect(normalized.kcalWasRepaired).toBe(false);
    expect("kcalPer100" in normalized).toBe(false);
    expect("kcalPerUnit" in normalized).toBe(true);
    if ("kcalPerUnit" in normalized) {
      almostEqual(normalized.kcalPerUnit, 4.5, 1e-4);
      expect(normalized.unit).toBe("clove");
    }
  });

  it("normalizes long mass units to short names", () => {
    const normalized = normalizeAndScaleIngredientMacros({
      name: "olive oil",
      amount: 15,
      unit: "milliliters",
      kcalPer100: 884,
      proteinPer100: 0,
      carbsPer100: 0,
      fatPer100: 100,
    });

    expect("kcalPer100" in normalized).toBe(true);
    expect(normalized.unit).toBe("ml");
  });
});
