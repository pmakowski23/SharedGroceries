import { DailyTargetsSection } from "./DailyTargetsSection";
import { ProfileSection } from "./ProfileSection";
import type { ActivityLevel, GoalDirection } from "../../hooks/useMealGoalForm";
import { useMealGoalForm } from "../../hooks/useMealGoalForm";

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

export function MealGoalSettingsForm() {
  const form = useMealGoalForm();

  if (form.isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <ProfileSection
        form={form}
        activityOptions={activityOptions}
        goalOptions={goalOptions}
      />
      <DailyTargetsSection form={form} />
    </>
  );
}
