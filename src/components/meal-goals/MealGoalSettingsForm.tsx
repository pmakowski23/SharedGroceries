import { useState } from "react";
import { DailyTargetsSection } from "./DailyTargetsSection";
import { ProfileSection } from "./ProfileSection";
import { SuggestedTargetsSection } from "./SuggestedTargetsSection";
import { PreferencesSection } from "./PreferencesSection";
import type {
  ActivityLevel,
  DietPreference,
  GoalDirection,
} from "../../hooks/useMealGoalSettings";
import { useMealGoalSettings } from "../../hooks/useMealGoalSettings";

const activityOptions: ReadonlyArray<{ value: ActivityLevel; label: string }> = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Lightly active" },
  { value: "moderate", label: "Moderately active" },
  { value: "active", label: "Active" },
  { value: "veryActive", label: "Very active" },
];

const goalOptions: ReadonlyArray<{ value: GoalDirection; label: string }> = [
  { value: "lose", label: "Lose fat" },
  { value: "maintain", label: "Maintain weight" },
  { value: "gain", label: "Gain mass" },
];

const dietOptions: ReadonlyArray<{ value: DietPreference; label: string }> = [
  { value: "none", label: "No preference" },
  { value: "moreVegetarian", label: "More vegetarian" },
  { value: "moreVegan", label: "More vegan" },
  { value: "vegetarian", label: "Vegetarian only" },
  { value: "vegan", label: "Vegan only" },
];

export function MealGoalSettingsForm() {
  const { settings, suggestion, isLoadingSettings } = useMealGoalSettings();
  const [applySuggestionVersion, setApplySuggestionVersion] = useState(0);

  if (isLoadingSettings || !settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <ProfileSection
        profile={settings.profile}
        activityOptions={activityOptions}
        goalOptions={goalOptions}
      />
      <SuggestedTargetsSection
        suggestion={suggestion}
        onApplySuggestion={() =>
          setApplySuggestionVersion((version) => version + 1)
        }
      />
      <DailyTargetsSection
        targets={settings.targets}
        suggestion={suggestion}
        applySuggestionVersion={applySuggestionVersion}
      />
      <PreferencesSection
        preferences={settings.preferences}
        dietOptions={dietOptions}
      />
    </>
  );
}
