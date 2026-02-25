import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Mistral } from "@mistralai/mistralai";
import { Id } from "./_generated/dataModel";
import {
  ingredientMacroRegenerationPrompt,
  recipeGenerationPrompt,
  recipeRegenerationPromptForMissingItems,
} from "./recipePrompts";
import { normalizeAndScaleIngredientMacros } from "./lib/recipeMacroNormalization";
import {
  isGramOrMilliliterUnit,
  normalizeIngredientMacroShape,
  normalizeUnitShortName,
} from "./lib/ingredientNutrition";
import {
  detectStructuredRecipeInput,
  evaluateRecipeImportCompleteness,
} from "./lib/recipeImportValidation";
import { computeRecipePartMacros } from "./lib/recipePartNutrition";

const model = "mistral-small-latest";
const mealTagValues = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
type MealTag = (typeof mealTagValues)[number];
type OptionalSex = "male" | "female" | null;
type OptionalActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive"
  | null;
type OptionalGoalDirection = "lose" | "maintain" | "gain" | null;

type GoalsSettings = {
  profile: {
    age: number | null;
    sex: OptionalSex;
    heightCm: number | null;
    weightKg: number | null;
    bodyFatPct: number | null;
    activityLevel: OptionalActivityLevel;
    goalDirection: OptionalGoalDirection;
  };
  targets: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    macroTolerancePct: number;
  };
};

type MassVolumeIngredientDocument = {
  _id: Id<"recipeIngredients">;
  _creationTime: number;
  recipeId: Id<"recipes">;
  partId?: Id<"recipeParts">;
  sourcePartId?: Id<"recipeParts">;
  usedAmount?: number;
  usedUnit?: string;
  name: string;
  amount: number;
  unit: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
};

type PerUnitIngredientDocument = {
  _id: Id<"recipeIngredients">;
  _creationTime: number;
  recipeId: Id<"recipes">;
  partId?: Id<"recipeParts">;
  sourcePartId?: Id<"recipeParts">;
  usedAmount?: number;
  usedUnit?: string;
  name: string;
  amount: number;
  unit: string;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
};

type IngredientDocument =
  | MassVolumeIngredientDocument
  | PerUnitIngredientDocument;

type IngredientInput = {
  name: string;
  amount: number;
  unit: string;
  sourcePartName?: string;
  usedAmount?: number;
  usedUnit?: string;
} & (
  | {
      kcalPer100: number;
      proteinPer100: number;
      carbsPer100: number;
      fatPer100: number;
    }
  | {
      kcalPerUnit: number;
      proteinPerUnit: number;
      carbsPerUnit: number;
      fatPerUnit: number;
    }
);

type IngredientMacroUpdate =
  | {
      kcalPer100: number;
      proteinPer100: number;
      carbsPer100: number;
      fatPer100: number;
    }
  | {
      kcalPerUnit: number;
      proteinPerUnit: number;
      carbsPerUnit: number;
      fatPerUnit: number;
    };

type RecipePartDocument = {
  _id: Id<"recipeParts">;
  _creationTime: number;
  recipeId: Id<"recipes">;
  name: string;
  position: number;
  scale: number;
  yieldAmount?: number;
  yieldUnit?: string;
  instructions: Array<string>;
};

type RecipePartInput = {
  name: string;
  position: number;
  scale?: number;
  yieldAmount?: number;
  yieldUnit?: string;
  instructions?: Array<string>;
  ingredients: IngredientInput[];
};

const mealTagValidator = v.union(
  v.literal("Breakfast"),
  v.literal("Lunch"),
  v.literal("Dinner"),
  v.literal("Snack"),
);

const ingredientMassMacroFields = {
  kcalPer100: v.number(),
  proteinPer100: v.number(),
  carbsPer100: v.number(),
  fatPer100: v.number(),
} as const;

const ingredientPerUnitMacroFields = {
  kcalPerUnit: v.number(),
  proteinPerUnit: v.number(),
  carbsPerUnit: v.number(),
  fatPerUnit: v.number(),
} as const;

const ingredientInputValidator = v.union(
  v.object({
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    sourcePartName: v.optional(v.string()),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
    ...ingredientMassMacroFields,
  }),
  v.object({
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    sourcePartName: v.optional(v.string()),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
    ...ingredientPerUnitMacroFields,
  }),
);

const recipePartValidator = v.object({
  _id: v.id("recipeParts"),
  _creationTime: v.number(),
  recipeId: v.id("recipes"),
  name: v.string(),
  position: v.number(),
  scale: v.number(),
  yieldAmount: v.optional(v.number()),
  yieldUnit: v.optional(v.string()),
  instructions: v.array(v.string()),
});

