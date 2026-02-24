# AI Recipe Generation

## Summary
Users can describe a meal in free text and the app generates a full recipe with steps, ingredients, per-ingredient macros, and meal-type tags using Mistral AI.

## Flow
1. User enters a description (e.g. "high-protein chicken stir fry for 2").
2. User can enable an option to include nutrition goal context (profile + macro targets) in the AI prompt.
3. App sends the description (and optional goal context flag) to a Convex action that calls Mistral.
4. AI treats the description and optional nutrition goals as user preferences and returns structured JSON.
5. Generated recipes default to `servings: 1` so users can increase servings later.
6. The generated recipe is saved and can be edited before use.

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
      "kcalPerUnit": 1.65,
      "proteinPerUnit": 0.31,
      "carbsPerUnit": 0,
      "fatPerUnit": 0.036
    }
  ]
}
```

## Notes
- Macros are per single unit (e.g. per 1 g) so they can be recalculated when amounts change.
- Uses the same Mistral client already in the project (`@mistralai/mistralai`).
- Meal tags are used by the day planner so generated plans can prefer matching slot type (Breakfast/Lunch/Dinner/Snack).
- Goal context is optional and should not block generation when profile/targets are incomplete.
- Goal context should be interpreted as preferences/constraints, not ignored.
