import { MealGoalSettingsForm } from "../components/meal-goals/MealGoalSettingsForm";

export function MealGoalSettingsPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Meal Goal Settings</h1>
      <MealGoalSettingsForm />
    </div>
  );
}
