import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { api } from "../../../convex/_generated/api";
import type {
  MealGoalSettingsData,
  MealGoalSuggestionData,
} from "../../hooks/useMealGoalSettings";
import { parseNonNegativeInt, round0 } from "../../lib/nutrition";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type DailyTargetsSectionProps = {
  targets: MealGoalSettingsData["targets"];
  suggestion: MealGoalSuggestionData;
  applySuggestionVersion: number;
};

type DailyTargetsFormValues = {
  tolerancePct: number | "";
  protein: number | "";
  carbs: number | "";
  fat: number | "";
};

const isFilledNumber = (value: number | ""): value is number =>
  value !== "" && Number.isFinite(value);

const canSaveTargetsValues = (values: DailyTargetsFormValues) =>
  isFilledNumber(values.protein) &&
  isFilledNumber(values.carbs) &&
  isFilledNumber(values.fat) &&
  isFilledNumber(values.tolerancePct);

type SuggestedTargetValueGroupProps = {
  suggestedValue: number | null | undefined;
};

function SuggestedTargetValueGroup({
  suggestedValue,
}: SuggestedTargetValueGroupProps) {
  if (suggestedValue === null || suggestedValue === undefined) return null;

  const roundedSuggested = round0(suggestedValue);

  return (
    <div className="h-9 rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground flex items-center whitespace-nowrap">
      {roundedSuggested} g
    </div>
  );
}

const getSuggestedKcal = (
  suggestion:
    | {
        protein: number;
        carbs: number;
        fat: number;
      }
    | null
    | undefined,
) => {
  if (!suggestion) return null;
  return round0(
    suggestion.protein * 4 + suggestion.carbs * 4 + suggestion.fat * 9,
  );
};

export function DailyTargetsSection({
  targets,
  suggestion,
  applySuggestionVersion,
}: DailyTargetsSectionProps) {
  const setMacroTargets = useMutation(api.nutritionGoals.setMacroTargets);
  const lastAppliedSuggestionVersion = useRef(0);

  const initialValues = useMemo(
    () =>
      ({
        tolerancePct: targets.macroTolerancePct ?? "",
        protein:
          targets.protein === null || targets.protein === undefined
            ? ""
            : round0(targets.protein),
        carbs:
          targets.carbs === null || targets.carbs === undefined
            ? ""
            : round0(targets.carbs),
        fat:
          targets.fat === null || targets.fat === undefined
            ? ""
            : round0(targets.fat),
      }) as DailyTargetsFormValues,
    [
      targets.macroTolerancePct,
      targets.protein,
      targets.carbs,
      targets.fat,
    ],
  );

  const form = useForm({
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  useEffect(() => {
    if (
      applySuggestionVersion === lastAppliedSuggestionVersion.current ||
      !suggestion?.suggestion
    ) {
      return;
    }

    lastAppliedSuggestionVersion.current = applySuggestionVersion;
    form.setFieldValue("protein", round0(suggestion.suggestion.protein));
    form.setFieldValue("carbs", round0(suggestion.suggestion.carbs));
    form.setFieldValue("fat", round0(suggestion.suggestion.fat));
  }, [applySuggestionVersion, form, suggestion]);

  const [savingTargets, setSavingTargets] = useState(false);

  const handleSaveTargets = async () => {
    const values = form.state.values;
    if (!canSaveTargetsValues(values)) return;

    setSavingTargets(true);
    try {
      await setMacroTargets({
        protein: values.protein as number,
        carbs: values.carbs as number,
        fat: values.fat as number,
        macroTolerancePct: values.tolerancePct as number,
      });
    } finally {
      setSavingTargets(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Daily targets
        </h2>
        {suggestion?.canSuggest && suggestion.suggestion ? (
          <p className="text-xs text-muted-foreground">
            BMR {suggestion.bmr} kcal, TDEE {suggestion.tdee} kcal.
            Suggested macro values are shown next to each input.
          </p>
        ) : (
          <p className="text-xs text-accent">{suggestion?.reason}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">kcal</Label>
            <form.Subscribe
              selector={(state) => {
                const values = state.values;
                const canSaveTargets = canSaveTargetsValues(values);

                const kcal = canSaveTargets
                  ? round0(
                      (values.protein as number) * 4 +
                        (values.carbs as number) * 4 +
                        (values.fat as number) * 9,
                    )
                  : "";

                return kcal;
              }}
            >
              {(kcal) => (
                <div className="flex items-center">
                  <Input
                    type="number"
                    value={kcal}
                    readOnly
                    className="h-9 rounded-r-none"
                  />
                  {suggestion?.canSuggest && suggestion.suggestion && (
                    <SuggestedTargetValueGroup
                      suggestedValue={getSuggestedKcal(suggestion.suggestion)}
                    />
                  )}
                </div>
              )}
            </form.Subscribe>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Protein (g)</Label>
            <form.Field name="protein">
              {(field) => (
                <div className="flex items-center">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === ""
                          ? ""
                          : parseNonNegativeInt(e.target.value),
                      )
                    }
                    className="h-9 rounded-r-none"
                  />
                  {suggestion?.canSuggest && suggestion.suggestion && (
                    <SuggestedTargetValueGroup
                      suggestedValue={suggestion.suggestion.protein}
                    />
                  )}
                </div>
              )}
            </form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
            <form.Field name="carbs">
              {(field) => (
                <div className="flex items-center">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === ""
                          ? ""
                          : parseNonNegativeInt(e.target.value),
                      )
                    }
                    className="h-9 rounded-r-none"
                  />
                  {suggestion?.canSuggest && suggestion.suggestion && (
                    <SuggestedTargetValueGroup
                      suggestedValue={suggestion.suggestion.carbs}
                    />
                  )}
                </div>
              )}
            </form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fat (g)</Label>
            <form.Field name="fat">
              {(field) => (
                <div className="flex items-center">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === ""
                          ? ""
                          : parseNonNegativeInt(e.target.value),
                      )
                    }
                    className="h-9 rounded-r-none"
                  />
                  {suggestion?.canSuggest && suggestion.suggestion && (
                    <SuggestedTargetValueGroup
                      suggestedValue={suggestion.suggestion.fat}
                    />
                  )}
                </div>
              )}
            </form.Field>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Tolerance (%)</Label>
            <form.Field name="tolerancePct">
              {(field) => (
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="h-9"
                />
              )}
            </form.Field>
          </div>
        </div>
        <form.Subscribe
          selector={(state) => canSaveTargetsValues(state.values)}
        >
          {(canSaveTargets) => (
            <>
              <Button
                type="button"
                onClick={() => void handleSaveTargets()}
                disabled={savingTargets || !canSaveTargets}
                className="w-full"
              >
                {savingTargets ? "Saving targets..." : "Save targets"}
              </Button>
              {!canSaveTargets && (
                <p className="text-xs text-accent">
                  Set protein, carbs, fat and tolerance before saving.
                </p>
              )}
            </>
          )}
        </form.Subscribe>
      </CardContent>
    </Card>
  );
}
