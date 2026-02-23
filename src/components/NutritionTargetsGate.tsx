import { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MealGoalSettingsForm } from "./meal-goals/MealGoalSettingsForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function NutritionTargetsGate({ children }: { children: ReactNode }) {
  const settings = useQuery(api.nutritionGoals.getSettings, {});
  const targets = settings?.targets;
  const hasTargets =
    !!targets &&
    targets.kcal !== null &&
    targets.protein !== null &&
    targets.carbs !== null &&
    targets.fat !== null;

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasTargets) {
    return (
      <Dialog open>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl [&>button]:hidden"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Set your nutrition targets</DialogTitle>
            <DialogDescription>
              Targets are required before using the app. Fill your profile, then save
              your daily macros.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <MealGoalSettingsForm />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
