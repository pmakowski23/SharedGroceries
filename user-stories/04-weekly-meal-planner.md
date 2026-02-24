# Weekly Meal Planner

## Summary
Users assign recipes to days of the week across meal slots or auto-generate a day plan. The planner displays macro totals per meal and per day, plus planned-vs-target differences.

## Structure
- **Week view**: 7 days, each with meal slots (Breakfast, Lunch, Dinner, Snack).
- Each slot holds one recipe reference + serving count.
- Navigation lets you move between weeks.
- Each day can show a compliance status against kcal/protein/carbs/fat goals.

## Macro Display
- Per meal: kcal, protein, carbs, fat (computed from recipe ingredients x servings).
- Per day: sum of all meals that day.
- Per day goals: target kcal/protein/carbs/fat and actual-vs-target diffs.
- Day is **green** only when kcal + all macros are each within +/-5% of targets.

## Features
- Add a recipe to a slot via modal picker (pick from saved recipes).
- Change serving count per slot.
- Remove a recipe from a slot.
- Navigate weeks (previous / next).
- Generate plan for selected day using all available recipes while preferring meal-type matches (breakfast recipes for breakfast, etc.).
- Generate grocery list from the current week's plan.
