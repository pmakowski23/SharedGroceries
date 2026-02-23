import type {
  ActivityLevel,
  GoalDirection,
  useMealGoalForm,
} from "../../hooks/useMealGoalForm";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type ProfileSectionProps = {
  form: ReturnType<typeof useMealGoalForm>;
  activityOptions: ReadonlyArray<{ value: ActivityLevel; label: string }>;
  goalOptions: ReadonlyArray<{ value: GoalDirection; label: string }>;
};

const isFilledNumber = (value: number | ""): value is number =>
  value !== "" && Number.isFinite(value);

export function ProfileSection({
  form,
  activityOptions,
  goalOptions,
}: ProfileSectionProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Profile</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Age</Label>
            <form.form.Field name="age">
              {(field) => (
                <Input
                  type="number"
                  min={14}
                  max={99}
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sex</Label>
            <form.form.Field name="sex">
              {(field) => (
                <Select
                  value={field.state.value || undefined}
                  onValueChange={(value) =>
                    field.handleChange(value as "male" | "female")
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </form.form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Height (cm)</Label>
            <form.form.Field name="heightCm">
              {(field) => (
                <Input
                  type="number"
                  min={120}
                  max={230}
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
            <form.form.Field name="weightKg">
              {(field) => (
                <Input
                  type="number"
                  min={35}
                  max={250}
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Body fat % (optional)
            </Label>
            <form.form.Field name="bodyFatPct">
              {(field) => (
                <Input
                  type="number"
                  min={3}
                  max={65}
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Activity</Label>
            <form.form.Field name="activityLevel">
              {(field) => (
                <Select
                  value={field.state.value || undefined}
                  onValueChange={(value) =>
                    field.handleChange(value as ActivityLevel)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </form.form.Field>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Goal</Label>
            <form.form.Field name="goalDirection">
              {(field) => (
                <Select
                  value={field.state.value || undefined}
                  onValueChange={(value) =>
                    field.handleChange(value as GoalDirection)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {goalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </form.form.Field>
          </div>
        </div>
        <form.form.Subscribe
          selector={(state) => {
            const values = state.values;
            return (
              isFilledNumber(values.age) &&
              values.sex !== "" &&
              isFilledNumber(values.heightCm) &&
              isFilledNumber(values.weightKg) &&
              values.activityLevel !== "" &&
              values.goalDirection !== "" &&
              isFilledNumber(values.tolerancePct)
            );
          }}
        >
          {(canSaveProfile) => (
            <>
              <Button
                type="button"
                onClick={() => void form.handleSaveProfile()}
                disabled={form.savingProfile || !canSaveProfile}
                className="w-full"
              >
                {form.savingProfile ? "Saving profile..." : "Save profile"}
              </Button>
              {!canSaveProfile && (
                <p className="text-xs text-accent">
                  Fill all required profile fields before saving.
                </p>
              )}
            </>
          )}
        </form.form.Subscribe>
      </CardContent>
    </Card>
  );
}
