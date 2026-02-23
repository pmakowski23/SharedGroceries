# Meal Goal Settings and Day Fit Planner

- In goal settings, protein, carbs, and fat are edited independently (changing one does not auto-change the others).
- Suggested macro targets are shown as per-field grouped value chips next to protein/carbs/fat inputs for quick visual comparison while editing.
- kcal is derived from macros using `4*protein + 4*carbs + 9*fat` and shown as a whole number.
- In the day planner "Actual / Goal / Diff" cards, each card shows only `actual / goal`, and the card background fill shows progress toward goal (`actual / goal`, capped at 100%; under = blue, over = red, within tolerance = green).
- Targets are globally required: if missing, the app opens a blocking modal with the same profile + suggested goals + daily targets sections as the settings page, and the user must save targets before continuing.
