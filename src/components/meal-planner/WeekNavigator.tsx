type WeekNavigatorProps = {
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

export function WeekNavigator({
  weekLabel,
  onPrevWeek,
  onNextWeek,
}: WeekNavigatorProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onPrevWeek}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            d="M15 18l-6-6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className="text-sm font-medium text-gray-700">{weekLabel}</span>
      <button
        onClick={onNextWeek}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            d="M9 18l6-6-6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
