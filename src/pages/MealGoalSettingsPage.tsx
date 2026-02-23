import { DailyTargetsSection } from "../components/meal-goals/DailyTargetsSection";
import { ProfileSection } from "../components/meal-goals/ProfileSection";
import { SuggestedTargetsSection } from "../components/meal-goals/SuggestedTargetsSection";
import type { ActivityLevel, GoalDirection } from "../hooks/useMealGoalForm";
import { useMealGoalForm } from "../hooks/useMealGoalForm";

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

export function MealGoalSettingsPage() {
  const form = useMealGoalForm();

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Meal Goal Settings</h1>
      <ProfileSection
        form={form}
        activityOptions={activityOptions}
        goalOptions={goalOptions}
      />
      <SuggestedTargetsSection
        suggestion={form.suggestion}
        onApplySuggestion={form.applySuggestion}
      />
      <DailyTargetsSection form={form} />
    </div>
  );
}