const recipePartInputValidator = v.object({
  name: v.string(),
  position: v.number(),
  scale: v.optional(v.number()),
  yieldAmount: v.optional(v.number()),
  yieldUnit: v.optional(v.string()),
  instructions: v.optional(v.array(v.string())),
  ingredients: v.array(ingredientInputValidator),
});

const ingredientMacroUpdateValidator = v.union(
  v.object({
    ...ingredientMassMacroFields,
  }),
  v.object({
    ...ingredientPerUnitMacroFields,
  }),
);

const ingredientDocumentValidator = v.union(
  v.object({
    _id: v.id("recipeIngredients"),
    _creationTime: v.number(),
    recipeId: v.id("recipes"),
    partId: v.optional(v.id("recipeParts")),
    sourcePartId: v.optional(v.id("recipeParts")),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    ...ingredientMassMacroFields,
  }),
  v.object({
    _id: v.id("recipeIngredients"),
    _creationTime: v.number(),
    recipeId: v.id("recipes"),
    partId: v.optional(v.id("recipeParts")),
    sourcePartId: v.optional(v.id("recipeParts")),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    ...ingredientPerUnitMacroFields,
  }),
);

function toMacroUpdate(input: IngredientInput): IngredientMacroUpdate {
  if ("kcalPer100" in input) {
    return {
      kcalPer100: input.kcalPer100,
      proteinPer100: input.proteinPer100,
      carbsPer100: input.carbsPer100,
      fatPer100: input.fatPer100,
    };
  }
  return {
    kcalPerUnit: input.kcalPerUnit,
    proteinPerUnit: input.proteinPerUnit,
    carbsPerUnit: input.carbsPerUnit,
    fatPerUnit: input.fatPerUnit,
  };
}

function toMacroUpdateFromNormalized(
  normalized: ReturnType<typeof normalizeAndScaleIngredientMacros>,
): IngredientMacroUpdate {
  if ("kcalPer100" in normalized) {
    return {
      kcalPer100: normalized.kcalPer100,
      proteinPer100: normalized.proteinPer100,
      carbsPer100: normalized.carbsPer100,
      fatPer100: normalized.fatPer100,
    };
  }
  return {
    kcalPerUnit: normalized.kcalPerUnit,
    proteinPerUnit: normalized.proteinPerUnit,
    carbsPerUnit: normalized.carbsPerUnit,
    fatPerUnit: normalized.fatPerUnit,
  };
}

function normalizeIngredientInput(
  ingredient: IngredientInput,
): IngredientInput {
  const normalized = normalizeIngredientMacroShape(ingredient);
  if ("kcalPer100" in normalized) {
    return {
      name: ingredient.name,
      amount: ingredient.amount,
      unit: normalized.unit,
      sourcePartName: ingredient.sourcePartName,
      usedAmount: ingredient.usedAmount,
      usedUnit: ingredient.usedUnit
        ? normalizeUnitShortName(ingredient.usedUnit)
        : undefined,
      kcalPer100: normalized.kcalPer100,
      proteinPer100: normalized.proteinPer100,
      carbsPer100: normalized.carbsPer100,
      fatPer100: normalized.fatPer100,
    };
  }
  return {
    name: ingredient.name,
    amount: ingredient.amount,
    unit: normalized.unit,
    sourcePartName: ingredient.sourcePartName,
    usedAmount: ingredient.usedAmount,
    usedUnit: ingredient.usedUnit
      ? normalizeUnitShortName(ingredient.usedUnit)
      : undefined,
    kcalPerUnit: normalized.kcalPerUnit,
    proteinPerUnit: normalized.proteinPerUnit,
    carbsPerUnit: normalized.carbsPerUnit,
    fatPerUnit: normalized.fatPerUnit,
  };
}

type GeneratedIngredientRaw = {
  name: string;
  amount: number;
  unit: string;
  sourcePartName?: string;
  usedAmount?: number;
  usedUnit?: string;
  kcalPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  kcalPerUnit?: number;
  proteinPerUnit?: number;
  carbsPerUnit?: number;
  fatPerUnit?: number;
};

function hasPer100Macros(
  ingredient: GeneratedIngredientRaw,
): ingredient is GeneratedIngredientRaw & {
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
} {
  return (
    typeof ingredient.kcalPer100 === "number" &&
    typeof ingredient.proteinPer100 === "number" &&
    typeof ingredient.carbsPer100 === "number" &&
    typeof ingredient.fatPer100 === "number"
  );
}

function hasPerUnitMacros(
  ingredient: GeneratedIngredientRaw,
): ingredient is GeneratedIngredientRaw & {
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
} {
  return (
    typeof ingredient.kcalPerUnit === "number" &&
    typeof ingredient.proteinPerUnit === "number" &&
    typeof ingredient.carbsPerUnit === "number" &&
    typeof ingredient.fatPerUnit === "number"
  );
}

