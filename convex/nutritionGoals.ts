import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { listFamilyMemberProfiles, requireViewer } from "./families";

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

function buildPreferences(profile: {
  dietPreference?: string;
  excludeBeef?: boolean;
  excludePork?: boolean;
  excludeSeafood?: boolean;
  excludeDairy?: boolean;
  excludeEggs?: boolean;
  excludeGluten?: boolean;
  excludeNuts?: boolean;
  preferenceNotes?: string;
}) {
  return {
    dietPreference: profile.dietPreference ?? "none",
    excludeBeef: profile.excludeBeef ?? false,
    excludePork: profile.excludePork ?? false,
    excludeSeafood: profile.excludeSeafood ?? false,
    excludeDairy: profile.excludeDairy ?? false,
    excludeEggs: profile.excludeEggs ?? false,
    excludeGluten: profile.excludeGluten ?? false,
    excludeNuts: profile.excludeNuts ?? false,
    notes: profile.preferenceNotes ?? "",
  };
}

function aggregateFamilyTargets(
  profiles: Array<{
    targetKcal?: number;
    targetProtein?: number;
    targetCarbs?: number;
    targetFat?: number;
    macroTolerancePct?: number;
    dietPreference?: string;
    excludeBeef?: boolean;
    excludePork?: boolean;
    excludeSeafood?: boolean;
    excludeDairy?: boolean;
    excludeEggs?: boolean;
    excludeGluten?: boolean;
    excludeNuts?: boolean;
    preferenceNotes?: string;
  }>,
) {
  const completeProfiles = profiles.filter(
    (profile) =>
      profile.targetKcal !== undefined &&
      profile.targetProtein !== undefined &&
      profile.targetCarbs !== undefined &&
      profile.targetFat !== undefined,
  );

  const totals = completeProfiles.reduce(
    (acc, profile) => ({
      kcal: acc.kcal + (profile.targetKcal ?? 0),
      protein: acc.protein + (profile.targetProtein ?? 0),
      carbs: acc.carbs + (profile.targetCarbs ?? 0),
      fat: acc.fat + (profile.targetFat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const hardExclusions = Array.from(
    new Set(
      [
        profiles.some((profile) => profile.excludeBeef) ? "Beef" : null,
        profiles.some((profile) => profile.excludePork) ? "Pork" : null,
        profiles.some((profile) => profile.excludeSeafood) ? "Seafood" : null,
        profiles.some((profile) => profile.excludeDairy) ? "Dairy" : null,
        profiles.some((profile) => profile.excludeEggs) ? "Eggs" : null,
        profiles.some((profile) => profile.excludeGluten) ? "Gluten" : null,
        profiles.some((profile) => profile.excludeNuts) ? "Nuts" : null,
      ].filter((value): value is string => value !== null),
    ),
  );

  return {
    memberCount: profiles.length,
    membersWithTargets: completeProfiles.length,
    targets: {
      kcal: completeProfiles.length > 0 ? totals.kcal : null,
      protein: completeProfiles.length > 0 ? totals.protein : null,
      carbs: completeProfiles.length > 0 ? totals.carbs : null,
      fat: completeProfiles.length > 0 ? totals.fat : null,
      macroTolerancePct:
        profiles.reduce(
          (acc, profile) => Math.max(acc, profile.macroTolerancePct ?? 5),
          5,
        ) ?? 5,
    },
    preferences: {
      hardExclusions,
      veganVotes: profiles.filter(
        (profile) =>
          profile.dietPreference === "vegan" ||
          profile.dietPreference === "moreVegan",
      ).length,
      vegetarianVotes: profiles.filter(
        (profile) =>
          profile.dietPreference === "vegetarian" ||
          profile.dietPreference === "moreVegetarian",
      ).length,
      notes: profiles
        .map((profile) => profile.preferenceNotes?.trim())
        .filter((value): value is string => Boolean(value)),
    },
  };
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
    preferences: v.object({
      dietPreference: v.string(),
      excludeBeef: v.boolean(),
      excludePork: v.boolean(),
      excludeSeafood: v.boolean(),
      excludeDairy: v.boolean(),
      excludeEggs: v.boolean(),
      excludeGluten: v.boolean(),
      excludeNuts: v.boolean(),
      notes: v.string(),
    }),
  }),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const profile = viewer.memberProfile;
    return {
      profile: {
        age: normalizeSettingNumber(profile?.profileAge),
        sex: profile?.profileSex ?? null,
        heightCm: normalizeSettingNumber(profile?.profileHeightCm),
        weightKg: normalizeSettingNumber(profile?.profileWeightKg),
        bodyFatPct: normalizeSettingNumber(profile?.profileBodyFatPct),
        activityLevel: profile?.profileActivityLevel ?? null,
        goalDirection: profile?.profileGoalDirection ?? null,
      },
      targets: {
        kcal: normalizeSettingNumber(profile?.targetKcal),
        protein: normalizeSettingNumber(profile?.targetProtein),
        carbs: normalizeSettingNumber(profile?.targetCarbs),
        fat: normalizeSettingNumber(profile?.targetFat),
        macroTolerancePct: profile?.macroTolerancePct ?? 5,
      },
      preferences: buildPreferences(profile ?? {}),
    };
  },
});

