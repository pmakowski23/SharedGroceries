import type {
  DietPreference,
  useMealGoalForm,
} from "../../hooks/useMealGoalForm";
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
  form: ReturnType<typeof useMealGoalForm>;
  dietOptions: ReadonlyArray<{ value: DietPreference; label: string }>;
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
  form,
  dietOptions,
}: PreferencesSectionProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Family preferences
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These settings are personal, but meal planning combines them across
            the whole family.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Diet leaning</Label>
          <form.form.Field name="dietPreference">
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
          </form.form.Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {exclusionFields.map((item) => (
            <form.form.Field key={item.name} name={item.name}>
              {(field) => (
                <div className="flex items-center justify-between rounded-xl border bg-card px-3 py-2">
                  <Label className="text-sm">{item.label}</Label>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                </div>
              )}
            </form.form.Field>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Notes for meal planning
          </Label>
          <form.form.Field name="notes">
            {(field) => (
              <Textarea
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                rows={4}
                placeholder="Examples: spice-sensitive, wants easy lunches, kid-friendly dinners"
              />
            )}
          </form.form.Field>
        </div>

        <Button
          type="button"
          onClick={() => void form.handleSavePreferences()}
          disabled={form.savingPreferences}
          className="w-full"
        >
          {form.savingPreferences ? "Saving preferences..." : "Save preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