function toIngredientInputFromGenerated(
  ingredient: GeneratedIngredientRaw,
): IngredientInput {
  if (hasPer100Macros(ingredient)) {
    return {
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      sourcePartName: ingredient.sourcePartName,
      usedAmount: ingredient.usedAmount,
      usedUnit: ingredient.usedUnit,
      kcalPer100: ingredient.kcalPer100,
      proteinPer100: ingredient.proteinPer100,
      carbsPer100: ingredient.carbsPer100,
      fatPer100: ingredient.fatPer100,
    };
  }

  if (hasPerUnitMacros(ingredient)) {
    return {
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      sourcePartName: ingredient.sourcePartName,
      usedAmount: ingredient.usedAmount,
      usedUnit: ingredient.usedUnit,
      kcalPerUnit: ingredient.kcalPerUnit,
      proteinPerUnit: ingredient.proteinPerUnit,
      carbsPerUnit: ingredient.carbsPerUnit,
      fatPerUnit: ingredient.fatPerUnit,
    };
  }

  throw new Error(
    `Ingredient "${ingredient.name}" is missing a complete macro set in AI response`,
  );
}

function normalizeIngredientDocument(
  ingredient: IngredientDocument,
): IngredientDocument {
  const normalized = normalizeIngredientMacroShape(ingredient);
  if ("kcalPer100" in normalized) {
    return {
      _id: ingredient._id,
      _creationTime: ingredient._creationTime,
      recipeId: ingredient.recipeId,
      partId: ingredient.partId,
      sourcePartId: ingredient.sourcePartId,
      usedAmount: ingredient.usedAmount,
      usedUnit: ingredient.usedUnit
        ? normalizeUnitShortName(ingredient.usedUnit)
        : undefined,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: normalized.unit,
      kcalPer100: normalized.kcalPer100,
      proteinPer100: normalized.proteinPer100,
      carbsPer100: normalized.carbsPer100,
      fatPer100: normalized.fatPer100,
    };
  }
  return {
    _id: ingredient._id,
    _creationTime: ingredient._creationTime,
    recipeId: ingredient.recipeId,
    partId: ingredient.partId,
    sourcePartId: ingredient.sourcePartId,
    usedAmount: ingredient.usedAmount,
    usedUnit: ingredient.usedUnit
      ? normalizeUnitShortName(ingredient.usedUnit)
      : undefined,
    name: ingredient.name,
    amount: ingredient.amount,
    unit: normalized.unit,
    kcalPerUnit: normalized.kcalPerUnit,
    proteinPerUnit: normalized.proteinPerUnit,
    carbsPerUnit: normalized.carbsPerUnit,
    fatPerUnit: normalized.fatPerUnit,
  };
}

function createMistralClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY is not set");
  }
  return new Mistral({ apiKey });
}

function isDevEnvironment(): boolean {
  return process.env.CONVEX_ENV === "dev";
}

function extractTextFromMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(
      (chunk): chunk is { type: "text"; text: string } =>
        typeof chunk === "object" &&
        chunk !== null &&
        (chunk as { type?: unknown }).type === "text" &&
        typeof (chunk as { text?: unknown }).text === "string",
    )
    .map((chunk) => chunk.text)
    .join(" ")
    .trim();
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

async function getRecipeParts(
  ctx: any,
  recipeId: Id<"recipes">,
): Promise<Array<RecipePartDocument>> {
  const parts = (await ctx.db
    .query("recipeParts")
    .withIndex("by_recipeId_and_position", (q: any) => q.eq("recipeId", recipeId))
    .collect()) as Array<
    RecipePartDocument & {
      instructions?: Array<string>;
    }
  >;
  return parts.map((part) => ({
    ...part,
    instructions: part.instructions ?? [],
  }));
}

function normalizeIngredientForLegacyPart(
  ingredient: IngredientDocument,
): IngredientDocument {
  const normalized = normalizeIngredientDocument(ingredient);
  return normalized;
}

async function createRecipePart(
  ctx: any,
  recipeId: Id<"recipes">,
  part: Omit<RecipePartInput, "ingredients">,
): Promise<Id<"recipeParts">> {
  return await ctx.db.insert("recipeParts", {
    recipeId,
    name: part.name,
    position: part.position,
    scale: part.scale ?? 1,
    yieldAmount: part.yieldAmount,
    yieldUnit: part.yieldUnit ? normalizeUnitShortName(part.yieldUnit) : undefined,
    instructions: part.instructions ?? [],
  });
}

