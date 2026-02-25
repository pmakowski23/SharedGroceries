# AI Recipe Generation

## Summary

Users can describe a meal in free text and the app generates a full recipe with steps, ingredients, per-ingredient macros, and meal-type tags using Mistral AI.

## Flow

1. User enters a description (e.g. "high-protein chicken stir fry for 2").
2. User can set how many servings the pasted/original recipe has before generating.
3. User can enable an option to include nutrition goal context (profile + macro targets) in the AI prompt.
4. App sends the description, selected servings, and optional goal context flag to a Convex action that calls Mistral.
5. AI treats the description and optional nutrition goals as user preferences and returns structured JSON.
6. Generated recipes persist the selected servings count.
7. The generated recipe is saved and can be edited before use.

## AI Response Format

```json
{
  "name": "...",
  "description": "...",
  "servings": 1,
  "mealTags": ["Dinner"],
  "instructions": ["Step 1...", "Step 2..."],
  "ingredients": [
    {
      "name": "chicken breast",
      "amount": 200,
      "unit": "g",
      "kcalPer100": 165,
      "proteinPer100": 31,
      "carbsPer100": 0,
      "fatPer100": 3.6
    }
  ]
}
```

## Notes

- For `g/ml` ingredients, macros are normalized to per 100 g/ml and recalculated using actual amounts in-app.
- For non-`g/ml` ingredients, values are kept per single unit in the same `*Per100` fields for compatibility.
- Uses the same Mistral client already in the project (`@mistralai/mistralai`).
- Meal tags are used by the day planner so generated plans can prefer matching slot type (Breakfast/Lunch/Dinner/Snack).
- Goal context is optional and should not block generation when profile/targets are incomplete.
- Goal context should be interpreted as preferences/constraints, not ignored.
