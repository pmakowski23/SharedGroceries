# AI Recipe Generation

## Summary
Users can describe a meal in free text and the app generates a full recipe with steps, ingredients, per-ingredient macros, and meal-type tags using Mistral AI.

## Flow
1. User enters a description (e.g. "high-protein chicken stir fry for 2").
2. App sends the description to a Convex action that calls Mistral.
3. AI returns structured JSON: name, description, servings, instructions, ingredients with macros, and meal tags.
4. The generated recipe is saved and can be edited before use.

## AI Response Format
```json
{
  "name": "...",
  "description": "...",
  "servings": 2,
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
