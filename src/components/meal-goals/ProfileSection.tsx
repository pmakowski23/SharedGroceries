import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { api } from "../../../convex/_generated/api";
import type {
  ActivityLevel,
  GoalDirection,
  MealGoalSettingsData,
} from "../../hooks/useMealGoalSettings";
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
  profile: MealGoalSettingsData["profile"];
  activityOptions: ReadonlyArray<{ value: ActivityLevel; label: string }>;
  goalOptions: ReadonlyArray<{ value: GoalDirection; label: string }>;
};

type OptionalActivityLevel = ActivityLevel | "";
type OptionalGoalDirection = GoalDirection | "";

type ProfileFormValues = {
  age: number | "";
  sex: "male" | "female" | "";
  heightCm: number | "";
  weightKg: number | "";
  bodyFatPct: number | "";
  activityLevel: OptionalActivityLevel;
  goalDirection: OptionalGoalDirection;
};

const isFilledNumber = (value: number | ""): value is number =>
  value !== "" && Number.isFinite(value);

const canSaveProfileValues = (values: ProfileFormValues) =>
  isFilledNumber(values.age) &&
  values.sex !== "" &&
  isFilledNumber(values.heightCm) &&
  isFilledNumber(values.weightKg) &&
  values.activityLevel !== "" &&
  values.goalDirection !== "";

export function ProfileSection({
  profile,
  activityOptions,
  goalOptions,
}: ProfileSectionProps) {
  const updateProfile = useMutation(api.nutritionGoals.updateProfile);

  const initialValues = useMemo(
    () =>
      ({
        age: profile.age ?? "",
        sex: profile.sex ?? "",
        heightCm: profile.heightCm ?? "",
        weightKg: profile.weightKg ?? "",
        bodyFatPct: profile.bodyFatPct ?? "",
        activityLevel: profile.activityLevel ?? "",
        goalDirection: profile.goalDirection ?? "",
      }) as ProfileFormValues,
    [
      profile.age,
      profile.sex,
      profile.heightCm,
      profile.weightKg,
      profile.bodyFatPct,
      profile.activityLevel,
      profile.goalDirection,
    ],
  );

  const form = useForm({
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    const values = form.state.values;
    if (!canSaveProfileValues(values)) return;

    setSavingProfile(true);
    try {
      await updateProfile({
        age: values.age as number,
        sex: values.sex as "male" | "female",
        heightCm: values.heightCm as number,
        weightKg: values.weightKg as number,
        bodyFatPct:
          values.bodyFatPct === "" ? undefined : Number(values.bodyFatPct),
        activityLevel: values.activityLevel as ActivityLevel,
        goalDirection: values.goalDirection as GoalDirection,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Profile</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Age</Label>
            <form.Field name="age">
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
            </form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sex</Label>
            <form.Field name="sex">
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
            </form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Height (cm)</Label>
            <form.Field name="heightCm">
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
            </form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
            <form.Field name="weightKg">
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
            </form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Body fat % (optional)
            </Label>
            <form.Field name="bodyFatPct">
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
            </form.Field>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Activity</Label>
            <form.Field name="activityLevel">
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
            </form.Field>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Goal</Label>
            <form.Field name="goalDirection">
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
            </form.Field>
          </div>
        </div>
        <form.Subscribe
          selector={(state) => {
            return canSaveProfileValues(state.values);
          }}
        >
          {(canSaveProfile) => (
            <>
              <Button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile || !canSaveProfile}
                className="w-full"
              >
                {savingProfile ? "Saving profile..." : "Save profile"}
              </Button>
              {!canSaveProfile && (
                <p className="text-xs text-accent">
                  Fill all required profile fields before saving.
                </p>
              )}
            </>
          )}
        </form.Subscribe>
      </CardContent>
    </Card>
  );
}