function computeTotalRecipeKcal(
  parts: Array<RecipePartDocument>,
  ingredients: Array<IngredientDocument>,
): number {
  const effectiveParts: Array<{
    _id: string;
    scale: number;
    yieldAmount?: number;
    yieldUnit?: string;
  }> =
    parts.length > 0
      ? parts.map((part) => ({
          _id: part._id,
          scale: part.scale,
          yieldAmount: part.yieldAmount,
          yieldUnit: part.yieldUnit,
        }))
      : [{ _id: "legacy-main", scale: 1 }];
  const effectiveIngredients = ingredients.map((ingredient) => ({
    ...ingredient,
    partId: ingredient.partId ?? ("legacy-main" as Id<"recipeParts">),
  }));
  return computeRecipePartMacros(
    effectiveParts,
    effectiveIngredients as Array<any>,
  ).total.kcal;
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
      mealTags: v.array(mealTagValidator),
      totalKcal: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").order("desc").collect();
    const result = [];
    for (const recipe of recipes) {
      const persistedMealTags = (recipe as { mealTags?: Array<string> })
        .mealTags;
      const normalizedMealTags = sanitizeMealTags(persistedMealTags);
      const mealTags =
        normalizedMealTags.length > 0
          ? normalizedMealTags
          : inferMealTagsFromText(`${recipe.name} ${recipe.description}`);
      const ingredients = await ctx.db
        .query("recipeIngredients")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();
      const parts = await getRecipeParts(ctx, recipe._id);
      const normalizedIngredients = ingredients.map((ingredient) =>
        normalizeIngredientForLegacyPart(ingredient as IngredientDocument),
      );
      const totalKcal = computeTotalRecipeKcal(parts, normalizedIngredients);
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
      mealTags: v.array(mealTagValidator),
    }),
    v.null(),
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
  returns: v.array(ingredientDocumentValidator),
  handler: async (ctx, args) => {
    const ingredients = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    return ingredients.map((ingredient) =>
      normalizeIngredientForLegacyPart(ingredient as IngredientDocument),
    );
  },
});

export const getParts = query({
  args: { recipeId: v.id("recipes") },
  returns: v.array(recipePartValidator),
  handler: async (ctx, args) => {
    return await getRecipeParts(ctx, args.recipeId);
  },
});

export const getIngredient = query({
  args: { ingredientId: v.id("recipeIngredients") },
  returns: v.union(ingredientDocumentValidator, v.null()),
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient) {
      return null;
    }
    return normalizeIngredientDocument(ingredient as IngredientDocument);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    servings: v.number(),
    instructions: v.array(v.string()),
    mealTags: v.optional(v.array(mealTagValidator)),
    ingredients: v.optional(v.array(ingredientInputValidator)),
    parts: v.optional(v.array(recipePartInputValidator)),
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
    const partIdByName = new Map<string, Id<"recipeParts">>();
    if (args.parts && args.parts.length > 0) {
      const ordered = [...args.parts].sort((a, b) => a.position - b.position);
      for (const part of ordered) {
        const partId = await createRecipePart(ctx, recipeId, part);
        partIdByName.set(part.name.toLowerCase(), partId);
      }
      for (const part of ordered) {
        const partId = partIdByName.get(part.name.toLowerCase());
        if (!partId) continue;
        for (const ing of part.ingredients) {
          const normalized = normalizeIngredientInput(ing);
          await ctx.db.insert("recipeIngredients", {
            recipeId,
            partId,
            sourcePartId: normalized.sourcePartName
              ? partIdByName.get(normalized.sourcePartName.toLowerCase())
              : undefined,
            usedAmount: normalized.usedAmount,
            usedUnit: normalized.usedUnit,
            name: normalized.name,
            amount: normalized.amount,
            unit: normalizeUnitShortName(normalized.unit),
            ...toMacroUpdate(normalized),
          });
        }
      }
    } else {
      const mainPartId = await createRecipePart(ctx, recipeId, {
        name: "Main",
        position: 0,
        scale: 1,
      });
      const ingredients = args.ingredients ?? [];
      for (const ing of ingredients) {
        const normalized = normalizeIngredientInput(ing);
        await ctx.db.insert("recipeIngredients", {
          recipeId,
          partId: mainPartId,
          name: normalized.name,
          amount: normalized.amount,
          unit: normalizeUnitShortName(normalized.unit),
          ...toMacroUpdate(normalized),
        });
      }
    }
    return recipeId;
  },
});

export const updateMealTags = mutation({
  args: {
    recipeId: v.id("recipes"),
    mealTags: v.array(mealTagValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recipeId, {
      mealTags: sanitizeMealTags(args.mealTags),
    });
    return null;
  },
});

