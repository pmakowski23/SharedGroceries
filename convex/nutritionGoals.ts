import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
} as const;

const goalKcalMultipliers = {
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
} as const;

const proteinByGoal = {
  lose: 2.0,
  maintain: 1.6,
  gain: 1.8,
} as const;

const fatByGoal = {
  lose: 0.8,
  maintain: 0.9,
  gain: 1.0,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round0(value: number): number {
  return Math.round(value);
}

function normalizeSettingNumber(value: number | undefined): number | null {
  return typeof value === "number" ? value : null;
}

export const getSettings = query({
  args: {},
  returns: v.object({
    profile: v.object({
      age: v.union(v.number(), v.null()),
      sex: v.union(v.literal("male"), v.literal("female"), v.null()),
      heightCm: v.union(v.number(), v.null()),
      weightKg: v.union(v.number(), v.null()),
      bodyFatPct: v.union(v.number(), v.null()),
      activityLevel: v.union(
        v.literal("sedentary"),
        v.literal("light"),
        v.literal("moderate"),
        v.literal("active"),
        v.literal("veryActive"),
        v.null(),
      ),
      goalDirection: v.union(
        v.literal("lose"),
        v.literal("maintain"),
        v.literal("gain"),
        v.null(),
      ),
    }),
    targets: v.object({
      kcal: v.union(v.number(), v.null()),
      protein: v.union(v.number(), v.null()),
      carbs: v.union(v.number(), v.null()),
      fat: v.union(v.number(), v.null()),
      macroTolerancePct: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const settings = await ctx.db.query("appSettings").first();
    return {
      profile: {
        age: normalizeSettingNumber(settings?.profileAge),
        sex: settings?.profileSex ?? null,
        heightCm: normalizeSettingNumber(settings?.profileHeightCm),
        weightKg: normalizeSettingNumber(settings?.profileWeightKg),
        bodyFatPct: normalizeSettingNumber(settings?.profileBodyFatPct),
        activityLevel: settings?.profileActivityLevel ?? null,
        goalDirection: settings?.profileGoalDirection ?? null,
      },
      targets: {
        kcal: normalizeSettingNumber(settings?.targetKcal),
        protein: normalizeSettingNumber(settings?.targetProtein),
        carbs: normalizeSettingNumber(settings?.targetCarbs),
        fat: normalizeSettingNumber(settings?.targetFat),
        macroTolerancePct: settings?.macroTolerancePct ?? 5,
      },
    };
  },
});

export const updateProfile = mutation({
  args: {
    age: v.number(),
    sex: v.union(v.literal("male"), v.literal("female")),
    heightCm: v.number(),
    weightKg: v.number(),
    bodyFatPct: v.optional(v.number()),
    activityLevel: v.union(
      v.literal("sedentary"),
      v.literal("light"),
      v.literal("moderate"),
      v.literal("active"),
      v.literal("veryActive"),
    ),
    goalDirection: v.union(
      v.literal("lose"),
      v.literal("maintain"),
      v.literal("gain"),
    ),
    macroTolerancePct: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("appSettings").first();
    const patch = {
      profileAge: args.age,
      profileSex: args.sex,
      profileHeightCm: args.heightCm,
      profileWeightKg: args.weightKg,
      profileBodyFatPct: args.bodyFatPct,
      profileActivityLevel: args.activityLevel,
      profileGoalDirection: args.goalDirection,
      macroTolerancePct:
        args.macroTolerancePct ?? settings?.macroTolerancePct ?? 5,
    };

    if (settings) {
      await ctx.db.patch(settings._id, patch);
      return null;
    }

    await ctx.db.insert("appSettings", {
      ...patch,
      password: undefined,
      currentStoreId: undefined,
      selectedModel: undefined,
    });
    return null;
  },
});

export const setMacroTargets = mutation({
  args: {
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    macroTolerancePct: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("appSettings").first();
    const patch = {
      targetKcal: round0(args.protein * 4 + args.carbs * 4 + args.fat * 9),
      targetProtein: round0(args.protein),
      targetCarbs: round0(args.carbs),
      targetFat: round0(args.fat),
      macroTolerancePct:
        args.macroTolerancePct ?? settings?.macroTolerancePct ?? 5,
    };

    if (settings) {
      await ctx.db.patch(settings._id, patch);
      return null;
    }

    await ctx.db.insert("appSettings", {
      ...patch,
      password: undefined,
      currentStoreId: undefined,
      selectedModel: undefined,
    });
    return null;
  },
});

export const suggestTargets = query({
  args: {},
  returns: v.object({
    canSuggest: v.boolean(),
    reason: v.union(v.string(), v.null()),
    bmr: v.union(v.number(), v.null()),
    tdee: v.union(v.number(), v.null()),
    suggestion: v.union(
      v.object({
        kcal: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
      }),
      v.null(),
    ),
  }),
  handler: async (ctx) => {
    const settings = await ctx.db.query("appSettings").first();
    if (
      !settings?.profileAge ||
      !settings.profileSex ||
      !settings.profileHeightCm ||
      !settings.profileWeightKg ||
      !settings.profileActivityLevel ||
      !settings.profileGoalDirection
    ) {
      return {
        canSuggest: false,
        reason:
          "Profile is incomplete. Fill age, sex, height, weight, activity level, and goal direction.",
        bmr: null,
        tdee: null,
        suggestion: null,
      };
    }

    const weightKg = settings.profileWeightKg;
    const heightCm = settings.profileHeightCm;
    const age = settings.profileAge;
    const sex = settings.profileSex;
    const activityLevel = settings.profileActivityLevel;
    const goalDirection = settings.profileGoalDirection;

    const bmr =
      sex === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    const tdee = bmr * activityMultipliers[activityLevel];
    const targetKcal = Math.round(tdee * goalKcalMultipliers[goalDirection]);

    const amdrProteinMin = (targetKcal * 0.1) / 4;
    const amdrProteinMax = (targetKcal * 0.35) / 4;
    const amdrFatMin = (targetKcal * 0.2) / 9;
    const amdrFatMax = (targetKcal * 0.35) / 9;
    const amdrCarbsMin = (targetKcal * 0.45) / 4;
    const amdrCarbsMax = (targetKcal * 0.65) / 4;

    const protein = clamp(
      weightKg * proteinByGoal[goalDirection],
      amdrProteinMin,
      amdrProteinMax,
    );
    let fat = clamp(
      weightKg * fatByGoal[goalDirection],
      amdrFatMin,
      amdrFatMax,
    );
    let carbs = (targetKcal - protein * 4 - fat * 9) / 4;
    carbs = clamp(carbs, amdrCarbsMin, amdrCarbsMax);

    let usedKcal = protein * 4 + carbs * 4 + fat * 9;
    let kcalDelta = targetKcal - usedKcal;
    fat = clamp(fat + kcalDelta / 9, amdrFatMin, amdrFatMax);

    usedKcal = protein * 4 + carbs * 4 + fat * 9;
    kcalDelta = targetKcal - usedKcal;
    carbs = clamp(carbs + kcalDelta / 4, amdrCarbsMin, amdrCarbsMax);

    return {
      canSuggest: true,
      reason: null,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      suggestion: {
        kcal: targetKcal,
        protein: round0(protein),
        carbs: round0(carbs),
        fat: round0(fat),
      },
    };
  },
});
