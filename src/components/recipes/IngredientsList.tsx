import { KeyboardEvent, useMemo, useState } from "react";
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
  partId?: Id<"recipeParts">;
  sourcePartId?: Id<"recipeParts">;
  usedAmount?: number;
  usedUnit?: string;
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

type RecipePartItem = {
  _id: string;
  name: string;
  scale: number;
  yieldAmount?: number;
  yieldUnit?: string;
};

type IngredientsListProps = {
  ingredients: Array<IngredientItem>;
  parts: Array<RecipePartItem>;
  setPartScale: (partId: string, scale: number) => void;
  scale: number;
};

export function IngredientsList({
  ingredients,
  parts,
  setPartScale,
  scale,
}: IngredientsListProps) {
  const regenerateIngredientMacros = useAction(api.recipes.regenerateIngredientMacros);
  const updateIngredientAmount = useMutation(api.recipes.updateIngredientAmount);
  const updatePart = useMutation(api.recipes.updatePart);
  const updateIngredientPartUsage = useMutation(api.recipes.updateIngredientPartUsage);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [savingAmountIds, setSavingAmountIds] = useState<Record<string, boolean>>({});
  const [editedAmounts, setEditedAmounts] = useState<Record<string, string>>({});
  const [editedPartScales, setEditedPartScales] = useState<Record<string, string>>({});
  const [savingUsageIds, setSavingUsageIds] = useState<Record<string, boolean>>({});

  const groupedParts = useMemo(() => {
    const partById = new Map(parts.map((part) => [part._id, part]));
    if (parts.length === 0) {
      return [
        {
          part: { _id: "legacy-main", name: "Main", scale: 1 } as RecipePartItem,
          ingredients,
        },
      ];
    }
    return parts.map((part) => ({
      part,
      ingredients: ingredients.filter((ingredient) => ingredient.partId === part._id),
    }));
  }, [ingredients, parts]);

  const getDisplayAmount = (ingredientAmount: number) =>
    Math.round(ingredientAmount * scale * 100) / 100;

  const resetEditedAmount = (ingredientId: Id<"recipeIngredients">) => {
    setEditedAmounts((prev) => {
      const next = { ...prev };
      delete next[ingredientId];
      return next;
    });
  };

  const savePartScale = async (part: RecipePartItem, rawInput: string) => {
    const parsed = Number(rawInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    setPartScale(part._id, parsed);
    if (part._id === "legacy-main") return;
    await updatePart({
      partId: part._id as Id<"recipeParts">,
      scale: Math.round(parsed * 1000) / 1000,
    });
  };

  const saveIngredientUsage = async (ingredient: IngredientItem, fields: {
    partId?: string;
    sourcePartId?: string;
    usedAmount?: string;
    usedUnit?: string;
  }) => {
    setSavingUsageIds((prev) => ({ ...prev, [ingredient._id]: true }));
    try {
      await updateIngredientPartUsage({
        ingredientId: ingredient._id,
        partId: fields.partId as Id<"recipeParts"> | undefined,
        sourcePartId: fields.sourcePartId
          ? (fields.sourcePartId as Id<"recipeParts">)
          : undefined,
        usedAmount: fields.sourcePartId ? Number(fields.usedAmount ?? ingredient.usedAmount ?? 0) : undefined,
        usedUnit: fields.sourcePartId ? (fields.usedUnit ?? ingredient.usedUnit ?? ingredient.unit) : undefined,
      });
    } finally {
      setSavingUsageIds((prev) => ({ ...prev, [ingredient._id]: false }));
    }
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
      <div className="space-y-3">
        {groupedParts.map(({ part, ingredients: partIngredients }) => (
          <Card key={part._id}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">{part.name}</div>
                  {part.yieldAmount && part.yieldUnit ? (
                    <div className="text-xs text-muted-foreground">
                      Yield: {part.yieldAmount} {part.yieldUnit}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Part scale</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="h-7 w-20 text-right"
                    value={editedPartScales[part._id] ?? String(part.scale)}
                    onChange={(event) =>
                      setEditedPartScales((prev) => ({
                        ...prev,
                        [part._id]: event.target.value,
                      }))
                    }
                    onBlur={() => void savePartScale(part, editedPartScales[part._id] ?? String(part.scale))}
                  />
                </div>
              </div>
              <div className="divide-y">
                {partIngredients.map((ingredient) => {
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
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <select
                    className="h-8 rounded-md border bg-background px-2"
                    value={ingredient.sourcePartId ?? ""}
                    disabled={savingUsageIds[ingredient._id] === true}
                    onChange={(event) =>
                      void saveIngredientUsage(ingredient, {
                        partId: ingredient.partId,
                        sourcePartId: event.target.value || undefined,
                        usedAmount: String(ingredient.usedAmount ?? ""),
                        usedUnit: ingredient.usedUnit ?? ingredient.unit,
                      })
                    }
                  >
                    <option value="">Direct ingredient</option>
                    {parts
                      .filter((candidate) => candidate._id !== part._id)
                      .map((candidate) => (
                        <option key={candidate._id} value={candidate._id}>
                          Uses from {candidate.name}
                        </option>
                      ))}
                  </select>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Used amount"
                    defaultValue={ingredient.usedAmount ?? ""}
                    disabled={
                      savingUsageIds[ingredient._id] === true ||
                      !ingredient.sourcePartId
                    }
                    onBlur={(event) =>
                      void saveIngredientUsage(ingredient, {
                        partId: ingredient.partId,
                        sourcePartId: ingredient.sourcePartId,
                        usedAmount: event.target.value,
                        usedUnit: ingredient.usedUnit ?? ingredient.unit,
                      })
                    }
                    className="h-8"
                  />
                  <Input
                    type="text"
                    placeholder="Used unit"
                    defaultValue={ingredient.usedUnit ?? ingredient.unit}
                    disabled={
                      savingUsageIds[ingredient._id] === true ||
                      !ingredient.sourcePartId
                    }
                    onBlur={(event) =>
                      void saveIngredientUsage(ingredient, {
                        partId: ingredient.partId,
                        sourcePartId: ingredient.sourcePartId,
                        usedAmount: String(ingredient.usedAmount ?? ""),
                        usedUnit: event.target.value,
                      })
                    }
                    className="h-8"
                  />
                </div>
              </div>
            );
          })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
