import { formatDateKey } from "../../lib/date";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DaySelectorProps = {
  weekDates: Array<Date>;
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
  const todayKey = formatDateKey(new Date());

  return (
    <div className="flex gap-1 mb-4 overflow-x-auto">
      {weekDates.map((date, index) => {
        const isSelected = index === selectedDay;
        const isToday = formatDateKey(date) === todayKey;
        const isGreen = dayStatusByDate[formatDateKey(date)] ?? false;

        return (
          <button
            key={index}
            onClick={() => setSelectedDay(index)}
            className={`flex-1 min-w-[3rem] py-2 rounded-lg text-center transition-colors ${
              isSelected && isGreen
                ? "bg-green-600 text-white"
                : isSelected
                  ? "bg-blue-500 text-white"
                  : isGreen
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : isToday
                      ? "bg-blue-50 text-blue-600 border border-blue-200"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="text-xs">{DAY_LABELS[index]}</div>
            <div className="text-sm font-semibold">{date.getDate()}</div>
          </button>
        );
      })}
    </div>
  );
}
