import { MealGoalSettingsForm } from "../components/meal-goals/MealGoalSettingsForm";
import { PageHeader } from "../components/PageHeader";

export function MealGoalSettingsPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <PageHeader title="Meal Goal Settings" />
      <MealGoalSettingsForm />
    </div>
  );
}
