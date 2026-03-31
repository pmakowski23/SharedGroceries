import { useMemo, useState } from "react";
import {
  addDays,
  formatDateKey,
  formatMonthDay,
  getWeekStart,
  todayPlainDate,
} from "../lib/date";

export function useMealPlannerWeek() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => {
    return todayPlainDate().dayOfWeek - 1;
  });

  const weekStart = useMemo(() => {
    const start = getWeekStart(todayPlainDate());
    return addDays(start, weekOffset * 7);
  }, [weekOffset]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const startDate = formatDateKey(weekDates[0]);
  const endDate = formatDateKey(weekDates[6]);
  const weekDateKeys = weekDates.map((date) => formatDateKey(date));
  const currentDateKey = formatDateKey(weekDates[selectedDay]);

  const weekLabel = `${formatMonthDay(weekDates[0])} - ${formatMonthDay(
    weekDates[6],
  )}`;

  return {
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
  };
}
