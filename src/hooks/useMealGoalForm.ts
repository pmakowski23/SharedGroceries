import { useEffect, useState } from "react";
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
};

export function useMealGoalForm() {
  const settings = useQuery(api.nutritionGoals.getSettings, {});
  const suggestion = useQuery(api.nutritionGoals.suggestTargets, {});
  const updateProfile = useMutation(api.nutritionGoals.updateProfile);
  const setMacroTargets = useMutation(api.nutritionGoals.setMacroTargets);

  const form = useForm({
    defaultValues: {
      age: "",
      sex: "",
      heightCm: "",
      weightKg: "",
      bodyFatPct: "",
      activityLevel: "",
      goalDirection: "",
      tolerancePct: "",
      protein: "",
      carbs: "",
      fat: "",
    } as MealGoalFormValues,
  });
  const values = form.state.values;

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);

  useEffect(() => {
    if (!settings) return;
    form.setFieldValue("age", settings.profile.age ?? "");
    form.setFieldValue("sex", settings.profile.sex ?? "");
    form.setFieldValue("heightCm", settings.profile.heightCm ?? "");
    form.setFieldValue("weightKg", settings.profile.weightKg ?? "");
    form.setFieldValue("bodyFatPct", settings.profile.bodyFatPct ?? "");
    form.setFieldValue("activityLevel", settings.profile.activityLevel ?? "");
    form.setFieldValue("goalDirection", settings.profile.goalDirection ?? "");
    form.setFieldValue("tolerancePct", settings.targets.macroTolerancePct ?? "");
    form.setFieldValue(
      "protein",
      settings.targets.protein === null ? "" : round0(settings.targets.protein),
    );
    form.setFieldValue(
      "carbs",
      settings.targets.carbs === null ? "" : round0(settings.targets.carbs),
    );
    form.setFieldValue(
      "fat",
      settings.targets.fat === null ? "" : round0(settings.targets.fat),
    );
  }, [form, settings]);

  const isFilledNumber = (value: number | ""): value is number =>
    value !== "" && Number.isFinite(value);

  const canSaveProfile =
    isFilledNumber(values.age) &&
    values.sex !== "" &&
    isFilledNumber(values.heightCm) &&
    isFilledNumber(values.weightKg) &&
    values.activityLevel !== "" &&
    values.goalDirection !== "" &&
    isFilledNumber(values.tolerancePct);

  const canSaveTargets =
    isFilledNumber(values.protein) &&
    isFilledNumber(values.carbs) &&
    isFilledNumber(values.fat) &&
    isFilledNumber(values.tolerancePct);

  const kcal: number | "" =
    canSaveTargets
      ? round0(
          (values.protein as number) * 4 +
            (values.carbs as number) * 4 +
            (values.fat as number) * 9,
        )
      : "";

  const handleSaveProfile = async () => {
    if (!canSaveProfile) return;
    setSavingProfile(true);
    try {
      await updateProfile({
        age: values.age as number,
        sex: values.sex as "male" | "female",
        heightCm: values.heightCm as number,
        weightKg: values.weightKg as number,
        bodyFatPct: values.bodyFatPct === "" ? undefined : Number(values.bodyFatPct),
        activityLevel: values.activityLevel as ActivityLevel,
        goalDirection: values.goalDirection as GoalDirection,
        macroTolerancePct: values.tolerancePct as number,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion?.canSuggest || !suggestion.suggestion) return;
    form.setFieldValue("protein", round0(suggestion.suggestion.protein));
    form.setFieldValue("carbs", round0(suggestion.suggestion.carbs));
    form.setFieldValue("fat", round0(suggestion.suggestion.fat));
  };

  const handleSaveTargets = async () => {
    if (!canSaveTargets) return;
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

  return {
    suggestion,
    age: values.age,
    setAge: (value: number | "") => form.setFieldValue("age", value),
    sex: values.sex,
    setSex: (value: "male" | "female" | "") => form.setFieldValue("sex", value),
    heightCm: values.heightCm,
    setHeightCm: (value: number | "") => form.setFieldValue("heightCm", value),
    weightKg: values.weightKg,
    setWeightKg: (value: number | "") => form.setFieldValue("weightKg", value),
    bodyFatPct: values.bodyFatPct,
    setBodyFatPct: (value: number | "") => form.setFieldValue("bodyFatPct", value),
    activityLevel: values.activityLevel,
    setActivityLevel: (value: OptionalActivityLevel) =>
      form.setFieldValue("activityLevel", value),
    goalDirection: values.goalDirection,
    setGoalDirection: (value: OptionalGoalDirection) =>
      form.setFieldValue("goalDirection", value),
    tolerancePct: values.tolerancePct,
    setTolerancePct: (value: number | "") =>
      form.setFieldValue("tolerancePct", value),
    protein: values.protein,
    setProtein: (value: number | "") => form.setFieldValue("protein", value),
    carbs: values.carbs,
    setCarbs: (value: number | "") => form.setFieldValue("carbs", value),
    fat: values.fat,
    setFat: (value: number | "") => form.setFieldValue("fat", value),
    kcal,
    savingProfile,
    savingTargets,
    canSaveProfile,
    canSaveTargets,
    handleSaveProfile,
    applySuggestion,
    handleSaveTargets,
    parseNonNegativeInt,
  };
}
