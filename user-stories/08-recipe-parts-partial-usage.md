# Recipe Parts With Partial Usage

## Summary

Users can define recipes in named parts (for example, `Burger`, `Burger Sauce`, `Assembly`) and scale each part independently while tracking macros based on what is actually consumed.

## Recipe Parts Model

- A recipe contains multiple parts ordered for display and editing.
- Each part has:
  - Name (for example, `Burger Sauce`)
  - Scale (relative factor for prep amount)
  - Optional yield (`yieldAmount`, `yieldUnit`) for prepared components
  - Ingredients with normal macro shape rules (`per100` for `g/ml`, `perUnit` otherwise)
- Parts can be linked through usage lines so one part consumes only a portion of another part's yield (for example, burger uses `15 g` sauce from a `200 g` sauce batch).

## Behavior

- Recipe detail shows grouped ingredients by part, not a single flat list.
- Users can edit part scale, ingredient amounts, and usage lines.
- Macro totals are computed from consumed amounts to avoid double counting full prep batches that are not fully plated.
- Grocery scaling respects part scales and usage lines.
- Meal planning uses consumed macro totals so targets are matched to realistic intake.

## AI Import

- Structured inputs with section headers (for example, `Burger:` and `Burger Sauce:`) are imported as distinct parts.
- Assembly lines that reference component usage (for example, `1 Tbsp burger sauce`) become usage links when possible.
- If a source recipe omits explicit usage, defaults are inferred conservatively and shown in the editor for manual correction.
