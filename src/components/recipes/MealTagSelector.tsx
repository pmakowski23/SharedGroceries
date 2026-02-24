import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const MEAL_TAGS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export type MealTag = (typeof MEAL_TAGS)[number];

const isMealTag = (tag: string): tag is MealTag => {
  return MEAL_TAGS.includes(tag as MealTag);
};

type MealTagSelectorProps = {
  recipeId: Id<"recipes">;
  activeTags: Array<string>;
};

export function MealTagSelector({ recipeId, activeTags }: MealTagSelectorProps) {
  const updateMealTags = useMutation(api.recipes.updateMealTags);
  const [saving, setSaving] = useState(false);
  const normalizedActiveTags = activeTags.filter(isMealTag);

  const handleToggleTag = async (mealTag: MealTag) => {
    const hasTag = normalizedActiveTags.includes(mealTag);
    const nextTags = hasTag
      ? normalizedActiveTags.filter((tag) => tag !== mealTag)
      : [...normalizedActiveTags, mealTag];

    if (nextTags.length === 0) {
      return;
    }

    setSaving(true);
    try {
      await updateMealTags({
        recipeId,
        mealTags: nextTags,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">Meal tags</div>
      <div className="flex flex-wrap gap-2">
        {MEAL_TAGS.map((tag) => {
          const active = normalizedActiveTags.includes(tag);
          return (
            <Button
              key={tag}
              disabled={saving}
              onClick={() => void handleToggleTag(tag)}
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