export const updateIngredientMacros = mutation({
  args: {
    ingredientId: v.id("recipeIngredients"),
    macros: ingredientMacroUpdateValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.ingredientId);
    if (!existing) {
      throw new Error("Ingredient not found");
    }
    const normalizedExisting = normalizeIngredientDocument(
      existing as IngredientDocument,
    );
    const unit = normalizeUnitShortName(normalizedExisting.unit);
    const isMassVolume = isGramOrMilliliterUnit(unit);
    const providedMassMacros = "kcalPer100" in args.macros;

    if (isMassVolume !== providedMassMacros) {
      throw new Error(
        isMassVolume
          ? `Unit "${unit}" requires per-100 macros only`
          : `Unit "${unit}" requires per-unit macros only`,
      );
    }

    await ctx.db.replace(args.ingredientId, {
      recipeId: normalizedExisting.recipeId,
      partId: normalizedExisting.partId,
      sourcePartId: normalizedExisting.sourcePartId,
      usedAmount: normalizedExisting.usedAmount,
      usedUnit: normalizedExisting.usedUnit,
      name: normalizedExisting.name,
      amount: normalizedExisting.amount,
      unit,
      ...args.macros,
    });
    return null;
  },
});

export const updateIngredientAmount = mutation({
  args: {
    ingredientId: v.id("recipeIngredients"),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
    await ctx.db.patch(args.ingredientId, {
      amount: args.amount,
    });
    return null;
  },
});

export const createPart = mutation({
  args: {
    recipeId: v.id("recipes"),
    name: v.string(),
    position: v.number(),
    scale: v.optional(v.number()),
    yieldAmount: v.optional(v.number()),
    yieldUnit: v.optional(v.string()),
    instructions: v.optional(v.array(v.string())),
  },
  returns: v.id("recipeParts"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("recipeParts", {
      recipeId: args.recipeId,
      name: args.name,
      position: args.position,
      scale: args.scale ?? 1,
      yieldAmount: args.yieldAmount,
      yieldUnit: args.yieldUnit ? normalizeUnitShortName(args.yieldUnit) : undefined,
      instructions: args.instructions ?? [],
    });
  },
});

export const updatePart = mutation({
  args: {
    partId: v.id("recipeParts"),
    name: v.optional(v.string()),
    position: v.optional(v.number()),
    scale: v.optional(v.number()),
    yieldAmount: v.optional(v.number()),
    yieldUnit: v.optional(v.string()),
    instructions: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.partId);
    if (!existing) {
      throw new Error("Part not found");
    }
    await ctx.db.patch(args.partId, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.position !== undefined ? { position: args.position } : {}),
      ...(args.scale !== undefined ? { scale: args.scale } : {}),
      ...(args.yieldAmount !== undefined ? { yieldAmount: args.yieldAmount } : {}),
      ...(args.yieldUnit !== undefined
        ? { yieldUnit: normalizeUnitShortName(args.yieldUnit) }
        : {}),
      ...(args.instructions !== undefined ? { instructions: args.instructions } : {}),
    });
    return null;
  },
});

export const deletePart = mutation({
  args: { partId: v.id("recipeParts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const part = await ctx.db.get(args.partId);
    if (!part) {
      throw new Error("Part not found");
    }
    const ingredientsInPart = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId_and_partId", (q) =>
        q.eq("recipeId", part.recipeId).eq("partId", part._id),
      )
      .collect();
    if (ingredientsInPart.length > 0) {
      throw new Error("Cannot delete a part that still has ingredients");
    }
    const linkedUsage = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_sourcePartId", (q) => q.eq("sourcePartId", part._id))
      .collect();
    for (const ingredient of linkedUsage) {
      await ctx.db.patch(ingredient._id, {
        sourcePartId: undefined,
        usedAmount: undefined,
        usedUnit: undefined,
      });
    }
    await ctx.db.delete(part._id);
    return null;
  },
});

export const updateIngredientPartUsage = mutation({
  args: {
    ingredientId: v.id("recipeIngredients"),
    partId: v.optional(v.id("recipeParts")),
    sourcePartId: v.optional(v.id("recipeParts")),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }
    const recipeId = ingredient.recipeId as Id<"recipes">;
    const partId = args.partId ?? (ingredient.partId as Id<"recipeParts"> | undefined);
    if (!partId) {
      throw new Error("Ingredient must belong to a part");
    }
    const part = await ctx.db.get(partId);
    if (!part || part.recipeId !== recipeId) {
      throw new Error("Part does not belong to ingredient recipe");
    }

    if (args.sourcePartId) {
      const sourcePart = await ctx.db.get(args.sourcePartId);
      if (!sourcePart || sourcePart.recipeId !== recipeId) {
        throw new Error("Source part must belong to same recipe");
      }
      if (sourcePart._id === partId) {
        throw new Error("Part cannot consume itself");
      }
      const sourceLinks = await ctx.db
        .query("recipeIngredients")
        .withIndex("by_sourcePartId", (q) => q.eq("sourcePartId", partId))
        .collect();
      if (sourceLinks.some((item) => item.partId === args.sourcePartId)) {
        throw new Error("Cyclic part usage is not allowed");
      }
    }

    await ctx.db.patch(args.ingredientId, {
      partId,
      sourcePartId: args.sourcePartId,
      usedAmount: args.sourcePartId ? args.usedAmount : undefined,
      usedUnit:
        args.sourcePartId && args.usedUnit
          ? normalizeUnitShortName(args.usedUnit)
          : undefined,
    });
    return null;
  },
});

