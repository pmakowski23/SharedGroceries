import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Mistral } from "@mistralai/mistralai";
import { Id } from "./_generated/dataModel";

const model = "mistral-small-latest";
const mealTagValues = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
type MealTag = (typeof mealTagValues)[number];

function createMistralClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY is not set");
  }
  return new Mistral({ apiKey });
}

function isMealTag(value: string): value is MealTag {
  return (mealTagValues as readonly string[]).includes(value);
}

function sanitizeMealTags(tags: Array<string> | undefined): Array<MealTag> {
  if (!tags) return [];
  const unique = new Set<MealTag>();
  for (const tag of tags) {
    if (isMealTag(tag)) unique.add(tag);
  }
  return Array.from(unique);
}

function inferMealTagsFromText(text: string): Array<MealTag> {
  const source = text.toLowerCase();
  const tags = new Set<MealTag>();
  if (
    source.includes("breakfast") ||
    source.includes("morning") ||
    source.includes("oat") ||
    source.includes("pancake") ||
    source.includes("omelet") ||
    source.includes("eggs")
  ) {
    tags.add("Breakfast");
  }
  if (
    source.includes("lunch") ||
    source.includes("sandwich") ||
    source.includes("salad") ||
    source.includes("wrap") ||
    source.includes("bowl")
  ) {
    tags.add("Lunch");
  }
  if (
    source.includes("dinner") ||
    source.includes("evening") ||
    source.includes("roast") ||
    source.includes("stew") ||
    source.includes("curry") ||
    source.includes("pasta")
  ) {
    tags.add("Dinner");
  }
  if (
    source.includes("snack") ||
    source.includes("dessert") ||
    source.includes("smoothie") ||
    source.includes("bar")
  ) {
    tags.add("Snack");
  }

  // Keep broad recipe availability if no strong signal is found.
  if (tags.size === 0) {
    return [...mealTagValues];
  }
  return Array.from(tags);
}

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("recipes"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      servings: v.number(),
      instructions: v.array(v.string()),
      mealTags: v.array(
        v.union(
          v.literal("Breakfast"),
          v.literal("Lunch"),
          v.literal("Dinner"),
          v.literal("Snack")
        )
      ),
      totalKcal: v.number(),
    })
  ),
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").order("desc").collect();
    const result = [];
    for (const recipe of recipes) {
      const persistedMealTags = (recipe as { mealTags?: Array<string> }).mealTags;
      const normalizedMealTags = sanitizeMealTags(persistedMealTags);
      const mealTags =
        normalizedMealTags.length > 0
          ? normalizedMealTags
          : inferMealTagsFromText(`${recipe.name} ${recipe.description}`);
      const ingredients = await ctx.db
        .query("recipeIngredients")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();
      const totalKcal = ingredients.reduce(
        (sum, ing) => sum + ing.kcalPerUnit * ing.amount,
        0
      );
      result.push({ ...recipe, mealTags, totalKcal: Math.round(totalKcal) });
    }
    return result;
  },
});

