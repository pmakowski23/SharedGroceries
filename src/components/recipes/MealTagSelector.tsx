const MEAL_TAGS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export type MealTag = (typeof MEAL_TAGS)[number];

type MealTagSelectorProps = {
  activeTags: Array<string>;
  saving: boolean;
  onToggleTag: (tag: MealTag) => void;
};

export function MealTagSelector({
  activeTags,
  saving,
  onToggleTag,
}: MealTagSelectorProps) {
  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-gray-500 mb-2">Meal tags</div>
      <div className="flex flex-wrap gap-2">
        {MEAL_TAGS.map((tag) => {
          const active = activeTags.includes(tag);
          return (
            <button
              key={tag}
              disabled={saving}
              onClick={() => onToggleTag(tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                active
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
