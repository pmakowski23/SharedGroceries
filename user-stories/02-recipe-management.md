# Recipe Management

## Summary

Users can browse, create, and manage recipes. Each recipe has ingredients with per-ingredient macros, cooking steps, and serving info.

## Recipe Structure

- **Name** — recipe title
- **Description** — short summary
- **Servings** — default serving count
- **Instructions** — ordered list of cooking steps
- **Ingredients** — list with: name, amount, unit, and macros (`kcalPer100`, `proteinPer100`, `carbsPer100`, `fatPer100`)
- **Total Macros** — auto-calculated from ingredients (not stored independently)

## Features

- List all saved recipes with search/filter.
- View recipe detail: steps, ingredients, macros per serving.
- View per-ingredient macros in recipe detail (kcal, protein, carbs, fat), scaled by selected servings.
- Edit ingredient amounts directly in recipe detail; changes persist and immediately update calculated macros.
- Regenerate macros for a single ingredient from recipe detail when values look incorrect.
- Create recipe manually (name, steps, ingredients with macros).
- Edit / delete existing recipes.
- Add recipe ingredients directly to the grocery list (scaled by serving count).

## Macro Calculation

Macros are normalized and stored in per-100 fields. For `g/ml` units values represent per 100 g/ml; for non-`g/ml` units values are kept per 1 unit in the same fields. Total recipe macros and per-serving macros are computed at read time from actual ingredient amounts so editing an ingredient automatically updates totals.
