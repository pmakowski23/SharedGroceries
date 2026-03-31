import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { api } from "../../convex/_generated/api";
import { parseNonNegativeInt, round0 } from "../lib/nutrition";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";

export type GoalDirection = "lose" | "maintain" | "gain";
export type DietPreference =
  | "none"
  | "moreVegetarian"
  | "moreVegan"
  | "vegetarian"
  | "vegan";
type OptionalActivityLevel = ActivityLevel | "";
type OptionalGoalDirection = GoalDirection | "";

type MealGoalFormValues = {
  age: number | "";
  sex: "male" | "female" | "";
  heightCm: number | "";
  weightKg: number | "";
  bodyFatPct: number | "";
  activityLevel: OptionalActivityLevel;
  goalDirection: OptionalGoalDirection;
  tolerancePct: number | "";
  protein: number | "";
  carbs: number | "";
  fat: number | "";
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

const isFilledNumber = (value: number | ""): value is number =>
  value !== "" && Number.isFinite(value);

const canSaveProfileValues = (values: MealGoalFormValues) =>
  isFilledNumber(values.age) &&
  values.sex !== "" &&
  isFilledNumber(values.heightCm) &&
  isFilledNumber(values.weightKg) &&
  values.activityLevel !== "" &&
  values.goalDirection !== "" &&
  isFilledNumber(values.tolerancePct);

const canSaveTargetsValues = (values: MealGoalFormValues) =>
  isFilledNumber(values.protein) &&
  isFilledNumber(values.carbs) &&
  isFilledNumber(values.fat) &&
  isFilledNumber(values.tolerancePct);

export function useMealGoalForm() {
  const settings = useQuery(api.nutritionGoals.getSettings, {});
  const suggestion = useQuery(api.nutritionGoals.suggestTargets, {});
  const updateProfile = useMutation(api.nutritionGoals.updateProfile);
  const setMacroTargets = useMutation(api.nutritionGoals.setMacroTargets);
  const updatePreferences = useMutation(api.nutritionGoals.updatePreferences);

  const profile = settings?.profile;
  const targets = settings?.targets;
  const preferences = settings?.preferences;
  const isLoadingSettings = settings === undefined;

  const initialValues = useMemo(
    () =>
      ({
        age: profile?.age ?? "",
        sex: profile?.sex ?? "",
        heightCm: profile?.heightCm ?? "",
        weightKg: profile?.weightKg ?? "",
        bodyFatPct: profile?.bodyFatPct ?? "",
        activityLevel: profile?.activityLevel ?? "",
        goalDirection: profile?.goalDirection ?? "",
        tolerancePct: targets?.macroTolerancePct ?? "",
        protein:
          targets?.protein === null || targets?.protein === undefined
            ? ""
            : round0(targets.protein),
        carbs:
          targets?.carbs === null || targets?.carbs === undefined
            ? ""
            : round0(targets.carbs),
        fat:
          targets?.fat === null || targets?.fat === undefined
            ? ""
            : round0(targets.fat),
        dietPreference: preferences?.dietPreference ?? "none",
        excludeBeef: preferences?.excludeBeef ?? false,
        excludePork: preferences?.excludePork ?? false,
        excludeSeafood: preferences?.excludeSeafood ?? false,
        excludeDairy: preferences?.excludeDairy ?? false,
        excludeEggs: preferences?.excludeEggs ?? false,
        excludeGluten: preferences?.excludeGluten ?? false,
        excludeNuts: preferences?.excludeNuts ?? false,
        notes: preferences?.notes ?? "",
      }) as MealGoalFormValues,
    [preferences, profile, targets],
  );

  const form = useForm({
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (!isLoadingSettings) {
      (form as any).reset(initialValues);
    }
  }, [form, initialValues, isLoadingSettings]);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

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
        macroTolerancePct: values.tolerancePct as number,
      });
    } finally {
      setSavingProfile(false);
    }
  };

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

  const applySuggestedTargets = () => {
    if (!suggestion?.suggestion) {
      return;
    }
    form.setFieldValue("protein", round0(suggestion.suggestion.protein));
    form.setFieldValue("carbs", round0(suggestion.suggestion.carbs));
    form.setFieldValue("fat", round0(suggestion.suggestion.fat));
  };

  return {
    form,
    isLoadingSettings,
    suggestion,
    savingProfile,
    savingTargets,
    savingPreferences,
    handleSaveProfile,
    handleSaveTargets,
    handleSavePreferences,
    applySuggestedTargets,
    parseNonNegativeInt,
  };
}
