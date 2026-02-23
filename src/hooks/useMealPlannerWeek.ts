import { useMemo, useState } from "react";
import { addDays, formatDateKey, getWeekStart } from "../lib/date";

export function useMealPlannerWeek() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);

  const weekStart = useMemo(() => {
    const now = new Date();
    const start = getWeekStart(now);
    return addDays(start, weekOffset * 7);
  }, [weekOffset]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const startDate = formatDateKey(weekDates[0]);
  const endDate = formatDateKey(weekDates[6]);
  const currentDateKey = formatDateKey(weekDates[selectedDay]);

  const weekLabel = `${weekDates[0].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDates[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  return {
    weekOffset,
    setWeekOffset,
    selectedDay,
    setSelectedDay,
    weekDates,
    startDate,
    endDate,
    currentDateKey,
    weekLabel,
  };
}
