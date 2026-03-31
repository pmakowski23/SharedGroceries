import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DaySelector } from "../components/meal-planner/DaySelector";
import { GenerateActions } from "../components/meal-planner/GenerateActions";
import { MacroProgressCard } from "../components/meal-planner/MacroProgressCard";
import { MealSlots } from "../components/meal-planner/MealSlots";
import { WeekNavigator } from "../components/meal-planner/WeekNavigator";
import { PageHeader } from "../components/PageHeader";
import { useDayMacroStatus } from "../hooks/useDayMacroStatus";
import { useMealPlannerWeek } from "../hooks/useMealPlannerWeek";

export function MealPlannerPage() {
  const {
    weekOffset,
    setWeekOffset,
    selectedDay,
    setSelectedDay,
    weekDates,
    weekDateKeys,
    startDate,
    endDate,
    currentDateKey,
    weekLabel,
  } = useMealPlannerWeek();

  const mealPlan = useQuery(api.mealPlans.getWeek, { startDate, endDate });
  const familyPlanning = useQuery(api.nutritionGoals.getFamilyPlanningContext, {});
  const tolerancePct = familyPlanning?.targets.macroTolerancePct ?? 5;
  const targetMacros =
    familyPlanning?.targets.kcal !== null &&
    familyPlanning?.targets.protein !== null &&
    familyPlanning?.targets.carbs !== null &&
    familyPlanning?.targets.fat !== null
      ? {
          kcal: familyPlanning.targets.kcal,
          protein: familyPlanning.targets.protein,
          carbs: familyPlanning.targets.carbs,
          fat: familyPlanning.targets.fat,
        }
      : null;
  const { dayMacros, dayStatusByDate } = useDayMacroStatus({
    mealPlan,
    currentDateKey,
    weekDates,
    targetMacros,
    tolerancePct,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <PageHeader title="Meal Planner" />
      <WeekNavigator
        weekLabel={weekLabel}
        onPrevWeek={() => setWeekOffset(weekOffset - 1)}
        onNextWeek={() => setWeekOffset(weekOffset + 1)}
      />
      <DaySelector
        weekDates={weekDates}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        dayStatusByDate={dayStatusByDate}
      />
      <MacroProgressCard
        dayMacros={dayMacros}
        targetMacros={targetMacros}
        tolerancePct={tolerancePct}
      />
      <GenerateActions
        targetMacrosAvailable={targetMacros !== null}
        currentDateKey={currentDateKey}
        startDate={startDate}
        endDate={endDate}
        weekDateKeys={weekDateKeys}
      />
      {targetMacros === null && (
        <div className="mb-4 rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm text-muted-foreground">
          Save daily targets for at least one family member in the Family tab to
          generate shared meal plans.
        </div>
      )}
      <MealSlots
        mealPlan={mealPlan}
        currentDateKey={currentDateKey}
      />
    </div>
  );
}
