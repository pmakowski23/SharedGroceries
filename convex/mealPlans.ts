import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  normalizeIngredientMacroShape,
  normalizeUnitShortName,
} from "./lib/ingredientNutrition";
import { computeRecipePartMacros } from "./lib/recipePartNutrition";
import { listFamilyMemberProfiles, requireViewer } from "./families";
import {
  aggregateFamilyPlanningContext,
  recipePreferencePenalty,
  recipeViolatesFamilyPreferences,
} from "./lib/familyPlanning";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

type MacroTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

function emptyMacros(): MacroTotals {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

function scoreDelta(actual: MacroTotals, target: MacroTotals): number {
  const safe = (value: number) => Math.max(1, value);
  const kcalErr = Math.abs(actual.kcal - target.kcal) / safe(target.kcal);
  const proteinErr =
    Math.abs(actual.protein - target.protein) / safe(target.protein);
  const carbsErr = Math.abs(actual.carbs - target.carbs) / safe(target.carbs);
  const fatErr = Math.abs(actual.fat - target.fat) / safe(target.fat);
  return kcalErr * 0.35 + proteinErr * 0.25 + carbsErr * 0.2 + fatErr * 0.2;
}

function isMealTag(value: string): value is (typeof MEAL_TYPES)[number] {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

async function requireMealPlanForFamily(
  ctx: any,
  familyId: Id<"families">,
  mealPlanId: Id<"mealPlans">,
) {
  const mealPlan = await ctx.db.get(mealPlanId);
  if (!mealPlan || mealPlan.familyId !== familyId) {
    throw new Error("Meal plan not found");
  }
  return mealPlan;
}

async function buildFamilyRecipePool(
  ctx: any,
  familyId: Id<"families">,
  planningProfiles: Array<{
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
  const recipes = await ctx.db
    .query("recipes")
    .withIndex("by_familyId", (q: any) => q.eq("familyId", familyId))
    .collect();
  const pool: Array<{
    recipeId: Id<"recipes">;
    recipeName: string;
    recipeDescription: string;
    servingsBase: number;
    mealTags: Array<(typeof MEAL_TYPES)[number]>;
    perServing: MacroTotals;
    penalty: number;
  }> = [];

  for (const recipe of recipes) {
    const ingredients = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId", (q: any) => q.eq("recipeId", recipe._id))
      .collect();
    const parts = await ctx.db
      .query("recipeParts")
      .withIndex("by_recipeId", (q: any) => q.eq("recipeId", recipe._id))
      .collect();
    if (ingredients.length === 0 || recipe.servings <= 0) {
      continue;
    }

    const ingredientNames = ingredients.map(
      (ingredient: { name: string }) => ingredient.name,
    );
    const preferenceText = [
      recipe.name,
      recipe.description,
      ...ingredientNames,
    ];
    if (recipeViolatesFamilyPreferences(preferenceText, planningProfiles)) {
      continue;
    }

    const normalizedIngredients = ingredients.map((ingredient: any) => {
      const normalized = normalizeIngredientMacroShape(ingredient);
      return {
        ...ingredient,
        ...normalized,
        unit: normalizeUnitShortName(normalized.unit),
      };
    });
    const base = computeRecipePartMacros(
      parts as Array<{ _id: string; scale: number; yieldAmount?: number; yieldUnit?: string }>,
      normalizedIngredients as Array<any>,
    ).total;

    const persistedTags = (recipe as { mealTags?: Array<string> }).mealTags ?? [];
    const normalizedTags = persistedTags.filter(isMealTag);
    const mealTags = normalizedTags.length > 0 ? normalizedTags : [...MEAL_TYPES];

    pool.push({
      recipeId: recipe._id,
      recipeName: recipe.name,
      recipeDescription: recipe.description,
      servingsBase: recipe.servings,
      mealTags,
      perServing: {
        kcal: base.kcal / recipe.servings,
        protein: base.protein / recipe.servings,
        carbs: base.carbs / recipe.servings,
        fat: base.fat / recipe.servings,
      },
      penalty: recipePreferencePenalty(preferenceText, planningProfiles),
    });
  }

  return pool;
}

async function generateDayPlanForFamily(
  ctx: any,
  familyId: Id<"families">,
  date: string,
) {
  const planningProfiles = await listFamilyMemberProfiles(ctx, familyId);
  const aggregate = aggregateFamilyPlanningContext(planningProfiles);
  if (!aggregate.targets) {
    throw new Error(
      "At least one family member must save daily targets before generating a plan.",
    );
  }

  const recipesWithMacros = await buildFamilyRecipePool(
    ctx,
    familyId,
    planningProfiles,
  );
  if (recipesWithMacros.length === 0) {
    throw new Error("No recipes match the family preferences.");
  }

  const target: MacroTotals = {
    kcal: aggregate.targets.kcal,
    protein: aggregate.targets.protein,
    carbs: aggregate.targets.carbs,
    fat: aggregate.targets.fat,
  };

  const slotKcalShare: Record<(typeof MEAL_TYPES)[number], number> = {
    Breakfast: 0.25,
    Lunch: 0.3,
    Dinner: 0.35,
    Snack: 0.1,
  };

  const selected: Array<{
    mealType: (typeof MEAL_TYPES)[number];
    recipeId: Id<"recipes">;
    servings: number;
    macros: MacroTotals;
  }> = [];

  for (const mealType of MEAL_TYPES) {
    const candidates = recipesWithMacros.filter((recipe) =>
      recipe.mealTags.includes(mealType),
    );
    const pool = candidates.length > 0 ? candidates : recipesWithMacros;
    const slotTarget: MacroTotals = {
      kcal: target.kcal * slotKcalShare[mealType],
      protein: target.protein * slotKcalShare[mealType],
      carbs: target.carbs * slotKcalShare[mealType],
      fat: target.fat * slotKcalShare[mealType],
    };

    let best:
      | {
          recipeId: Id<"recipes">;
          servings: number;
          macros: MacroTotals;
          score: number;
        }
      | null = null;

    for (const recipe of pool) {
      const estimatedServings =
        slotTarget.kcal / Math.max(1, recipe.perServing.kcal);
      const servings = Math.max(
        0.5,
        Math.min(8, Math.round(estimatedServings * 4) / 4),
      );
      const macros = {
        kcal: recipe.perServing.kcal * servings,
        protein: recipe.perServing.protein * servings,
        carbs: recipe.perServing.carbs * servings,
        fat: recipe.perServing.fat * servings,
      };
      const score = scoreDelta(macros, slotTarget) + recipe.penalty;
      if (!best || score < best.score) {
        best = {
          recipeId: recipe.recipeId,
          servings,
          macros,
          score,
        };
      }
    }

    if (best) {
      selected.push({
        mealType,
        recipeId: best.recipeId,
        servings: best.servings,
        macros: best.macros,
      });
    }
  }

  const servingSteps = [-0.25, 0.25, -0.5, 0.5];
  for (let i = 0; i < 80; i += 1) {
    const currentTotals = selected.reduce(
      (acc, slot) => addMacros(acc, slot.macros),
      emptyMacros(),
    );
    const currentScore = scoreDelta(currentTotals, target);
    let improved = false;

    for (const slot of selected) {
      const recipe = recipesWithMacros.find((candidate) => candidate.recipeId === slot.recipeId);
      if (!recipe) {
        continue;
      }

      for (const step of servingSteps) {
        const nextServings = Math.max(
          0.5,
          Math.min(8, Math.round((slot.servings + step) * 4) / 4),
        );
        if (nextServings === slot.servings) {
          continue;
        }

        const nextMacros = {
          kcal: recipe.perServing.kcal * nextServings,
          protein: recipe.perServing.protein * nextServings,
          carbs: recipe.perServing.carbs * nextServings,
          fat: recipe.perServing.fat * nextServings,
        };

        const proposalTotals = selected.reduce((acc, candidate) => {
          if (candidate.mealType === slot.mealType) {
            return addMacros(acc, nextMacros);
          }
          return addMacros(acc, candidate.macros);
        }, emptyMacros());
        const proposalScore = scoreDelta(proposalTotals, target);
        if (proposalScore + 0.0001 < currentScore) {
          slot.servings = nextServings;
          slot.macros = nextMacros;
          improved = true;
        }
      }
    }

    if (!improved) {
      break;
    }
  }

  const existing = await ctx.db
    .query("mealPlans")
    .withIndex("by_family_date", (q: any) =>
      q.eq("familyId", familyId).eq("date", date),
    )
    .collect();
  for (const plan of existing) {
    await ctx.db.delete(plan._id);
  }

  for (const slot of selected) {
    await ctx.db.insert("mealPlans", {
      familyId,
      date,
      mealType: slot.mealType,
      recipeId: slot.recipeId,
      servings: slot.servings,
    });
  }

  const totals = selected.reduce(
    (acc, slot) => addMacros(acc, slot.macros),
    emptyMacros(),
  );
  return {
    generatedCount: selected.length,
    totals: {
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
    },
  };
}

export const getWeek = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("mealPlans"),
      _creationTime: v.number(),
      date: v.string(),
      mealType: v.string(),
      recipeId: v.id("recipes"),
      servings: v.number(),
      recipeName: v.string(),
      totalKcal: v.number(),
      totalProtein: v.number(),
      totalCarbs: v.number(),
      totalFat: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const allPlans = await ctx.db
      .query("mealPlans")
      .withIndex("by_familyId", (q: any) => q.eq("familyId", viewer.family._id))
      .collect();

    const weekPlans = allPlans.filter(
      (plan) => plan.date >= args.startDate && plan.date <= args.endDate,
    );

    const result = [];
    for (const plan of weekPlans) {
      const recipe = await ctx.db.get(plan.recipeId);
      if (!recipe || recipe.familyId !== viewer.family._id) {
        continue;
      }

      const ingredients = await ctx.db
        .query("recipeIngredients")
        .withIndex("by_recipeId", (q: any) => q.eq("recipeId", plan.recipeId))
        .collect();
      const parts = await ctx.db
        .query("recipeParts")
        .withIndex("by_recipeId", (q: any) => q.eq("recipeId", plan.recipeId))
        .collect();

      const scale = plan.servings / recipe.servings;
      const normalizedIngredients = ingredients.map((ingredient) => {
        const normalized = normalizeIngredientMacroShape(ingredient);
        return {
          ...ingredient,
          ...normalized,
          unit: normalizeUnitShortName(normalized.unit),
        };
      });
      const macrosBase = computeRecipePartMacros(
        parts as Array<{ _id: string; scale: number; yieldAmount?: number; yieldUnit?: string }>,
        normalizedIngredients as Array<any>,
      ).total;
      const macros = {
        kcal: macrosBase.kcal * scale,
        protein: macrosBase.protein * scale,
        carbs: macrosBase.carbs * scale,
        fat: macrosBase.fat * scale,
      };

      result.push({
        ...plan,
        recipeName: recipe.name,
        totalKcal: Math.round(macros.kcal),
        totalProtein: Math.round(macros.protein * 10) / 10,
        totalCarbs: Math.round(macros.carbs * 10) / 10,
        totalFat: Math.round(macros.fat * 10) / 10,
      });
    }
    return result;
  },
});

