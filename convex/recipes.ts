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
  ingredientMacrosForAmount,
  normalizeIngredientMacroShape,
  normalizeUnitShortName,
} from "./lib/ingredientNutrition";
import {
  detectStructuredRecipeInput,
  evaluateRecipeImportCompleteness,
} from "./lib/recipeImportValidation";

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
    ...ingredientMassMacroFields,
  }),
  v.object({
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    ...ingredientPerUnitMacroFields,
  }),
);

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
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    ...ingredientMassMacroFields,
  }),
  v.object({
    _id: v.id("recipeIngredients"),
    _creationTime: v.number(),
    recipeId: v.id("recipes"),
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
      const totalKcal = ingredients.reduce(
        (sum, ing) =>
          sum +
          ingredientMacrosForAmount(normalizeIngredientDocument(ing)).kcal,
        0,
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
      normalizeIngredientDocument(ingredient as IngredientDocument),
    );
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
    ingredients: v.array(ingredientInputValidator),
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
      const normalized = normalizeIngredientInput(ing);
      await ctx.db.insert("recipeIngredients", {
        recipeId,
        name: normalized.name,
        amount: normalized.amount,
        unit: normalizeUnitShortName(normalized.unit),
        ...toMacroUpdate(normalized),
      });
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
    for (const ing of ingredients) {
      await ctx.db.delete(ing._id);
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

interface GeneratedRecipe {
  name: string;
  description: string;
  servings: number;
  mealTags?: Array<string>;
  instructions: string[];
  ingredients: GeneratedIngredient[];
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
      const completeness = evaluateRecipeImportCompleteness(args.description, parsed);
      if (
        completeness.missingIngredients.length > 0 ||
        completeness.missingStepTokens.length > 0
      ) {
        const repairPrompt = recipeRegenerationPromptForMissingItems(
          args.description,
          text,
          completeness.missingIngredients,
          completeness.missingStepTokens,
        );
        const secondAttempt = await requestRecipeJsonFromModel(client, repairPrompt);
        const retryCompleteness = evaluateRecipeImportCompleteness(
          args.description,
          secondAttempt.parsed,
        );
        if (
          retryCompleteness.missingIngredients.length > 0 ||
          retryCompleteness.missingStepTokens.length > 0
        ) {
          throw new Error(
            `Recipe import is incomplete after retry. Missing ingredients: ${retryCompleteness.missingIngredients.join(", ") || "none"}. Missing steps/phases: ${retryCompleteness.missingStepTokens.join(", ") || "none"}.`,
          );
        }
        text = secondAttempt.text;
        parsed = secondAttempt.parsed;
      }
    }
    const normalizedIngredients = parsed.ingredients.map((ing) =>
      normalizeAndScaleIngredientMacros(toIngredientInputFromGenerated(ing)),
    );
    parsed.ingredients.forEach((ing, index) => {
      const normalized = normalizedIngredients[index];
      if (normalized.correctionFactor > 1) {
        console.log(
          `[recipes.generate] Auto-scaled macros by x${normalized.correctionFactor} for ingredient "${ing.name}" (${ing.unit}).`,
        );
      }
      if (normalized.kcalWasRepaired) {
        console.log(
          `[recipes.generate] Repaired kcal from macros for ingredient "${ing.name}" (${ing.unit}).`,
        );
      }
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
      ingredients: parsed.ingredients.map((ing, index) => {
        const normalized = normalizedIngredients[index];
        if ("kcalPer100" in normalized) {
          return {
            name: ing.name,
            amount: ing.amount,
            unit: normalizeUnitShortName(ing.unit),
            kcalPer100: normalized.kcalPer100,
            proteinPer100: normalized.proteinPer100,
            carbsPer100: normalized.carbsPer100,
            fatPer100: normalized.fatPer100,
          };
        }
        return {
          name: ing.name,
          amount: ing.amount,
          unit: normalizeUnitShortName(ing.unit),
          kcalPerUnit: normalized.kcalPerUnit,
          proteinPerUnit: normalized.proteinPerUnit,
          carbsPerUnit: normalized.carbsPerUnit,
          fatPerUnit: normalized.fatPerUnit,
        };
      }),
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

    const scale = args.servings / recipe.servings;

    for (const ing of ingredients) {
      const amount = Math.round(ing.amount * scale * 10) / 10;
      const itemName = `${ing.name} (${amount} ${ing.unit})`;
      await ctx.runAction(api.groceries.categorizeItem, { itemName });
    }

    return null;
  },
});