export const getFamilyPlanningContext = query({
  args: {},
  returns: v.object({
    memberCount: v.number(),
    membersWithTargets: v.number(),
    targets: v.object({
      kcal: v.union(v.number(), v.null()),
      protein: v.union(v.number(), v.null()),
      carbs: v.union(v.number(), v.null()),
      fat: v.union(v.number(), v.null()),
      macroTolerancePct: v.number(),
    }),
    preferences: v.object({
      hardExclusions: v.array(v.string()),
      veganVotes: v.number(),
      vegetarianVotes: v.number(),
      notes: v.array(v.string()),
    }),
  }),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const profiles = await listFamilyMemberProfiles(ctx, viewer.family._id);
    return aggregateFamilyTargets(profiles);
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
    const viewer = await requireViewer(ctx);
    if (!viewer.memberProfile) {
      throw new Error("Member profile not found");
    }
    await ctx.db.patch(viewer.memberProfile._id, {
      profileAge: args.age,
      profileSex: args.sex,
      profileHeightCm: args.heightCm,
      profileWeightKg: args.weightKg,
      profileBodyFatPct: args.bodyFatPct,
      profileActivityLevel: args.activityLevel,
      profileGoalDirection: args.goalDirection,
      macroTolerancePct:
        args.macroTolerancePct ?? viewer.memberProfile.macroTolerancePct ?? 5,
    });
    return null;
  },
});

export const updatePreferences = mutation({
  args: {
    dietPreference: v.union(
      v.literal("none"),
      v.literal("moreVegetarian"),
      v.literal("moreVegan"),
      v.literal("vegetarian"),
      v.literal("vegan"),
    ),
    excludeBeef: v.boolean(),
    excludePork: v.boolean(),
    excludeSeafood: v.boolean(),
    excludeDairy: v.boolean(),
    excludeEggs: v.boolean(),
    excludeGluten: v.boolean(),
    excludeNuts: v.boolean(),
    notes: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    if (!viewer.memberProfile) {
      throw new Error("Member profile not found");
    }
    await ctx.db.patch(viewer.memberProfile._id, {
      dietPreference: args.dietPreference,
      excludeBeef: args.excludeBeef,
      excludePork: args.excludePork,
      excludeSeafood: args.excludeSeafood,
      excludeDairy: args.excludeDairy,
      excludeEggs: args.excludeEggs,
      excludeGluten: args.excludeGluten,
      excludeNuts: args.excludeNuts,
      preferenceNotes: args.notes.trim(),
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
    const viewer = await requireViewer(ctx);
    if (!viewer.memberProfile) {
      throw new Error("Member profile not found");
    }
    await ctx.db.patch(viewer.memberProfile._id, {
      targetKcal: round0(args.protein * 4 + args.carbs * 4 + args.fat * 9),
      targetProtein: round0(args.protein),
      targetCarbs: round0(args.carbs),
      targetFat: round0(args.fat),
      macroTolerancePct:
        args.macroTolerancePct ?? viewer.memberProfile.macroTolerancePct ?? 5,
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
    const viewer = await requireViewer(ctx);
    const profile = viewer.memberProfile;
    if (
      !profile?.profileAge ||
      !profile.profileSex ||
      !profile.profileHeightCm ||
      !profile.profileWeightKg ||
      !profile.profileActivityLevel ||
      !profile.profileGoalDirection
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

    const weightKg = profile.profileWeightKg;
    const heightCm = profile.profileHeightCm;
    const age = profile.profileAge;
    const sex = profile.profileSex;
    const activityLevel = profile.profileActivityLevel;
    const goalDirection = profile.profileGoalDirection;

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
      proteinByGoal[goalDirection] * weightKg,
      amdrProteinMin,
      amdrProteinMax,
    );
    const fat = clamp(
      fatByGoal[goalDirection] * weightKg,
      amdrFatMin,
      amdrFatMax,
    );
    let carbs = (targetKcal - protein * 4 - fat * 9) / 4;
    carbs = clamp(carbs, amdrCarbsMin, amdrCarbsMax);

    const usedKcal = protein * 4 + carbs * 4 + fat * 9;
    let kcalDelta = targetKcal - usedKcal;
    if (kcalDelta > 0) {
      carbs += kcalDelta / 4;
    }
    const repairedKcal = protein * 4 + carbs * 4 + fat * 9;
    kcalDelta = targetKcal - repairedKcal;
    if (Math.abs(kcalDelta) > 1) {
      carbs += kcalDelta / 4;
    }

    return {
      canSuggest: true,
      reason: null,
      bmr: round0(bmr),
      tdee: round0(tdee),
      suggestion: {
        kcal: targetKcal,
        protein: round0(protein),
        carbs: round0(carbs),
        fat: round0(fat),
      },
    };
  },
});
