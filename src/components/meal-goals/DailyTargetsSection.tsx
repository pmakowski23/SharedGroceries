import type { useMealGoalForm } from "../../hooks/useMealGoalForm";
import { round0 } from "../../lib/nutrition";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type DailyTargetsSectionProps = {
  form: ReturnType<typeof useMealGoalForm>;
};

const isFilledNumber = (value: number | ""): value is number =>
  value !== "" && Number.isFinite(value);

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
  return round0(suggestion.protein * 4 + suggestion.carbs * 4 + suggestion.fat * 9);
};

export function DailyTargetsSection({ form }: DailyTargetsSectionProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Daily targets
        </h2>
        {form.suggestion?.canSuggest && form.suggestion.suggestion ? (
          <p className="text-xs text-muted-foreground">
            BMR {form.suggestion.bmr} kcal, TDEE {form.suggestion.tdee} kcal.
            Suggested macro values are shown next to each input.
          </p>
        ) : (
          <p className="text-xs text-accent">{form.suggestion?.reason}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">kcal</Label>
            <form.form.Subscribe
              selector={(state) => {
                const values = state.values;
                const canSaveTargets =
                  isFilledNumber(values.protein) &&
                  isFilledNumber(values.carbs) &&
                  isFilledNumber(values.fat) &&
                  isFilledNumber(values.tolerancePct);

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
                  {form.suggestion?.canSuggest && form.suggestion.suggestion && (
                    <SuggestedTargetValueGroup
                      suggestedValue={getSuggestedKcal(form.suggestion.suggestion)}
                    />
                  )}
                </div>
              )}
            </form.form.Subscribe>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Protein (g)</Label>
            <form.form.Field name="protein">
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
                          : form.parseNonNegativeInt(e.target.value),
                      )
                    }
                    className="h-9 rounded-r-none"
                  />
                  {form.suggestion?.canSuggest && form.suggestion.suggestion && (
                    <SuggestedTargetValueGroup
                      suggestedValue={form.suggestion.suggestion.protein}
                    />
                  )}
                </div>
              )}
            </form.form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
            <form.form.Field name="carbs">
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
                          : form.parseNonNegativeInt(e.target.value),
                      )
                    }
                    className="h-9 rounded-r-none"
                  />
                  {form.suggestion?.canSuggest && form.suggestion.suggestion && (
                    <SuggestedTargetValueGroup
                      suggestedValue={form.suggestion.suggestion.carbs}
                    />
                  )}
                </div>
              )}
            </form.form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fat (g)</Label>
            <form.form.Field name="fat">
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
                          : form.parseNonNegativeInt(e.target.value),
                      )
                    }
                    className="h-9 rounded-r-none"
                  />
                  {form.suggestion?.canSuggest && form.suggestion.suggestion && (
                    <SuggestedTargetValueGroup
                      suggestedValue={form.suggestion.suggestion.fat}
                    />
                  )}
                </div>
              )}
            </form.form.Field>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Tolerance (%)</Label>
            <form.form.Field name="tolerancePct">
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
            </form.form.Field>
          </div>
        </div>
        <form.form.Subscribe
          selector={(state) => {
            const values = state.values;
            return (
              isFilledNumber(values.protein) &&
              isFilledNumber(values.carbs) &&
              isFilledNumber(values.fat) &&
              isFilledNumber(values.tolerancePct)
            );
          }}
        >
          {(canSaveTargets) => (
            <>
              <Button
                type="button"
                onClick={() => void form.handleSaveTargets()}
                disabled={form.savingTargets || !canSaveTargets}
                className="w-full"
              >
                {form.savingTargets ? "Saving targets..." : "Save targets"}
              </Button>
              {!canSaveTargets && (
                <p className="text-xs text-accent">
                  Set protein, carbs, fat and tolerance before saving.
                </p>
              )}
            </>
          )}
        </form.form.Subscribe>
      </CardContent>
    </Card>
  );
}
