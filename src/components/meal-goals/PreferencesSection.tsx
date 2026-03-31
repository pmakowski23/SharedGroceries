import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { api } from "../../../convex/_generated/api";
import type {
  DietPreference,
  MealGoalSettingsData,
} from "../../hooks/useMealGoalSettings";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

type PreferencesSectionProps = {
  preferences: MealGoalSettingsData["preferences"];
  dietOptions: ReadonlyArray<{ value: DietPreference; label: string }>;
};

type PreferencesFormValues = {
  dietPreference: DietPreference;
  excludeBeef: boolean;
  excludePork: boolean;
  excludeSeafood: boolean;
  excludeDairy: boolean;
  excludeEggs: boolean;
  excludeGluten: boolean;
  excludeNuts: boolean;
  notes: string;
};

const exclusionFields = [
  { name: "excludeBeef" as const, label: "No beef" },
  { name: "excludePork" as const, label: "No pork" },
  { name: "excludeSeafood" as const, label: "No seafood" },
  { name: "excludeDairy" as const, label: "No dairy" },
  { name: "excludeEggs" as const, label: "No eggs" },
  { name: "excludeGluten" as const, label: "No gluten" },
  { name: "excludeNuts" as const, label: "No nuts" },
] as const;

export function PreferencesSection({
  preferences,
  dietOptions,
}: PreferencesSectionProps) {
  const updatePreferences = useMutation(api.nutritionGoals.updatePreferences);

  const initialValues = useMemo(
    () =>
      ({
        dietPreference: preferences.dietPreference,
        excludeBeef: preferences.excludeBeef,
        excludePork: preferences.excludePork,
        excludeSeafood: preferences.excludeSeafood,
        excludeDairy: preferences.excludeDairy,
        excludeEggs: preferences.excludeEggs,
        excludeGluten: preferences.excludeGluten,
        excludeNuts: preferences.excludeNuts,
        notes: preferences.notes,
      }) as PreferencesFormValues,
    [
      preferences.dietPreference,
      preferences.excludeBeef,
      preferences.excludePork,
      preferences.excludeSeafood,
      preferences.excludeDairy,
      preferences.excludeEggs,
      preferences.excludeGluten,
      preferences.excludeNuts,
      preferences.notes,
    ],
  );

  const form = useForm({
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  const [savingPreferences, setSavingPreferences] = useState(false);

  const handleSavePreferences = async () => {
    const values = form.state.values;

    setSavingPreferences(true);
    try {
      await updatePreferences({
        dietPreference: values.dietPreference,
        excludeBeef: values.excludeBeef,
        excludePork: values.excludePork,
        excludeSeafood: values.excludeSeafood,
        excludeDairy: values.excludeDairy,
        excludeEggs: values.excludeEggs,
        excludeGluten: values.excludeGluten,
        excludeNuts: values.excludeNuts,
        notes: values.notes,
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Diet preferences
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These settings are personal, but meal planning combines them across
            the whole family.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Diet leaning</Label>
          <form.Field name="dietPreference">
            {(field) => (
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(value as DietPreference)
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dietOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {exclusionFields.map((item) => (
            <form.Field key={item.name} name={item.name}>
              {(field) => (
                <div className="flex items-center justify-between rounded-xl border bg-card px-3 py-2">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                </div>
              )}
            </form.Field>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Notes for meal planning
          </Label>
          <form.Field name="notes">
            {(field) => (
              <Textarea
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                rows={4}
                placeholder="Examples: spice-sensitive, wants easy lunches, kid-friendly dinners"
              />
            )}
          </form.Field>
        </div>

        <Button
          type="button"
          onClick={() => void handleSavePreferences()}
          disabled={savingPreferences}
          className="w-full"
        >
          {savingPreferences ? "Saving preferences..." : "Save preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
