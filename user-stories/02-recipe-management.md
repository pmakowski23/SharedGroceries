# Recipe Management

## Summary
Users can browse, create, and manage recipes. Each recipe has ingredients with per-ingredient macros, cooking steps, and serving info.

## Recipe Structure
- **Name** — recipe title
- **Description** — short summary
- **Servings** — default serving count
- **Instructions** — ordered list of cooking steps
- **Ingredients** — list with: name, amount, unit, and macros per unit (kcal, protein, carbs, fat)
- **Total Macros** — auto-calculated from ingredients (not stored independently)

## Features
- List all saved recipes with search/filter.
- View recipe detail: steps, ingredients, macros per serving.
- Create recipe manually (name, steps, ingredients with macros).
- Edit / delete existing recipes.
- Add recipe ingredients directly to the grocery list (scaled by serving count).

## Macro Calculation
All macros are stored per ingredient unit. Total recipe macros and per-serving macros are computed at read time so that editing an ingredient automatically updates totals.
