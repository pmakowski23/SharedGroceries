import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const MEAL_TAGS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export type MealTag = (typeof MEAL_TAGS)[number];

const isMealTag = (tag: string): tag is MealTag => {
  return MEAL_TAGS.includes(tag as MealTag);
};

type MealTagSelectorProps = {
  recipeId: Id<"recipes">;
  activeTags: Array<string>;
  currentVersionNumber: number;
  versions: Array<{
    _id: string;
    versionNumber: number;
    prompt?: string;
  }>;
  selectingVersion: boolean;
  onSelectVersion: (versionNumber: number) => Promise<void>;
};

export function MealTagSelector({
  recipeId,
  activeTags,
  currentVersionNumber,
  versions,
  selectingVersion,
  onSelectVersion,
}: MealTagSelectorProps) {
  const updateMealTags = useMutation(api.recipes.updateMealTags);
  const [saving, setSaving] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [localSelectingVersion, setLocalSelectingVersion] = useState<number | null>(
    null,
  );
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

  const handleVersionSelect = async (versionNumber: number) => {
    setLocalSelectingVersion(versionNumber);
    try {
      await onSelectVersion(versionNumber);
      setVersionModalOpen(false);
    } finally {
      setLocalSelectingVersion(null);
    }
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">Meal tags</div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setVersionModalOpen(true)}
          disabled={selectingVersion}
        >
          v{currentVersionNumber}
        </Button>
      </div>
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
      <Dialog open={versionModalOpen} onOpenChange={setVersionModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Recipe versions</DialogTitle>
            <DialogDescription>
              Select a version to restore it as active.
            </DialogDescription>
          </DialogHeader>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions available.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {versions.map((version) => {
                const isCurrent = version.versionNumber === currentVersionNumber;
                const isLoading = localSelectingVersion === version.versionNumber;
                return (
                  <Button
                    key={version._id}
                    type="button"
                    variant={isCurrent ? "default" : "outline"}
                    onClick={() => void handleVersionSelect(version.versionNumber)}
                    disabled={selectingVersion || isLoading}
                    className="h-auto w-full justify-start px-3 py-2 text-left"
                  >
                    <div className="w-full">
                      <div className="text-sm font-semibold">
                        v{version.versionNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {version.prompt?.trim() || "Original recipe"}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