export const get = query({
  args: { recipeId: v.id("recipes") },
  returns: v.union(
    v.object({
      _id: v.id("recipes"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      servings: v.number(),
      instructions: v.array(v.string()),
      mealTags: v.array(
        v.union(
          v.literal("Breakfast"),
          v.literal("Lunch"),
          v.literal("Dinner"),
          v.literal("Snack")
        )
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe) {
      return null;
    }
    const persistedMealTags = (recipe as { mealTags?: Array<string> }).mealTags;
    const normalizedMealTags = sanitizeMealTags(persistedMealTags);
    const mealTags =
      normalizedMealTags.length > 0
        ? normalizedMealTags
        : inferMealTagsFromText(`${recipe.name} ${recipe.description}`);
    return { ...recipe, mealTags };
  },
});

export const getIngredients = query({
  args: { recipeId: v.id("recipes") },
  returns: v.array(
    v.object({
      _id: v.id("recipeIngredients"),
      _creationTime: v.number(),
      recipeId: v.id("recipes"),
      name: v.string(),
      amount: v.number(),
      unit: v.string(),
      kcalPerUnit: v.number(),
      proteinPerUnit: v.number(),
      carbsPerUnit: v.number(),
      fatPerUnit: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    servings: v.number(),
    instructions: v.array(v.string()),
    mealTags: v.optional(
      v.array(
        v.union(
          v.literal("Breakfast"),
          v.literal("Lunch"),
          v.literal("Dinner"),
          v.literal("Snack")
        )
      )
    ),
    ingredients: v.array(
      v.object({
        name: v.string(),
        amount: v.number(),
        unit: v.string(),
        kcalPerUnit: v.number(),
        proteinPerUnit: v.number(),
        carbsPerUnit: v.number(),
        fatPerUnit: v.number(),
      })
    ),
  },
  returns: v.id("recipes"),
  handler: async (ctx, args) => {
    const mealTags =
      args.mealTags && args.mealTags.length > 0
        ? sanitizeMealTags(args.mealTags)
        : inferMealTagsFromText(`${args.name} ${args.description}`);
    const recipeId = await ctx.db.insert("recipes", {
      name: args.name,
      description: args.description,
      servings: args.servings,
      instructions: args.instructions,
      mealTags,
    });
    for (const ing of args.ingredients) {
      await ctx.db.insert("recipeIngredients", {
        recipeId,
        ...ing,
      });
    }
    return recipeId;
  },
});

export const updateMealTags = mutation({
  args: {
    recipeId: v.id("recipes"),
    mealTags: v.array(
      v.union(
        v.literal("Breakfast"),
        v.literal("Lunch"),
        v.literal("Dinner"),
        v.literal("Snack")
      )
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recipeId, { mealTags: sanitizeMealTags(args.mealTags) });
    return null;
  },
});

export const remove = mutation({
  args: { recipeId: v.id("recipes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ingredients = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    for (const ing of ingredients) {
      await ctx.db.delete(ing._id);
    }
    await ctx.db.delete(args.recipeId);
    return null;
  },
});

const recipeGenerationPrompt = (description: string) => `
Generate a recipe based on this description: "${description}"

Return valid JSON with exactly this shape:
{
  "name": "Recipe name",
  "description": "Short description",
  "servings": 2,
  "mealTags": ["Dinner"],
  "instructions": ["Step 1", "Step 2"],
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": 200,
      "unit": "g",
      "kcalPerUnit": 1.65,
      "proteinPerUnit": 0.31,
      "carbsPerUnit": 0.0,
      "fatPerUnit": 0.036
    }
  ]
}

Rules:
- All macro values (kcalPerUnit, proteinPerUnit, carbsPerUnit, fatPerUnit) are per 1 unit of the given unit (e.g. per 1g, per 1ml, per 1 piece).
- Use sensible, real-world nutritional data.
- Set mealTags using one or more from: Breakfast, Lunch, Dinner, Snack.
- Include at least 3 ingredients and 3 steps.
- Return ONLY valid JSON, no markdown fences.
`;

interface GeneratedIngredient {
  name: string;
  amount: number;
  unit: string;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
}

interface GeneratedRecipe {
  name: string;
  description: string;
  servings: number;
  mealTags?: Array<string>;
  instructions: string[];
  ingredients: GeneratedIngredient[];
}

export const generate = action({
  args: { description: v.string() },
  returns: v.id("recipes"),
  handler: async (ctx, args): Promise<Id<"recipes">> => {
    const client = createMistralClient();

    const response = await client.chat.complete({
      model,
      messages: [{ role: "user", content: recipeGenerationPrompt(args.description) }],
      temperature: 0.7,
      responseFormat: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content
              .filter(
                (c): c is { type: "text"; text: string } =>
                  typeof c === "object" &&
                  c !== null &&
                  (c as { type?: string }).type === "text"
              )
              .map((c) => c.text)
              .join("")
          : "";

    const parsed: GeneratedRecipe = JSON.parse(text.trim());

    const recipeId: Id<"recipes"> = await ctx.runMutation(api.recipes.create, {
      name: parsed.name,
      description: parsed.description,
      servings: parsed.servings,
      mealTags: (() => {
        const aiMealTags = sanitizeMealTags(parsed.mealTags);
        return aiMealTags.length > 0
          ? aiMealTags
          : inferMealTagsFromText(`${parsed.name} ${parsed.description}`);
      })(),
      instructions: parsed.instructions,
      ingredients: parsed.ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        kcalPerUnit: ing.kcalPerUnit,
        proteinPerUnit: ing.proteinPerUnit,
        carbsPerUnit: ing.carbsPerUnit,
        fatPerUnit: ing.fatPerUnit,
      })),
    });

    return recipeId;
  },
});

export const addIngredientsToGroceryList = action({
  args: {
    recipeId: v.id("recipes"),
    servings: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recipe = await ctx.runQuery(api.recipes.get, {
      recipeId: args.recipeId,
    });
    if (!recipe) throw new Error("Recipe not found");

    const ingredients = await ctx.runQuery(api.recipes.getIngredients, {
      recipeId: args.recipeId,
    });

    const scale = args.servings / recipe.servings;

    for (const ing of ingredients) {
      const amount = Math.round(ing.amount * scale * 10) / 10;
      const itemName = `${ing.name} (${amount} ${ing.unit})`;
      await ctx.runAction(api.groceries.categorizeItem, { itemName });
    }

    return null;
  },
});
