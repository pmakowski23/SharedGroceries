import { formatDateKey, todayPlainDate, type PlainDate } from "../../lib/date";
import { Button } from "../ui/button";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DaySelectorProps = {
  weekDates: Array<PlainDate>;
  selectedDay: number;
  setSelectedDay: (index: number) => void;
  dayStatusByDate: Record<string, boolean>;
};

export function DaySelector({
  weekDates,
  selectedDay,
  setSelectedDay,
  dayStatusByDate,
}: DaySelectorProps) {
  const todayKey = formatDateKey(todayPlainDate());

  return (
    <div className="flex gap-1 mb-4 overflow-x-auto">
      {weekDates.map((date, index) => {
        const isSelected = index === selectedDay;
        const isToday = formatDateKey(date) === todayKey;
        const isGreen = dayStatusByDate[formatDateKey(date)] ?? false;

        return (
          <Button
            type="button"
            variant={isSelected ? "default" : "outline"}
            key={index}
            onClick={() => setSelectedDay(index)}
            className={`h-auto min-w-[3rem] flex-1 py-2 text-center ${
              !isSelected && isGreen
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : !isSelected && isToday
                  ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15"
                  : ""
            }`}
          >
            <div className="text-xs">{DAY_LABELS[index]}</div>
            <div className="text-sm font-semibold">{date.day}</div>
          </Button>
        );
      })}
    </div>
  );
}
