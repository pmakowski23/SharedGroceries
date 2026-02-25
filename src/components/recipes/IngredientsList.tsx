import { KeyboardEvent, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { RotateCw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { logAiDebug } from "@/lib/aiDebugLogger";
import { ingredientMacrosForAmount } from "@/lib/ingredientNutrition";

type IngredientItem = {
  _id: Id<"recipeIngredients">;
  name: string;
  amount: number;
  unit: string;
} & (
  | {
      kcalPer100: number;
      proteinPer100: number;
      carbsPer100: number;
      fatPer100: number;
    }
  | {
      kcalPerUnit: number;
      proteinPerUnit: number;
      carbsPerUnit: number;
      fatPerUnit: number;
    }
  );

type IngredientsListProps = {
  ingredients: Array<IngredientItem>;
  scale: number;
};

export function IngredientsList({ ingredients, scale }: IngredientsListProps) {
  const regenerateIngredientMacros = useAction(api.recipes.regenerateIngredientMacros);
  const updateIngredientAmount = useMutation(api.recipes.updateIngredientAmount);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [savingAmountIds, setSavingAmountIds] = useState<Record<string, boolean>>({});
  const [editedAmounts, setEditedAmounts] = useState<Record<string, string>>({});

  const getDisplayAmount = (ingredientAmount: number) =>
    Math.round(ingredientAmount * scale * 100) / 100;

  const resetEditedAmount = (ingredientId: Id<"recipeIngredients">) => {
    setEditedAmounts((prev) => {
      const next = { ...prev };
      delete next[ingredientId];
      return next;
    });
  };

  const saveEditedAmount = async (
    ingredient: IngredientItem,
    rawInput: string,
  ) => {
    const parsedDisplayAmount = Number(rawInput);
    if (!Number.isFinite(parsedDisplayAmount) || parsedDisplayAmount <= 0) {
      resetEditedAmount(ingredient._id);
      return;
    }

    const nextBaseAmount = parsedDisplayAmount / Math.max(scale, 0.000001);
    if (!Number.isFinite(nextBaseAmount) || nextBaseAmount <= 0) {
      resetEditedAmount(ingredient._id);
      return;
    }

    if (Math.abs(nextBaseAmount - ingredient.amount) < 1e-6) {
      resetEditedAmount(ingredient._id);
      return;
    }

    setSavingAmountIds((prev) => ({ ...prev, [ingredient._id]: true }));
    try {
      await updateIngredientAmount({
        ingredientId: ingredient._id,
        amount: Math.round(nextBaseAmount * 1000) / 1000,
      });
    } finally {
      setSavingAmountIds((prev) => ({ ...prev, [ingredient._id]: false }));
      resetEditedAmount(ingredient._id);
    }
  };

  const onAmountKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    ingredient: IngredientItem,
    rawInput: string,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveEditedAmount(ingredient, rawInput);
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      resetEditedAmount(ingredient._id);
      event.currentTarget.blur();
    }
  };

  const handleRegenerate = async (ingredientId: Id<"recipeIngredients">) => {
    setRegeneratingIds((prev) => ({ ...prev, [ingredientId]: true }));
    const startedAt = performance.now();
    const ingredient = ingredients.find((item) => item._id === ingredientId);
    try {
      const result = await regenerateIngredientMacros({
        ingredientId,
        debug: import.meta.env.DEV,
      });
      const debugResult =
        typeof result === "object" && result !== null && "prompt" in result ? result : null;
      await logAiDebug({
        action: "recipes.regenerateIngredientMacros",
        input:
          debugResult?.prompt ??
          (ingredient
            ? {
                ingredientId,
                name: ingredient.name,
                amount: ingredient.amount,
                unit: ingredient.unit,
                ...("kcalPer100" in ingredient
                  ? {
                      kcalPer100: ingredient.kcalPer100,
                      proteinPer100: ingredient.proteinPer100,
                      carbsPer100: ingredient.carbsPer100,
                      fatPer100: ingredient.fatPer100,
                    }
                  : {
                      kcalPerUnit: ingredient.kcalPerUnit,
                      proteinPerUnit: ingredient.proteinPerUnit,
                      carbsPerUnit: ingredient.carbsPerUnit,
                      fatPerUnit: ingredient.fatPerUnit,
                    }),
              }
            : { ingredientId }),
        output:
          debugResult?.responseText ??
          (debugResult?.updatedMacros
            ? { updatedMacros: debugResult.updatedMacros }
            : "Ingredient macros regenerated successfully"),
        durationMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      await logAiDebug({
        action: "recipes.regenerateIngredientMacros",
        input: { ingredientId },
        error: error instanceof Error ? error.message : String(error),
        durationMs: Math.round(performance.now() - startedAt),
      });
      throw error;
    } finally {
      setRegeneratingIds((prev) => ({ ...prev, [ingredientId]: false }));
    }
  };

  return (
    <>
      <h2 className="mt-6 mb-3 text-lg font-semibold">Ingredients</h2>
      <Card>
        <CardContent className="divide-y p-0">
          {ingredients.map((ingredient) => {
            const amount = getDisplayAmount(ingredient.amount);
            const totals = ingredientMacrosForAmount(ingredient);
            const kcal = Math.round(totals.kcal * scale);
            const protein = Math.round(totals.protein * scale * 10) / 10;
            const carbs = Math.round(totals.carbs * scale * 10) / 10;
            const fat = Math.round(totals.fat * scale * 10) / 10;
            const amountInputValue =
              editedAmounts[ingredient._id] ?? String(amount);
            const isSavingAmount = savingAmountIds[ingredient._id] === true;

            return (
              <div key={ingredient._id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{ingredient.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={regeneratingIds[ingredient._id] === true}
                      onClick={() => void handleRegenerate(ingredient._id)}
                      aria-label={`Regenerate macros for ${ingredient.name}`}
                      title="Regenerate macros"
                    >
                      <RotateCw
                        className={`h-3.5 w-3.5 ${
                          regeneratingIds[ingredient._id] === true ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                    <div className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={amountInputValue}
                        onChange={(e) =>
                          setEditedAmounts((prev) => ({
                            ...prev,
                            [ingredient._id]: e.target.value,
                          }))
                        }
                        onBlur={() => void saveEditedAmount(ingredient, amountInputValue)}
                        onKeyDown={(event) =>
                          onAmountKeyDown(event, ingredient, amountInputValue)
                        }
                        disabled={isSavingAmount}
                        aria-label={`Amount for ${ingredient.name}`}
                        className="h-7 w-20 text-right"
                      />
                      <span>{ingredient.unit}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {kcal} kcal • P {protein} g • C {carbs} g • F {fat} g
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
