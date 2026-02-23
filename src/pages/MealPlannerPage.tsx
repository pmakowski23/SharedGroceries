import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
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
  const [addingSlot, setAddingSlot] = useState<string | null>(null);

  const mealPlan = useQuery(api.mealPlans.getWeek, { startDate, endDate });
  const recipes = useQuery(api.recipes.list, {});
  const addMeal = useMutation(api.mealPlans.addMeal);
  const removeMeal = useMutation(api.mealPlans.removeMeal);
  const updateServings = useMutation(api.mealPlans.updateServings);
  const generateGroceryList = useAction(api.mealPlans.generateGroceryList);
  const generateDayPlan = useMutation(api.mealPlans.generateDayPlan);
  const goalSettings = useQuery(api.nutritionGoals.getSettings, {});

  const [generatingList, setGeneratingList] = useState(false);
  const [generatingDayPlanState, setGeneratingDayPlanState] = useState(false);

  const tolerancePct = goalSettings?.targets.macroTolerancePct ?? 5;
  const targets = goalSettings?.targets;
  const hasTargets =
    !!targets &&
    targets.kcal !== null &&
    targets.protein !== null &&
    targets.carbs !== null &&
    targets.fat !== null;

  const targetMacros = hasTargets
    ? {
        kcal: Number(targets.kcal),
        protein: Number(targets.protein),
        carbs: Number(targets.carbs),
        fat: Number(targets.fat),
      }
    : null;
  const { dayMeals, dayMacros, dayStatusByDate } = useDayMacroStatus({
    mealPlan,
    currentDateKey,
    weekDates,
    targetMacros,
    tolerancePct,
  });

  const handleAddMeal = async (mealType: string, recipeId: Id<"recipes">) => {
    await addMeal({ date: currentDateKey, mealType, recipeId, servings: 1 });
    setAddingSlot(null);
  };

  const handleGenerateGroceryList = async () => {
    setGeneratingList(true);
    try {
      await generateGroceryList({ startDate, endDate });
    } finally {
      setGeneratingList(false);
    }
  };

  const handleGenerateDayPlan = async () => {
    setGeneratingDayPlanState(true);
    try {
      await generateDayPlan({ date: currentDateKey });
    } finally {
      setGeneratingDayPlanState(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Meal Planner</h1>
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
        targetMacrosAvailable={!!targetMacros}
        generatingDayPlan={generatingDayPlanState}
        generatingGroceryList={generatingList}
        onGenerateDayPlan={() => void handleGenerateDayPlan()}
        onGenerateGroceryList={() => void handleGenerateGroceryList()}
      />
      <MealSlots
        mealPlanLoaded={mealPlan !== undefined}
        dayMeals={dayMeals}
        recipes={recipes ?? []}
        addingSlot={addingSlot}
        setAddingSlot={setAddingSlot}
        onAddMeal={(mealType, recipeId) => void handleAddMeal(mealType, recipeId)}
        onRemoveMeal={(mealPlanId) => void removeMeal({ mealPlanId })}
        onUpdateServings={(mealPlanId, servings) =>
          void updateServings({ mealPlanId, servings })
        }
      />
    </div>
  );
}