export const migrateLegacyRecipeParts = mutation({
  args: {},
  returns: v.object({
    createdParts: v.number(),
    patchedIngredients: v.number(),
  }),
  handler: async (ctx) => {
    const recipes = await ctx.db.query("recipes").collect();
    let createdParts = 0;
    let patchedIngredients = 0;
    for (const recipe of recipes) {
      const parts = await ctx.db
        .query("recipeParts")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();
      let mainPartId: Id<"recipeParts">;
      if (parts.length === 0) {
        mainPartId = await ctx.db.insert("recipeParts", {
          recipeId: recipe._id,
          name: "Main",
          position: 0,
          scale: 1,
          instructions: recipe.instructions ?? [],
        });
        createdParts += 1;
      } else {
        mainPartId = parts[0]._id;
        for (const part of parts) {
          if (!Array.isArray((part as { instructions?: Array<string> }).instructions)) {
            await ctx.db.patch(part._id, { instructions: [] });
          }
        }
      }

      const ingredients = await ctx.db
        .query("recipeIngredients")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();
      for (const ingredient of ingredients) {
        if (!ingredient.partId) {
          await ctx.db.patch(ingredient._id, { partId: mainPartId });
          patchedIngredients += 1;
        }
      }
    }
    return { createdParts, patchedIngredients };
  },
});

export const migrateIngredientMacrosToPer100 = action({
  args: {},
  returns: v.object({
    updatedIngredients: v.number(),
  }),
  handler: async (ctx) => {
    const recipes = await ctx.runQuery(api.recipes.list, {});
    let updatedIngredients = 0;

    for (const recipe of recipes) {
      const ingredients = await ctx.runQuery(api.recipes.getIngredients, {
        recipeId: recipe._id,
      });
      for (const ingredient of ingredients) {
        await ctx.runMutation(api.recipes.updateIngredientMacros, {
          ingredientId: ingredient._id,
          macros: toMacroUpdate(ingredient),
        });
        updatedIngredients += 1;
      }
    }

    return { updatedIngredients };
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
    const parts = await ctx.db
      .query("recipeParts")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    for (const ing of ingredients) {
      await ctx.db.delete(ing._id);
    }
    for (const part of parts) {
      await ctx.db.delete(part._id);
    }
    await ctx.db.delete(args.recipeId);
    return null;
  },
});

function buildGoalsContext(settings: GoalsSettings): string {
  const lines: Array<string> = [];
  const { profile, targets } = settings;

  if (profile.age !== null) lines.push(`- Age: ${profile.age}`);
  if (profile.sex !== null) lines.push(`- Sex: ${profile.sex}`);
  if (profile.heightCm !== null) lines.push(`- Height: ${profile.heightCm} cm`);
  if (profile.weightKg !== null) lines.push(`- Weight: ${profile.weightKg} kg`);
  if (profile.bodyFatPct !== null)
    lines.push(`- Body fat: ${profile.bodyFatPct}%`);
  if (profile.activityLevel !== null)
    lines.push(`- Activity level: ${profile.activityLevel}`);
  if (profile.goalDirection !== null)
    lines.push(`- Goal direction: ${profile.goalDirection}`);

  if (targets.kcal !== null) lines.push(`- Daily target kcal: ${targets.kcal}`);
  if (targets.protein !== null)
    lines.push(`- Daily target protein: ${targets.protein} g`);
  if (targets.carbs !== null)
    lines.push(`- Daily target carbs: ${targets.carbs} g`);
  if (targets.fat !== null) lines.push(`- Daily target fat: ${targets.fat} g`);
  lines.push(`- Macro tolerance: ${targets.macroTolerancePct}%`);

  if (lines.length === 1) {
    return `
User nutrition goals context:
- No nutrition goals are configured yet.`;
  }

  return `
User nutrition goals context:
${lines.join("\n")}`;
}

type GeneratedIngredient = GeneratedIngredientRaw;

interface GeneratedRecipePart {
  name: string;
  position: number;
  scale?: number;
  yieldAmount?: number;
  yieldUnit?: string;
  instructions?: Array<string>;
  ingredients: GeneratedIngredient[];
}

interface GeneratedRecipe {
  name: string;
  description: string;
  servings: number;
  mealTags?: Array<string>;
  instructions: string[];
  ingredients?: GeneratedIngredient[];
  parts?: GeneratedRecipePart[];
}

