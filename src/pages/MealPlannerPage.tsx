import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DaySelector } from "../components/meal-planner/DaySelector";
import { GenerateActions } from "../components/meal-planner/GenerateActions";
import { MacroProgressCard } from "../components/meal-planner/MacroProgressCard";
import { MealSlots } from "../components/meal-planner/MealSlots";
import { WeekNavigator } from "../components/meal-planner/WeekNavigator";
import { useDayMacroStatus } from "../hooks/useDayMacroStatus";
import { useMealPlannerWeek } from "../hooks/useMealPlannerWeek";

export function MealPlannerPage() {
  const {
    weekOffset,
    setWeekOffset,
    selectedDay,
    setSelectedDay,
    weekDates,
    startDate,
    endDate,
    currentDateKey,
    weekLabel,
  } = useMealPlannerWeek();

  const mealPlan = useQuery(api.mealPlans.getWeek, { startDate, endDate });
  const goalSettings = useQuery(api.nutritionGoals.getSettings, {});
  const targets = goalSettings!.targets;

  const tolerancePct = targets.macroTolerancePct;
  const targetMacros = {
    kcal: Number(targets.kcal),
    protein: Number(targets.protein),
    carbs: Number(targets.carbs),
    fat: Number(targets.fat),
  };
  const { dayMacros, dayStatusByDate } = useDayMacroStatus({
    mealPlan,
    currentDateKey,
    weekDates,
    targetMacros,
    tolerancePct,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Meal Planner</h1>
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
        targetMacrosAvailable
        currentDateKey={currentDateKey}
        startDate={startDate}
        endDate={endDate}
      />
      <MealSlots
        mealPlan={mealPlan}
        currentDateKey={currentDateKey}
      />
    </div>
  );
}