export const addMeal = mutation({
  args: {
    date: v.string(),
    mealType: v.string(),
    recipeId: v.id("recipes"),
    servings: v.number(),
  },
  returns: v.id("mealPlans"),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.familyId !== viewer.family._id) {
      throw new Error("Recipe not found");
    }

    const existing = await ctx.db
      .query("mealPlans")
      .withIndex("by_family_date_and_mealType", (q: any) =>
        q
          .eq("familyId", viewer.family._id)
          .eq("date", args.date)
          .eq("mealType", args.mealType),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        recipeId: args.recipeId,
        servings: args.servings,
      });
      return existing._id;
    }

    return await ctx.db.insert("mealPlans", {
      familyId: viewer.family._id,
      date: args.date,
      mealType: args.mealType,
      recipeId: args.recipeId,
      servings: args.servings,
    });
  },
});

export const removeMeal = mutation({
  args: { mealPlanId: v.id("mealPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireMealPlanForFamily(ctx, viewer.family._id, args.mealPlanId);
    await ctx.db.delete(args.mealPlanId);
    return null;
  },
});

export const updateServings = mutation({
  args: {
    mealPlanId: v.id("mealPlans"),
    servings: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireMealPlanForFamily(ctx, viewer.family._id, args.mealPlanId);
    await ctx.db.patch(args.mealPlanId, {
      servings: args.servings,
    });
    return null;
  },
});

export const generateDayPlan = mutation({
  args: {
    date: v.string(),
  },
  returns: v.object({
    generatedCount: v.number(),
    totals: v.object({
      kcal: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    return await generateDayPlanForFamily(ctx, viewer.family._id, args.date);
  },
});

export const generateWeekPlan = mutation({
  args: {
    dates: v.array(v.string()),
  },
  returns: v.object({
    daysGenerated: v.number(),
  }),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    for (const date of args.dates) {
      await generateDayPlanForFamily(ctx, viewer.family._id, date);
    }
    return {
      daysGenerated: args.dates.length,
    };
  },
});

export const generateGroceryList = action({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const weekMeals = await ctx.runQuery(api.mealPlans.getWeek, {
      startDate: args.startDate,
      endDate: args.endDate,
    });

    const aggregated: Record<string, { amount: number; unit: string }> = {};

    for (const meal of weekMeals) {
      const recipe = await ctx.runQuery(api.recipes.get, {
        recipeId: meal.recipeId,
      });
      if (!recipe) {
        continue;
      }

      const ingredients = await ctx.runQuery(api.recipes.getIngredients, {
        recipeId: meal.recipeId,
      });
      const parts = await ctx.runQuery(api.recipes.getParts, {
        recipeId: meal.recipeId,
      });
      const partScaleById = new Map(
        parts.map((part: { _id: Id<"recipeParts">; scale: number }) => [
          part._id,
          part.scale,
        ]),
      );
      const scale = meal.servings / recipe.servings;

      for (const ingredient of ingredients) {
        if (ingredient.sourcePartId) {
          continue;
        }
        const key = `${ingredient.name.toLowerCase()}|${ingredient.unit}`;
        if (!aggregated[key]) {
          aggregated[key] = { amount: 0, unit: ingredient.unit };
        }
        const partScale = partScaleById.get(ingredient.partId);
        if (partScale === undefined || partScale === null) {
          throw new Error("Ingredient part not found in recipe parts");
        }
        aggregated[key].amount += ingredient.amount * scale * partScale;
      }
    }

    for (const [key, value] of Object.entries(aggregated)) {
      const name = key.split("|")[0];
      const amount = Math.round(value.amount * 10) / 10;
      const itemName = `${name} (${amount} ${value.unit})`;
      await ctx.runAction(api.groceries.categorizeItem, {
        itemName,
      });
    }

    return null;
  },
});