async function requestRecipeJsonFromModel(
  client: Mistral,
  prompt: string,
): Promise<{ text: string; parsed: GeneratedRecipe }> {
  const response = await client.chat.complete({
    model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    responseFormat: { type: "json_object" },
  });

  const text = extractTextFromMessageContent(response.choices?.[0]?.message?.content);
  const parsed = JSON.parse(text.trim()) as GeneratedRecipe;
  return { text, parsed };
}

export const generate = action({
  args: {
    description: v.string(),
    servings: v.number(),
    includeGoalsContext: v.optional(v.boolean()),
    debug: v.optional(v.boolean()),
  },
  returns: v.union(
    v.id("recipes"),
    v.object({
      recipeId: v.id("recipes"),
      prompt: v.string(),
      responseText: v.string(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<
    | Id<"recipes">
    | { recipeId: Id<"recipes">; prompt: string; responseText: string }
  > => {
    const selectedServings = Math.max(1, Math.round(args.servings));
    const client = createMistralClient();

    const goalsContext =
      args.includeGoalsContext === true
        ? buildGoalsContext(
            await ctx.runQuery(api.nutritionGoals.getSettings, {}),
          )
        : "";
    const strictPreserveMode = detectStructuredRecipeInput(args.description);
    const prompt = recipeGenerationPrompt(
      args.description,
      goalsContext,
      selectedServings,
      { strictPreserve: strictPreserveMode },
    );
    const firstAttempt = await requestRecipeJsonFromModel(client, prompt);
    let text = firstAttempt.text;
    let parsed = firstAttempt.parsed;
    if (strictPreserveMode) {
      const toValidationRecipe = (recipe: GeneratedRecipe) => ({
        instructions:
          recipe.parts && recipe.parts.length > 0
            ? [
                ...recipe.instructions,
                ...recipe.parts.flatMap((part) => part.instructions ?? []),
              ]
            : recipe.instructions,
        ingredients:
          recipe.parts && recipe.parts.length > 0
            ? recipe.parts.flatMap((part) =>
                part.ingredients.map((ingredient) => ({ name: ingredient.name })),
              )
            : (recipe.ingredients ?? []).map((ingredient) => ({
                name: ingredient.name,
              })),
      });
      const completeness = evaluateRecipeImportCompleteness(
        args.description,
        toValidationRecipe(parsed),
      );
      if (
        completeness.missingIngredients.length > 0 ||
        completeness.missingStepTokens.length > 0 ||
        completeness.missingSectionTokens.length > 0
      ) {
        if (!isDevEnvironment()) {
          throw new Error(
            `Recipe import is incomplete. Missing ingredients: ${completeness.missingIngredients.join(", ") || "none"}. Missing steps/phases: ${completeness.missingStepTokens.join(", ") || "none"}. Missing sections: ${completeness.missingSectionTokens.join(", ") || "none"}.`,
          );
        }
        const repairPrompt = recipeRegenerationPromptForMissingItems(
          args.description,
          text,
          completeness.missingIngredients,
          completeness.missingStepTokens,
          completeness.missingSectionTokens,
        );
        const secondAttempt = await requestRecipeJsonFromModel(client, repairPrompt);
        const retryCompleteness = evaluateRecipeImportCompleteness(
          args.description,
          toValidationRecipe(secondAttempt.parsed),
        );
        if (
          retryCompleteness.missingIngredients.length > 0 ||
          retryCompleteness.missingStepTokens.length > 0 ||
          retryCompleteness.missingSectionTokens.length > 0
        ) {
          throw new Error(
            `Recipe import is incomplete after retry. Missing ingredients: ${retryCompleteness.missingIngredients.join(", ") || "none"}. Missing steps/phases: ${retryCompleteness.missingStepTokens.join(", ") || "none"}. Missing sections: ${retryCompleteness.missingSectionTokens.join(", ") || "none"}.`,
          );
        }
        text = secondAttempt.text;
        parsed = secondAttempt.parsed;
      }
    }
    const generatedParts: Array<GeneratedRecipePart> =
      parsed.parts && parsed.parts.length > 0
        ? parsed.parts
        : [
            {
              name: "Main",
              position: 0,
              scale: 1,
              instructions: parsed.instructions,
              ingredients: parsed.ingredients ?? [],
            },
          ];

    const normalizedParts = generatedParts.map((part) => {
      const normalizedIngredients = part.ingredients.map((ingredient) =>
        normalizeAndScaleIngredientMacros(toIngredientInputFromGenerated(ingredient)),
      );
      part.ingredients.forEach((ingredient, index) => {
        const normalized = normalizedIngredients[index];
        if (normalized.correctionFactor > 1) {
          console.log(
            `[recipes.generate] Auto-scaled macros by x${normalized.correctionFactor} for ingredient "${ingredient.name}" (${ingredient.unit}).`,
          );
        }
        if (normalized.kcalWasRepaired) {
          console.log(
            `[recipes.generate] Repaired kcal from macros for ingredient "${ingredient.name}" (${ingredient.unit}).`,
          );
        }
      });
      return {
        ...part,
        ingredients: part.ingredients.map((ingredient, index) => {
          const normalized = normalizedIngredients[index];
          if ("kcalPer100" in normalized) {
            return {
              name: ingredient.name,
              amount: ingredient.amount,
              unit: normalizeUnitShortName(ingredient.unit),
              sourcePartName: ingredient.sourcePartName,
              usedAmount: ingredient.usedAmount,
              usedUnit: ingredient.usedUnit,
              kcalPer100: normalized.kcalPer100,
              proteinPer100: normalized.proteinPer100,
              carbsPer100: normalized.carbsPer100,
              fatPer100: normalized.fatPer100,
            };
          }
          return {
            name: ingredient.name,
            amount: ingredient.amount,
            unit: normalizeUnitShortName(ingredient.unit),
            sourcePartName: ingredient.sourcePartName,
            usedAmount: ingredient.usedAmount,
            usedUnit: ingredient.usedUnit,
            kcalPerUnit: normalized.kcalPerUnit,
            proteinPerUnit: normalized.proteinPerUnit,
            carbsPerUnit: normalized.carbsPerUnit,
            fatPerUnit: normalized.fatPerUnit,
          };
        }),
      };
    });

    const recipeId: Id<"recipes"> = await ctx.runMutation(api.recipes.create, {
      name: parsed.name,
      description: parsed.description,
      servings: selectedServings,
      mealTags: (() => {
        const aiMealTags = sanitizeMealTags(parsed.mealTags);
        return aiMealTags.length > 0
          ? aiMealTags
          : inferMealTagsFromText(`${parsed.name} ${parsed.description}`);
      })(),
      instructions: parsed.instructions,
      parts: normalizedParts,
    });

    if (args.debug === true) {
      return {
        recipeId,
        prompt,
        responseText: text,
      };
    }
    return recipeId;
  },
});

export const regenerateIngredientMacros = action({
  args: {
    ingredientId: v.id("recipeIngredients"),
    debug: v.optional(v.boolean()),
  },
  returns: v.union(
    v.null(),
    v.object({
      ingredientId: v.id("recipeIngredients"),
      prompt: v.string(),
      responseText: v.string(),
      updatedMacros: ingredientMacroUpdateValidator,
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<null | {
    ingredientId: Id<"recipeIngredients">;
    prompt: string;
    responseText: string;
    updatedMacros: IngredientMacroUpdate;
  }> => {
    const ingredient: IngredientDocument | null = await ctx.runQuery(
      api.recipes.getIngredient,
      {
        ingredientId: args.ingredientId,
      },
    );
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    const client = createMistralClient();
    const prompt = ingredientMacroRegenerationPrompt(ingredient);
    const response = await client.chat.complete({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      responseFormat: { type: "json_object" },
    });

    const text = extractTextFromMessageContent(
      response.choices?.[0]?.message?.content,
    );
    const parsed = JSON.parse(text.trim()) as GeneratedIngredient;
    const normalized = normalizeAndScaleIngredientMacros({
      ...toIngredientInputFromGenerated(parsed),
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
    });
    if (normalized.correctionFactor > 1) {
      console.log(
        `[recipes.regenerateIngredientMacros] Auto-scaled macros by x${normalized.correctionFactor} for ingredient "${ingredient.name}" (${ingredient.unit}).`,
      );
    }
    if (normalized.kcalWasRepaired) {
      console.log(
        `[recipes.regenerateIngredientMacros] Repaired kcal from macros for ingredient "${ingredient.name}" (${ingredient.unit}).`,
      );
    }

    await ctx.runMutation(api.recipes.updateIngredientMacros, {
      ingredientId: ingredient._id,
      macros: toMacroUpdateFromNormalized(normalized),
    });

    if (args.debug === true) {
      return {
        ingredientId: ingredient._id,
        prompt,
        responseText: text,
        updatedMacros: toMacroUpdateFromNormalized(normalized),
      };
    }

    return null;
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
    const parts = await ctx.runQuery(api.recipes.getParts, {
      recipeId: args.recipeId,
    });
    const partScaleById = new Map(parts.map((part) => [part._id, part.scale]));

    const scale = args.servings / recipe.servings;

    for (const ing of ingredients) {
      if (ing.sourcePartId) continue;
      const partScale = ing.partId ? (partScaleById.get(ing.partId) ?? 1) : 1;
      const amount = Math.round(ing.amount * scale * partScale * 10) / 10;
      const itemName = `${ing.name} (${amount} ${ing.unit})`;
      await ctx.runAction(api.groceries.categorizeItem, { itemName });
    }

    return null;
  },
});
