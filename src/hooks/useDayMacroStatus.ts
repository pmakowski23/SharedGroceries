import { useMemo } from "react";
import { formatDateKey } from "../lib/date";
import { isWithinTolerance, type MacroTotals } from "../lib/nutrition";

type MealPlanRow = {
  date: string;
  totalKcal?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
};

type TargetMacros = MacroTotals | null;

function getTotalsForDate(mealPlan: Array<MealPlanRow>, dateKey: string): MacroTotals {
  return mealPlan
    .filter((m) => m.date === dateKey)
    .reduce(
      (sum, m) => ({
        kcal: sum.kcal + (m.totalKcal ?? 0),
        protein: sum.protein + (m.totalProtein ?? 0),
        carbs: sum.carbs + (m.totalCarbs ?? 0),
        fat: sum.fat + (m.totalFat ?? 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

export function useDayMacroStatus<T extends MealPlanRow>(params: {
  mealPlan: Array<T> | undefined;
  currentDateKey: string;
  weekDates: Array<Date>;
  targetMacros: TargetMacros;
  tolerancePct: number;
}) {
  const { mealPlan, currentDateKey, weekDates, targetMacros, tolerancePct } =
    params;

  const dayMeals = useMemo(
    () => (mealPlan ?? []).filter((m) => m.date === currentDateKey),
    [currentDateKey, mealPlan],
  );

  const dayMacros = useMemo(
    () => getTotalsForDate(mealPlan ?? [], currentDateKey),
    [currentDateKey, mealPlan],
  );

  const dayStatusByDate = useMemo(() => {
    return weekDates.reduce<Record<string, boolean>>((acc, dayDate) => {
      const key = formatDateKey(dayDate);
      const totals = getTotalsForDate(mealPlan ?? [], key);
      const isGreen =
        !!targetMacros &&
        isWithinTolerance(totals.kcal, targetMacros.kcal, tolerancePct) &&
        isWithinTolerance(totals.protein, targetMacros.protein, tolerancePct) &&
        isWithinTolerance(totals.carbs, targetMacros.carbs, tolerancePct) &&
        isWithinTolerance(totals.fat, targetMacros.fat, tolerancePct);
      acc[key] = isGreen;
      return acc;
    }, {});
  }, [mealPlan, targetMacros, tolerancePct, weekDates]);

  return { dayMeals, dayMacros, dayStatusByDate };
}
