import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  ingredientMacrosForAmount,
  normalizeIngredientMacroShape,
} from "./lib/ingredientNutrition";

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
  const safe = (v: number) => Math.max(1, v);
  const kcalErr = Math.abs(actual.kcal - target.kcal) / safe(target.kcal);
  const proteinErr = Math.abs(actual.protein - target.protein) / safe(target.protein);
  const carbsErr = Math.abs(actual.carbs - target.carbs) / safe(target.carbs);
  const fatErr = Math.abs(actual.fat - target.fat) / safe(target.fat);
  return kcalErr * 0.35 + proteinErr * 0.25 + carbsErr * 0.2 + fatErr * 0.2;
}

function isMealTag(value: string): value is (typeof MEAL_TYPES)[number] {
  return (MEAL_TYPES as readonly string[]).includes(value);
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
    })
  ),
  handler: async (ctx, args) => {
    const allPlans = await ctx.db.query("mealPlans").withIndex("by_date").collect();

    const weekPlans = allPlans.filter(
      (p) => p.date >= args.startDate && p.date <= args.endDate
    );

    const result = [];
    for (const plan of weekPlans) {
      const recipe = await ctx.db.get(plan.recipeId);
      if (!recipe) continue;

      const ingredients = await ctx.db
        .query("recipeIngredients")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", plan.recipeId))
        .collect();

      const scale = plan.servings / recipe.servings;
      const macros = ingredients.reduce(
        (acc, ing) => {
          const ingredientTotals = ingredientMacrosForAmount(normalizeIngredientMacroShape(ing));
          return {
            kcal: acc.kcal + ingredientTotals.kcal * scale,
            protein: acc.protein + ingredientTotals.protein * scale,
            carbs: acc.carbs + ingredientTotals.carbs * scale,
            fat: acc.fat + ingredientTotals.fat * scale,
          };
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      );

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
    const existing = await ctx.db
      .query("mealPlans")
      .withIndex("by_date_and_mealType", (q) =>
        q.eq("date", args.date).eq("mealType", args.mealType)
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
    await ctx.db.patch(args.mealPlanId, { servings: args.servings });
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
    const settings = await ctx.db.query("appSettings").first();
    if (
      !settings?.targetKcal ||
      !settings.targetProtein ||
      !settings.targetCarbs ||
      !settings.targetFat
    ) {
      throw new Error("Daily kcal and macro targets must be set before generating.");
    }

    const target: MacroTotals = {
      kcal: settings.targetKcal,
      protein: settings.targetProtein,
      carbs: settings.targetCarbs,
      fat: settings.targetFat,
    };

    const recipes = await ctx.db.query("recipes").collect();
    if (recipes.length === 0) {
      throw new Error("No recipes available for planning.");
    }

    const recipesWithMacros: Array<{
      recipeId: Id<"recipes">;
      recipeName: string;
      servingsBase: number;
      mealTags: Array<(typeof MEAL_TYPES)[number]>;
      perServing: MacroTotals;
    }> = [];

    for (const recipe of recipes) {
      const ingredients = await ctx.db
        .query("recipeIngredients")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();
      if (ingredients.length === 0 || recipe.servings <= 0) {
        continue;
      }

      const base = ingredients.reduce(
        (acc, ing) => {
          const ingredientTotals = ingredientMacrosForAmount(normalizeIngredientMacroShape(ing));
          return {
            kcal: acc.kcal + ingredientTotals.kcal,
            protein: acc.protein + ingredientTotals.protein,
            carbs: acc.carbs + ingredientTotals.carbs,
            fat: acc.fat + ingredientTotals.fat,
          };
        },
        emptyMacros()
      );

      const persistedTags = (recipe as { mealTags?: Array<string> }).mealTags ?? [];
      const normalizedTags = persistedTags.filter(isMealTag);
      const tags = normalizedTags.length > 0 ? normalizedTags : [...MEAL_TYPES];

      recipesWithMacros.push({
        recipeId: recipe._id,
        recipeName: recipe.name,
        servingsBase: recipe.servings,
        mealTags: tags,
        perServing: {
          kcal: base.kcal / recipe.servings,
          protein: base.protein / recipe.servings,
          carbs: base.carbs / recipe.servings,
          fat: base.fat / recipe.servings,
        },
      });
    }

    if (recipesWithMacros.length === 0) {
      throw new Error("No recipes with ingredient macros are available.");
    }

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
      const candidates = recipesWithMacros.filter((r) => r.mealTags.includes(mealType));
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
        const estimatedServings = slotTarget.kcal / Math.max(1, recipe.perServing.kcal);
        const servings = Math.max(0.5, Math.min(3, Math.round(estimatedServings * 4) / 4));
        const macros = {
          kcal: recipe.perServing.kcal * servings,
          protein: recipe.perServing.protein * servings,
          carbs: recipe.perServing.carbs * servings,
          fat: recipe.perServing.fat * servings,
        };
        const score = scoreDelta(macros, slotTarget);
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

    // Improve fit with local serving adjustments.
    const servingSteps = [-0.25, 0.25, -0.5, 0.5];
    for (let i = 0; i < 80; i++) {
      const currentTotals = selected.reduce((acc, slot) => addMacros(acc, slot.macros), emptyMacros());
      const currentScore = scoreDelta(currentTotals, target);
      let improved = false;

      for (const slot of selected) {
        const recipe = recipesWithMacros.find((r) => r.recipeId === slot.recipeId);
        if (!recipe) continue;

        for (const step of servingSteps) {
          const nextServings = Math.max(0.5, Math.min(4, Math.round((slot.servings + step) * 4) / 4));
          if (nextServings === slot.servings) continue;

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
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    for (const plan of existing) {
      await ctx.db.delete(plan._id);
    }

    for (const slot of selected) {
      await ctx.db.insert("mealPlans", {
        date: args.date,
        mealType: slot.mealType,
        recipeId: slot.recipeId,
        servings: slot.servings,
      });
    }

    const totals = selected.reduce((acc, slot) => addMacros(acc, slot.macros), emptyMacros());
    return {
      generatedCount: selected.length,
      totals: {
        kcal: Math.round(totals.kcal),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      },
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
      if (!recipe) continue;

      const ingredients = await ctx.runQuery(api.recipes.getIngredients, {
        recipeId: meal.recipeId,
      });

      const scale = meal.servings / recipe.servings;

      for (const ing of ingredients) {
        const key = `${ing.name.toLowerCase()}|${ing.unit}`;
        if (!aggregated[key]) {
          aggregated[key] = { amount: 0, unit: ing.unit };
        }
        aggregated[key].amount += ing.amount * scale;
      }
    }

    for (const [key, value] of Object.entries(aggregated)) {
      const name = key.split("|")[0];
      const amount = Math.round(value.amount * 10) / 10;
      const itemName = `${name} (${amount} ${value.unit})`;
      await ctx.runAction(api.groceries.categorizeItem, { itemName });
    }

    return null;
  },
});
