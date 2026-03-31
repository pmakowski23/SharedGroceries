import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";

export type GoalDirection = "lose" | "maintain" | "gain";

export type DietPreference =
  | "none"
  | "moreVegetarian"
  | "moreVegan"
  | "vegetarian"
  | "vegan";

export function useMealGoalSettings() {
  const settings = useQuery(api.nutritionGoals.getSettings, {});
  const suggestion = useQuery(api.nutritionGoals.suggestTargets, {});

  return {
    settings,
    suggestion,
    isLoadingSettings: settings === undefined,
  };
}

type UseMealGoalSettingsResult = ReturnType<typeof useMealGoalSettings>;

export type MealGoalSettingsData = NonNullable<
  UseMealGoalSettingsResult["settings"]
>;

export type MealGoalSuggestionData = UseMealGoalSettingsResult["suggestion"];
