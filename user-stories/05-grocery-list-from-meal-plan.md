# Grocery List from Meal Plan

## Summary
One-tap generation of a grocery list that aggregates all ingredients from the current week's meal plan.

## Flow
1. User taps "Generate Grocery List" in the meal planner.
2. System collects every ingredient from every planned meal (scaled by servings).
3. Duplicate ingredients are aggregated (summed amounts).
4. Items are added to the grocery list, auto-categorized using existing AI categorization.

## Details
- Only non-completed items are considered; already-existing items are not duplicated.
- Amounts and units are included in the grocery item name for clarity (e.g. "Chicken breast (400 g)").
- Uses the current store context from app settings.
- Manual add-item entry on the grocery list uses a compact single-line input with a send-style arrow button beside it.
