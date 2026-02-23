import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

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
      <div className="mb-2 text-xs font-medium text-muted-foreground">Meal tags</div>
      <div className="flex flex-wrap gap-2">
        {MEAL_TAGS.map((tag) => {
          const active = activeTags.includes(tag);
          return (
            <Button
              key={tag}
              disabled={saving}
              onClick={() => onToggleTag(tag)}
              variant={active ? "default" : "outline"}
              size="sm"
              className="h-auto rounded-full px-2.5 py-1 text-xs"
            >
              <Badge
                variant="outline"
                className="pointer-events-none border-0 bg-transparent p-0 text-inherit"
              >
                {tag}
              </Badge>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
