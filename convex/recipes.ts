import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Mistral } from "@mistralai/mistralai";
import { Id } from "./_generated/dataModel";
import {
  ingredientMacroRegenerationPrompt,
  recipeEditPrompt,
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
import { env } from "./env";
import { requireViewer } from "./families";

const model = "mistral-small-latest";
const mealTagValues = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
type MealTag = (typeof mealTagValues)[number];

type MassVolumeIngredientDocument = {
  _id: Id<"recipeIngredients">;
  _creationTime: number;
  familyId: Id<"families">;
  recipeId: Id<"recipes">;
  partId: Id<"recipeParts">;
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
  familyId: Id<"families">;
  recipeId: Id<"recipes">;
  partId: Id<"recipeParts">;
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
  familyId: Id<"families">;
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

type RecipeDocument = {
  _id: Id<"recipes">;
  _creationTime: number;
  familyId: Id<"families">;
  name: string;
  description: string;
  servings: number;
  instructions: Array<string>;
  mealTags?: Array<string>;
  currentVersionNumber?: number;
  latestVersionNumber?: number;
};

type RecipeVersionSnapshotPart = {
  snapshotPartId: string;
  name: string;
  position: number;
  scale: number;
  yieldAmount?: number;
  yieldUnit?: string;
  instructions: Array<string>;
};

type RecipeVersionSnapshotIngredient =
  | {
      name: string;
      amount: number;
      unit: string;
      partSnapshotId: string;
      sourcePartSnapshotId?: string;
      usedAmount?: number;
      usedUnit?: string;
      kcalPer100: number;
      proteinPer100: number;
      carbsPer100: number;
      fatPer100: number;
    }
  | {
      name: string;
      amount: number;
      unit: string;
      partSnapshotId: string;
      sourcePartSnapshotId?: string;
      usedAmount?: number;
      usedUnit?: string;
      kcalPerUnit: number;
      proteinPerUnit: number;
      carbsPerUnit: number;
      fatPerUnit: number;
    };

type RecipeVersionSnapshot = {
  name: string;
  description: string;
  servings: number;
  instructions: Array<string>;
  mealTags: Array<MealTag>;
  parts: Array<RecipeVersionSnapshotPart>;
  ingredients: Array<RecipeVersionSnapshotIngredient>;
};

type RecipeVersionDocument = {
  _id: Id<"recipeVersions">;
  _creationTime: number;
  familyId: Id<"families">;
  recipeId: Id<"recipes">;
  versionNumber: number;
  prompt?: string;
  createdAt: number;
  snapshot: RecipeVersionSnapshot;
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
  familyId: v.id("families"),
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
    familyId: v.id("families"),
    recipeId: v.id("recipes"),
    partId: v.id("recipeParts"),
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
    familyId: v.id("families"),
    recipeId: v.id("recipes"),
    partId: v.id("recipeParts"),
    sourcePartId: v.optional(v.id("recipeParts")),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    ...ingredientPerUnitMacroFields,
  }),
);

const versionSnapshotPartValidator = v.object({
  snapshotPartId: v.string(),
  name: v.string(),
  position: v.number(),
  scale: v.number(),
  yieldAmount: v.optional(v.number()),
  yieldUnit: v.optional(v.string()),
  instructions: v.array(v.string()),
});

const versionSnapshotIngredientValidator = v.union(
  v.object({
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    partSnapshotId: v.string(),
    sourcePartSnapshotId: v.optional(v.string()),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
    ...ingredientMassMacroFields,
  }),
  v.object({
    name: v.string(),
    amount: v.number(),
    unit: v.string(),
    partSnapshotId: v.string(),
    sourcePartSnapshotId: v.optional(v.string()),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
    ...ingredientPerUnitMacroFields,
  }),
);

const recipeVersionSnapshotValidator = v.object({
  name: v.string(),
  description: v.string(),
  servings: v.number(),
  instructions: v.array(v.string()),
  mealTags: v.array(mealTagValidator),
  parts: v.array(versionSnapshotPartValidator),
  ingredients: v.array(versionSnapshotIngredientValidator),
});

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
      familyId: ingredient.familyId,
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
    familyId: ingredient.familyId,
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
  return new Mistral({ apiKey: env.MISTRAL_API_KEY });
}

function isDevEnvironment(): boolean {
  return env.CONVEX_ENV === "dev";
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

async function createRecipePart(
  ctx: any,
  familyId: Id<"families">,
  recipeId: Id<"recipes">,
  part: Omit<RecipePartInput, "ingredients">,
): Promise<Id<"recipeParts">> {
  return await ctx.db.insert("recipeParts", {
    familyId,
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
  }> = parts.map((part) => ({
    _id: part._id,
    scale: part.scale,
    yieldAmount: part.yieldAmount,
    yieldUnit: part.yieldUnit,
  }));
  return computeRecipePartMacros(
    effectiveParts,
    ingredients as Array<any>,
  ).total.kcal;
}

function getRecipeVersionCounters(recipe: RecipeDocument): {
  currentVersionNumber: number;
  latestVersionNumber: number;
} {
  const current = recipe.currentVersionNumber ?? 1;
  const latest = recipe.latestVersionNumber ?? current;
  return {
    currentVersionNumber: Math.max(1, current),
    latestVersionNumber: Math.max(1, latest, current),
  };
}

function getNormalizedRecipeMealTags(recipe: {
  name: string;
  description: string;
  mealTags?: Array<string>;
}): Array<MealTag> {
  const normalizedMealTags = sanitizeMealTags(recipe.mealTags);
  if (normalizedMealTags.length > 0) {
    return normalizedMealTags;
  }
  return inferMealTagsFromText(`${recipe.name} ${recipe.description}`);
}

async function requireRecipeForFamily(
  ctx: any,
  familyId: Id<"families">,
  recipeId: Id<"recipes">,
): Promise<RecipeDocument> {
  const recipe = (await ctx.db.get(recipeId)) as RecipeDocument | null;
  if (!recipe || recipe.familyId !== familyId) {
    throw new Error("Recipe not found");
  }
  return recipe;
}

async function requirePartForFamily(
  ctx: any,
  familyId: Id<"families">,
  partId: Id<"recipeParts">,
): Promise<RecipePartDocument> {
  const part = (await ctx.db.get(partId)) as RecipePartDocument | null;
  if (!part || part.familyId !== familyId) {
    throw new Error("Part not found");
  }
  return part;
}

async function requireIngredientForFamily(
  ctx: any,
  familyId: Id<"families">,
  ingredientId: Id<"recipeIngredients">,
): Promise<IngredientDocument> {
  const ingredient = (await ctx.db.get(ingredientId)) as IngredientDocument | null;
  if (!ingredient || ingredient.familyId !== familyId) {
    throw new Error("Ingredient not found");
  }
  return ingredient;
}

async function getVersionByNumber(
  ctx: any,
  recipeId: Id<"recipes">,
  versionNumber: number,
): Promise<RecipeVersionDocument | null> {
  const version = await ctx.db
    .query("recipeVersions")
    .withIndex("by_recipeId_and_versionNumber", (q: any) =>
      q.eq("recipeId", recipeId).eq("versionNumber", versionNumber),
    )
    .first();
  return (version as RecipeVersionDocument | null) ?? null;
}

async function captureRecipeSnapshot(
  ctx: any,
  recipeId: Id<"recipes">,
): Promise<RecipeVersionSnapshot> {
  const recipe = (await ctx.db.get(recipeId)) as RecipeDocument | null;
  if (!recipe) {
    throw new Error("Recipe not found");
  }

  const parts = await getRecipeParts(ctx, recipeId);
  const ingredients = await ctx.db
    .query("recipeIngredients")
    .withIndex("by_recipeId", (q: any) => q.eq("recipeId", recipeId))
    .collect();
  const normalizedIngredients = ingredients.map((ingredient: any) =>
    normalizeIngredientDocument(ingredient as IngredientDocument),
  );

  const partSnapshotIdByPartId = new Map<Id<"recipeParts">, string>();
  const snapshotParts = parts.map((part, index) => {
    const snapshotPartId = `part-${index + 1}`;
    partSnapshotIdByPartId.set(part._id, snapshotPartId);
    return {
      snapshotPartId,
      name: part.name,
      position: part.position,
      scale: part.scale,
      yieldAmount: part.yieldAmount,
      yieldUnit: part.yieldUnit,
      instructions: part.instructions ?? [],
    };
  });

  const snapshotIngredients = normalizedIngredients.map(
    (ingredient: IngredientDocument) => {
      const partSnapshotId = partSnapshotIdByPartId.get(ingredient.partId);
      if (!partSnapshotId) {
        throw new Error("Ingredient part mapping missing while capturing version");
      }
      const sourcePartSnapshotId = ingredient.sourcePartId
        ? partSnapshotIdByPartId.get(ingredient.sourcePartId)
        : undefined;
      if ("kcalPer100" in ingredient) {
        return {
          name: ingredient.name,
          amount: ingredient.amount,
          unit: normalizeUnitShortName(ingredient.unit),
          partSnapshotId,
          sourcePartSnapshotId,
          usedAmount: ingredient.usedAmount,
          usedUnit: ingredient.usedUnit
            ? normalizeUnitShortName(ingredient.usedUnit)
            : undefined,
          kcalPer100: ingredient.kcalPer100,
          proteinPer100: ingredient.proteinPer100,
          carbsPer100: ingredient.carbsPer100,
          fatPer100: ingredient.fatPer100,
        };
      }
      return {
        name: ingredient.name,
        amount: ingredient.amount,
        unit: normalizeUnitShortName(ingredient.unit),
        partSnapshotId,
        sourcePartSnapshotId,
        usedAmount: ingredient.usedAmount,
        usedUnit: ingredient.usedUnit
          ? normalizeUnitShortName(ingredient.usedUnit)
          : undefined,
        kcalPerUnit: ingredient.kcalPerUnit,
        proteinPerUnit: ingredient.proteinPerUnit,
        carbsPerUnit: ingredient.carbsPerUnit,
        fatPerUnit: ingredient.fatPerUnit,
      };
    },
  );

  return {
    name: recipe.name,
    description: recipe.description,
    servings: recipe.servings,
    instructions: recipe.instructions,
    mealTags: getNormalizedRecipeMealTags(recipe),
    parts: snapshotParts,
    ingredients: snapshotIngredients,
  };
}

async function restoreRecipeFromSnapshot(
  ctx: any,
  recipeId: Id<"recipes">,
  snapshot: RecipeVersionSnapshot,
): Promise<void> {
  const recipe = (await ctx.db.get(recipeId)) as RecipeDocument | null;
  if (!recipe) {
    throw new Error("Recipe not found");
  }

  const mealTags = getNormalizedRecipeMealTags({
    name: snapshot.name,
    description: snapshot.description,
    mealTags: snapshot.mealTags,
  });

  await ctx.db.patch(recipeId, {
    name: snapshot.name,
    description: snapshot.description,
    servings: Math.max(1, Math.round(snapshot.servings)),
    instructions: snapshot.instructions,
    mealTags,
  });

  const currentIngredients = await ctx.db
    .query("recipeIngredients")
    .withIndex("by_recipeId", (q: any) => q.eq("recipeId", recipeId))
    .collect();
  const currentParts = await ctx.db
    .query("recipeParts")
    .withIndex("by_recipeId", (q: any) => q.eq("recipeId", recipeId))
    .collect();
  for (const ingredient of currentIngredients) {
    await ctx.db.delete(ingredient._id);
  }
  for (const part of currentParts) {
    await ctx.db.delete(part._id);
  }

  const partIdBySnapshotPartId = new Map<string, Id<"recipeParts">>();
  const orderedParts = [...snapshot.parts].sort((a, b) => a.position - b.position);
  for (const part of orderedParts) {
    const partId = await ctx.db.insert("recipeParts", {
      familyId: recipe.familyId,
      recipeId,
      name: part.name,
      position: part.position,
      scale: part.scale,
      yieldAmount: part.yieldAmount,
      yieldUnit: part.yieldUnit ? normalizeUnitShortName(part.yieldUnit) : undefined,
      instructions: part.instructions ?? [],
    });
    partIdBySnapshotPartId.set(part.snapshotPartId, partId);
  }

  for (const ingredient of snapshot.ingredients) {
    const partId = partIdBySnapshotPartId.get(ingredient.partSnapshotId);
    if (!partId) {
      throw new Error("Snapshot ingredient references missing part");
    }
    const sourcePartId = ingredient.sourcePartSnapshotId
      ? partIdBySnapshotPartId.get(ingredient.sourcePartSnapshotId)
      : undefined;

    if ("kcalPer100" in ingredient) {
      await ctx.db.insert("recipeIngredients", {
        familyId: recipe.familyId,
        recipeId,
        partId,
        sourcePartId,
        usedAmount: sourcePartId ? ingredient.usedAmount : undefined,
        usedUnit:
          sourcePartId && ingredient.usedUnit
            ? normalizeUnitShortName(ingredient.usedUnit)
            : undefined,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: normalizeUnitShortName(ingredient.unit),
        kcalPer100: ingredient.kcalPer100,
        proteinPer100: ingredient.proteinPer100,
        carbsPer100: ingredient.carbsPer100,
        fatPer100: ingredient.fatPer100,
      });
      continue;
    }

    await ctx.db.insert("recipeIngredients", {
      familyId: recipe.familyId,
      recipeId,
      partId,
      sourcePartId,
      usedAmount: sourcePartId ? ingredient.usedAmount : undefined,
      usedUnit:
        sourcePartId && ingredient.usedUnit
          ? normalizeUnitShortName(ingredient.usedUnit)
          : undefined,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: normalizeUnitShortName(ingredient.unit),
      kcalPerUnit: ingredient.kcalPerUnit,
      proteinPerUnit: ingredient.proteinPerUnit,
      carbsPerUnit: ingredient.carbsPerUnit,
      fatPerUnit: ingredient.fatPerUnit,
    });
  }
}

async function upsertRecipeVersion(
  ctx: any,
  args: {
    familyId: Id<"families">;
    recipeId: Id<"recipes">;
    versionNumber: number;
    prompt?: string;
    snapshot: RecipeVersionSnapshot;
  },
): Promise<void> {
  const existing = await getVersionByNumber(
    ctx,
    args.recipeId,
    args.versionNumber,
  );
  if (existing) {
    await ctx.db.patch(existing._id, {
      prompt: args.prompt ?? existing.prompt,
      createdAt: Date.now(),
      snapshot: args.snapshot,
    });
    return;
  }
  await ctx.db.insert("recipeVersions", {
    familyId: args.familyId,
    recipeId: args.recipeId,
    versionNumber: args.versionNumber,
    prompt: args.prompt,
    createdAt: Date.now(),
    snapshot: args.snapshot,
  });
}

async function ensureVersioningInitializedInternal(
  ctx: any,
  recipeId: Id<"recipes">,
): Promise<{ currentVersionNumber: number; latestVersionNumber: number }> {
  const recipe = (await ctx.db.get(recipeId)) as RecipeDocument | null;
  if (!recipe) {
    throw new Error("Recipe not found");
  }
  const counters = getRecipeVersionCounters(recipe);

  let shouldPatchRecipeCounters =
    recipe.currentVersionNumber === undefined ||
    recipe.latestVersionNumber === undefined;

  const existingV1 = await getVersionByNumber(ctx, recipeId, 1);
  if (!existingV1) {
    const snapshot = await captureRecipeSnapshot(ctx, recipeId);
    await upsertRecipeVersion(ctx, {
      familyId: recipe.familyId,
      recipeId,
      versionNumber: 1,
      snapshot,
      prompt: undefined,
    });
  }

  if (shouldPatchRecipeCounters) {
    await ctx.db.patch(recipeId, {
      currentVersionNumber: counters.currentVersionNumber,
      latestVersionNumber: counters.latestVersionNumber,
    });
  }

  return counters;
}

async function syncCurrentRecipeVersionSnapshot(
  ctx: any,
  recipeId: Id<"recipes">,
): Promise<void> {
  const recipe = (await ctx.db.get(recipeId)) as RecipeDocument | null;
  if (!recipe) return;
  const counters = await ensureVersioningInitializedInternal(ctx, recipeId);
  const snapshot = await captureRecipeSnapshot(ctx, recipeId);
  const existing = await getVersionByNumber(
    ctx,
    recipeId,
    counters.currentVersionNumber,
  );
  await upsertRecipeVersion(ctx, {
    familyId: recipe.familyId,
    recipeId,
    versionNumber: counters.currentVersionNumber,
    prompt: existing?.prompt,
    snapshot,
  });
}

async function deleteFutureVersions(
  ctx: any,
  recipeId: Id<"recipes">,
  fromVersionExclusive: number,
): Promise<void> {
  const versions = await ctx.db
    .query("recipeVersions")
    .withIndex("by_recipeId", (q: any) => q.eq("recipeId", recipeId))
    .collect();
  for (const version of versions) {
    if (version.versionNumber > fromVersionExclusive) {
      await ctx.db.delete(version._id);
    }
  }
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
      currentVersionNumber: v.number(),
      latestVersionNumber: v.number(),
      totalKcal: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const recipes = (await ctx.db
      .query("recipes")
      .withIndex("by_familyId", (q) => q.eq("familyId", viewer.family._id))
      .order("desc")
      .collect()) as Array<RecipeDocument>;
    const result = [];
    for (const recipe of recipes) {
      const mealTags = getNormalizedRecipeMealTags(recipe);
      const versionCounters = getRecipeVersionCounters(recipe);
      const ingredients = await ctx.db
        .query("recipeIngredients")
        .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
        .collect();
      const parts = await getRecipeParts(ctx, recipe._id);
      const normalizedIngredients = ingredients.map((ingredient) =>
        normalizeIngredientDocument(ingredient as IngredientDocument),
      );
      const totalKcal = computeTotalRecipeKcal(parts, normalizedIngredients);
      result.push({
        _id: recipe._id,
        _creationTime: recipe._creationTime,
        name: recipe.name,
        description: recipe.description,
        servings: recipe.servings,
        instructions: recipe.instructions,
        mealTags,
        currentVersionNumber: versionCounters.currentVersionNumber,
        latestVersionNumber: versionCounters.latestVersionNumber,
        totalKcal: Math.round(totalKcal),
      });
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
      currentVersionNumber: v.number(),
      latestVersionNumber: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const recipe = (await ctx.db.get(args.recipeId)) as RecipeDocument | null;
    if (!recipe || recipe.familyId !== viewer.family._id) {
      return null;
    }
    const mealTags = getNormalizedRecipeMealTags(recipe);
    const versionCounters = getRecipeVersionCounters(recipe);
    return {
      _id: recipe._id,
      _creationTime: recipe._creationTime,
      name: recipe.name,
      description: recipe.description,
      servings: recipe.servings,
      instructions: recipe.instructions,
      mealTags,
      currentVersionNumber: versionCounters.currentVersionNumber,
      latestVersionNumber: versionCounters.latestVersionNumber,
    };
  },
});

export const getVersions = query({
  args: { recipeId: v.id("recipes") },
  returns: v.array(
    v.object({
      _id: v.id("recipeVersions"),
      _creationTime: v.number(),
      recipeId: v.id("recipes"),
      versionNumber: v.number(),
      prompt: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    const versions = (await ctx.db
      .query("recipeVersions")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect()) as Array<RecipeVersionDocument>;
    return versions
      .filter((version) => version.familyId === viewer.family._id)
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((version) => ({
        _id: version._id,
        _creationTime: version._creationTime,
        recipeId: version.recipeId,
        versionNumber: version.versionNumber,
        prompt: version.prompt,
        createdAt: version.createdAt,
      }));
  },
});

export const getVersionSnapshot = query({
  args: {
    recipeId: v.id("recipes"),
    versionNumber: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id("recipeVersions"),
      versionNumber: v.number(),
      prompt: v.optional(v.string()),
      snapshot: recipeVersionSnapshotValidator,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    const version = await getVersionByNumber(
      ctx,
      args.recipeId,
      args.versionNumber,
    );
    if (!version || version.familyId !== viewer.family._id) {
      return null;
    }
    return {
      _id: version._id,
      versionNumber: version.versionNumber,
      prompt: version.prompt,
      snapshot: version.snapshot,
    };
  },
});

export const ensureVersioningInitialized = mutation({
  args: { recipeId: v.id("recipes") },
  returns: v.object({
    currentVersionNumber: v.number(),
    latestVersionNumber: v.number(),
  }),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    return await ensureVersioningInitializedInternal(ctx, args.recipeId);
  },
});

export const selectVersion = mutation({
  args: {
    recipeId: v.id("recipes"),
    versionNumber: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    const counters = await ensureVersioningInitializedInternal(ctx, args.recipeId);
    if (
      !Number.isFinite(args.versionNumber) ||
      args.versionNumber < 1 ||
      args.versionNumber > counters.latestVersionNumber
    ) {
      throw new Error("Invalid recipe version");
    }
    const version = await getVersionByNumber(ctx, args.recipeId, args.versionNumber);
    if (!version) {
      throw new Error("Recipe version not found");
    }

    await restoreRecipeFromSnapshot(ctx, args.recipeId, version.snapshot);
    await ctx.db.patch(args.recipeId, {
      currentVersionNumber: args.versionNumber,
      latestVersionNumber: counters.latestVersionNumber,
    });
    return null;
  },
});

export const commitEditedVersion = mutation({
  args: {
    recipeId: v.id("recipes"),
    baseVersionNumber: v.number(),
    prompt: v.string(),
    allowReplaceFutureVersions: v.boolean(),
    snapshot: recipeVersionSnapshotValidator,
  },
  returns: v.object({
    versionNumber: v.number(),
  }),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const recipe = await requireRecipeForFamily(
      ctx,
      viewer.family._id,
      args.recipeId,
    );
    const counters = await ensureVersioningInitializedInternal(ctx, args.recipeId);
    const baseVersionNumber = Math.round(args.baseVersionNumber);
    if (
      !Number.isFinite(baseVersionNumber) ||
      baseVersionNumber < 1 ||
      baseVersionNumber > counters.latestVersionNumber
    ) {
      throw new Error("Invalid base version number");
    }
    const baseVersion = await getVersionByNumber(
      ctx,
      args.recipeId,
      baseVersionNumber,
    );
    if (!baseVersion) {
      throw new Error("Base recipe version not found");
    }

    if (
      baseVersionNumber < counters.latestVersionNumber &&
      !args.allowReplaceFutureVersions
    ) {
      throw new Error("REPLACE_FUTURE_VERSIONS_REQUIRED");
    }

    if (baseVersionNumber < counters.latestVersionNumber) {
      await deleteFutureVersions(ctx, args.recipeId, baseVersionNumber);
    }

    const nextVersionNumber = baseVersionNumber + 1;
    await upsertRecipeVersion(ctx, {
      familyId: recipe.familyId,
      recipeId: args.recipeId,
      versionNumber: nextVersionNumber,
      prompt: args.prompt,
      snapshot: args.snapshot,
    });
    await restoreRecipeFromSnapshot(ctx, args.recipeId, args.snapshot);
    await ctx.db.patch(args.recipeId, {
      currentVersionNumber: nextVersionNumber,
      latestVersionNumber: nextVersionNumber,
    });

    return { versionNumber: nextVersionNumber };
  },
});

export const getIngredients = query({
  args: { recipeId: v.id("recipes") },
  returns: v.array(ingredientDocumentValidator),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    const ingredients = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    return ingredients
      .filter((ingredient) => ingredient.familyId === viewer.family._id)
      .map((ingredient) =>
        normalizeIngredientDocument(ingredient as IngredientDocument),
      );
  },
});

export const getParts = query({
  args: { recipeId: v.id("recipes") },
  returns: v.array(recipePartValidator),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    return await getRecipeParts(ctx, args.recipeId);
  },
});

export const getIngredient = query({
  args: { ingredientId: v.id("recipeIngredients") },
  returns: v.union(ingredientDocumentValidator, v.null()),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const ingredient = await ctx.db.get(args.ingredientId);
    if (!ingredient || ingredient.familyId !== viewer.family._id) {
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
    const viewer = await requireViewer(ctx);
    const mealTags =
      args.mealTags && args.mealTags.length > 0
        ? sanitizeMealTags(args.mealTags)
        : inferMealTagsFromText(`${args.name} ${args.description}`);
    const recipeId = await ctx.db.insert("recipes", {
      familyId: viewer.family._id,
      name: args.name,
      description: args.description,
      servings: args.servings,
      instructions: args.instructions,
      mealTags,
      currentVersionNumber: 1,
      latestVersionNumber: 1,
    });
    const partIdByName = new Map<string, Id<"recipeParts">>();
    if (args.parts && args.parts.length > 0) {
      const ordered = [...args.parts].sort((a, b) => a.position - b.position);
      for (const part of ordered) {
        const partId = await createRecipePart(
          ctx,
          viewer.family._id,
          recipeId,
          part,
        );
        partIdByName.set(part.name.toLowerCase(), partId);
      }
      for (const part of ordered) {
        const partId = partIdByName.get(part.name.toLowerCase());
        if (!partId) continue;
        for (const ing of part.ingredients) {
          const normalized = normalizeIngredientInput(ing);
          await ctx.db.insert("recipeIngredients", {
            familyId: viewer.family._id,
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
      const mainPartId = await createRecipePart(ctx, viewer.family._id, recipeId, {
        name: "Main",
        position: 0,
        scale: 1,
      });
      const ingredients = args.ingredients ?? [];
      for (const ing of ingredients) {
        const normalized = normalizeIngredientInput(ing);
        await ctx.db.insert("recipeIngredients", {
          familyId: viewer.family._id,
          recipeId,
          partId: mainPartId,
          name: normalized.name,
          amount: normalized.amount,
          unit: normalizeUnitShortName(normalized.unit),
          ...toMacroUpdate(normalized),
        });
      }
    }
    const initialSnapshot = await captureRecipeSnapshot(ctx, recipeId);
    await upsertRecipeVersion(ctx, {
      familyId: viewer.family._id,
      recipeId,
      versionNumber: 1,
      prompt: undefined,
      snapshot: initialSnapshot,
    });
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
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    await ctx.db.patch(args.recipeId, {
      mealTags: sanitizeMealTags(args.mealTags),
    });
    await syncCurrentRecipeVersionSnapshot(ctx, args.recipeId);
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
    const viewer = await requireViewer(ctx);
    const existing = await requireIngredientForFamily(
      ctx,
      viewer.family._id,
      args.ingredientId,
    );
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
      familyId: normalizedExisting.familyId,
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
    await syncCurrentRecipeVersionSnapshot(ctx, normalizedExisting.recipeId);
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
    const viewer = await requireViewer(ctx);
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
    const existing = await requireIngredientForFamily(
      ctx,
      viewer.family._id,
      args.ingredientId,
    );
    const recipeId = existing.recipeId as Id<"recipes">;
    await ctx.db.patch(args.ingredientId, {
      amount: args.amount,
    });
    await syncCurrentRecipeVersionSnapshot(ctx, recipeId);
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
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    const partId = await ctx.db.insert("recipeParts", {
      familyId: viewer.family._id,
      recipeId: args.recipeId,
      name: args.name,
      position: args.position,
      scale: args.scale ?? 1,
      yieldAmount: args.yieldAmount,
      yieldUnit: args.yieldUnit ? normalizeUnitShortName(args.yieldUnit) : undefined,
      instructions: args.instructions ?? [],
    });
    await syncCurrentRecipeVersionSnapshot(ctx, args.recipeId);
    return partId;
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
    const viewer = await requireViewer(ctx);
    const existing = await requirePartForFamily(ctx, viewer.family._id, args.partId);
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
    await syncCurrentRecipeVersionSnapshot(ctx, existing.recipeId as Id<"recipes">);
    return null;
  },
});

export const deletePart = mutation({
  args: { partId: v.id("recipeParts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const part = await requirePartForFamily(ctx, viewer.family._id, args.partId);
    const ingredientsInPart = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId_and_partId", (q) =>
        q.eq("recipeId", part.recipeId).eq("partId", part._id),
      )
      .collect();
    if (
      ingredientsInPart.some((ingredient) => ingredient.familyId === viewer.family._id)
    ) {
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
    await syncCurrentRecipeVersionSnapshot(ctx, part.recipeId as Id<"recipes">);
    return null;
  },
});

export const updateIngredientPartUsage = mutation({
  args: {
    ingredientId: v.id("recipeIngredients"),
    partId: v.id("recipeParts"),
    sourcePartId: v.optional(v.id("recipeParts")),
    usedAmount: v.optional(v.number()),
    usedUnit: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const ingredient = await requireIngredientForFamily(
      ctx,
      viewer.family._id,
      args.ingredientId,
    );
    const recipeId = ingredient.recipeId as Id<"recipes">;
    const partId = args.partId;
    const part = await requirePartForFamily(ctx, viewer.family._id, partId);
    if (part.recipeId !== recipeId) {
      throw new Error("Part does not belong to ingredient recipe");
    }

    if (args.sourcePartId) {
      const sourcePart = await requirePartForFamily(
        ctx,
        viewer.family._id,
        args.sourcePartId,
      );
      if (sourcePart.recipeId !== recipeId) {
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
    await syncCurrentRecipeVersionSnapshot(ctx, recipeId);
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
    const viewer = await requireViewer(ctx);
    await requireRecipeForFamily(ctx, viewer.family._id, args.recipeId);
    const ingredients = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    const parts = await ctx.db
      .query("recipeParts")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    const versions = await ctx.db
      .query("recipeVersions")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();
    for (const ing of ingredients) {
      await ctx.db.delete(ing._id);
    }
    for (const part of parts) {
      await ctx.db.delete(part._id);
    }
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }
    await ctx.db.delete(args.recipeId);
    return null;
  },
});

function buildFamilyGoalsContextFromQuery(context: {
  memberCount: number;
  membersWithTargets: number;
  targets: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    macroTolerancePct: number;
  };
  preferences: {
    hardExclusions: Array<string>;
    veganVotes: number;
    vegetarianVotes: number;
    notes: Array<string>;
  };
}): string {
  const lines: Array<string> = [];
  lines.push(`- Household members: ${context.memberCount}`);
  lines.push(`- Members with targets: ${context.membersWithTargets}`);

  if (context.targets.kcal !== null) {
    lines.push(`- Household daily target kcal: ${context.targets.kcal}`);
  }
  if (context.targets.protein !== null) {
    lines.push(`- Household daily target protein: ${context.targets.protein} g`);
  }
  if (context.targets.carbs !== null) {
    lines.push(`- Household daily target carbs: ${context.targets.carbs} g`);
  }
  if (context.targets.fat !== null) {
    lines.push(`- Household daily target fat: ${context.targets.fat} g`);
  }
  lines.push(`- Macro tolerance: ${context.targets.macroTolerancePct}%`);

  if (context.preferences.hardExclusions.length > 0) {
    lines.push(
      `- Hard exclusions: ${context.preferences.hardExclusions.join(", ")}`,
    );
  }
  if (context.preferences.veganVotes > 0) {
    lines.push(
      `- Votes for more vegan meals: ${context.preferences.veganVotes}`,
    );
  }
  if (context.preferences.vegetarianVotes > 0) {
    lines.push(
      `- Votes for more vegetarian meals: ${context.preferences.vegetarianVotes}`,
    );
  }
  if (context.preferences.notes.length > 0) {
    lines.push(`- Additional notes: ${context.preferences.notes.join(" | ")}`);
  }

  if (lines.length === 3) {
    return `
Family meal planning context:
- No family nutrition targets are configured yet.`;
  }

  return `
Family meal planning context:
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

function normalizeGeneratedRecipeParts(
  generatedRecipe: GeneratedRecipe,
  logContext: "generate" | "edit",
): Array<RecipePartInput> {
  const generatedParts: Array<GeneratedRecipePart> =
    generatedRecipe.parts && generatedRecipe.parts.length > 0
      ? generatedRecipe.parts
      : [
          {
            name: "Main",
            position: 0,
            scale: 1,
            instructions: generatedRecipe.instructions,
            ingredients: generatedRecipe.ingredients ?? [],
          },
        ];

  return generatedParts.map((part) => {
    const normalizedIngredients = part.ingredients.map((ingredient) =>
      normalizeAndScaleIngredientMacros(toIngredientInputFromGenerated(ingredient)),
    );
    part.ingredients.forEach((ingredient, index) => {
      const normalized = normalizedIngredients[index];
      if (normalized.correctionFactor > 1) {
        console.log(
          `[recipes.${logContext}] Auto-scaled macros by x${normalized.correctionFactor} for ingredient "${ingredient.name}" (${ingredient.unit}).`,
        );
      }
      if (normalized.kcalWasRepaired) {
        console.log(
          `[recipes.${logContext}] Repaired kcal from macros for ingredient "${ingredient.name}" (${ingredient.unit}).`,
        );
      }
    });

    return {
      name: part.name,
      position: part.position,
      scale: part.scale,
      yieldAmount: part.yieldAmount,
      yieldUnit: part.yieldUnit,
      instructions: part.instructions,
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
}

function snapshotToPromptRecipe(
  snapshot: RecipeVersionSnapshot,
): {
  name: string;
  description: string;
  servings: number;
  mealTags: Array<string>;
  instructions: Array<string>;
  parts: Array<{
    name: string;
    position: number;
    scale: number;
    yieldAmount?: number;
    yieldUnit?: string;
    instructions: Array<string>;
    ingredients: Array<IngredientInput>;
  }>;
} {
  const partNameBySnapshotId = new Map<string, string>();
  for (const part of snapshot.parts) {
    partNameBySnapshotId.set(part.snapshotPartId, part.name);
  }

  const parts = snapshot.parts.map((part) => {
    const ingredients = snapshot.ingredients
      .filter((ingredient) => ingredient.partSnapshotId === part.snapshotPartId)
      .map((ingredient) => {
        if ("kcalPer100" in ingredient) {
          return {
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            sourcePartName: ingredient.sourcePartSnapshotId
              ? partNameBySnapshotId.get(ingredient.sourcePartSnapshotId)
              : undefined,
            usedAmount: ingredient.usedAmount,
            usedUnit: ingredient.usedUnit,
            kcalPer100: ingredient.kcalPer100,
            proteinPer100: ingredient.proteinPer100,
            carbsPer100: ingredient.carbsPer100,
            fatPer100: ingredient.fatPer100,
          };
        }
        return {
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          sourcePartName: ingredient.sourcePartSnapshotId
            ? partNameBySnapshotId.get(ingredient.sourcePartSnapshotId)
            : undefined,
          usedAmount: ingredient.usedAmount,
          usedUnit: ingredient.usedUnit,
          kcalPerUnit: ingredient.kcalPerUnit,
          proteinPerUnit: ingredient.proteinPerUnit,
          carbsPerUnit: ingredient.carbsPerUnit,
          fatPerUnit: ingredient.fatPerUnit,
        };
      });

    return {
      name: part.name,
      position: part.position,
      scale: part.scale,
      yieldAmount: part.yieldAmount,
      yieldUnit: part.yieldUnit,
      instructions: part.instructions,
      ingredients,
    };
  });

  return {
    name: snapshot.name,
    description: snapshot.description,
    servings: snapshot.servings,
    mealTags: snapshot.mealTags,
    instructions: snapshot.instructions,
    parts,
  };
}

function buildSnapshotFromGeneratedRecipe(
  generatedRecipe: GeneratedRecipe,
  normalizedParts: Array<RecipePartInput>,
): RecipeVersionSnapshot {
  const orderedParts = [...normalizedParts].sort((a, b) => a.position - b.position);
  const partSnapshotIdByName = new Map<string, string>();
  const snapshotParts = orderedParts.map((part, index) => {
    const snapshotPartId = `part-${index + 1}`;
    partSnapshotIdByName.set(part.name.toLowerCase(), snapshotPartId);
    return {
      snapshotPartId,
      name: part.name,
      position: part.position,
      scale: part.scale ?? 1,
      yieldAmount: part.yieldAmount,
      yieldUnit: part.yieldUnit ? normalizeUnitShortName(part.yieldUnit) : undefined,
      instructions: part.instructions ?? [],
    };
  });

  const snapshotIngredients: Array<RecipeVersionSnapshotIngredient> = [];
  for (const part of orderedParts) {
    const partSnapshotId = partSnapshotIdByName.get(part.name.toLowerCase());
    if (!partSnapshotId) {
      throw new Error("Failed to build recipe version snapshot");
    }
    for (const ingredient of part.ingredients) {
      const sourcePartSnapshotId = ingredient.sourcePartName
        ? partSnapshotIdByName.get(ingredient.sourcePartName.toLowerCase())
        : undefined;
      if ("kcalPer100" in ingredient) {
        snapshotIngredients.push({
          name: ingredient.name,
          amount: ingredient.amount,
          unit: normalizeUnitShortName(ingredient.unit),
          partSnapshotId,
          sourcePartSnapshotId,
          usedAmount: ingredient.usedAmount,
          usedUnit: ingredient.usedUnit
            ? normalizeUnitShortName(ingredient.usedUnit)
            : undefined,
          kcalPer100: ingredient.kcalPer100,
          proteinPer100: ingredient.proteinPer100,
          carbsPer100: ingredient.carbsPer100,
          fatPer100: ingredient.fatPer100,
        });
      } else {
        snapshotIngredients.push({
          name: ingredient.name,
          amount: ingredient.amount,
          unit: normalizeUnitShortName(ingredient.unit),
          partSnapshotId,
          sourcePartSnapshotId,
          usedAmount: ingredient.usedAmount,
          usedUnit: ingredient.usedUnit
            ? normalizeUnitShortName(ingredient.usedUnit)
            : undefined,
          kcalPerUnit: ingredient.kcalPerUnit,
          proteinPerUnit: ingredient.proteinPerUnit,
          carbsPerUnit: ingredient.carbsPerUnit,
          fatPerUnit: ingredient.fatPerUnit,
        });
      }
    }
  }

  return {
    name: generatedRecipe.name,
    description: generatedRecipe.description,
    servings: Math.max(1, Math.round(generatedRecipe.servings)),
    instructions: generatedRecipe.instructions,
    mealTags: (() => {
      const aiMealTags = sanitizeMealTags(generatedRecipe.mealTags);
      return aiMealTags.length > 0
        ? aiMealTags
        : inferMealTagsFromText(
            `${generatedRecipe.name} ${generatedRecipe.description}`,
          );
    })(),
    parts: snapshotParts,
    ingredients: snapshotIngredients,
  };
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
        ? buildFamilyGoalsContextFromQuery(
            await ctx.runQuery(api.nutritionGoals.getFamilyPlanningContext, {}),
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
    const normalizedParts = normalizeGeneratedRecipeParts(parsed, "generate");

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

export const editWithPrompt = action({
  args: {
    recipeId: v.id("recipes"),
    baseVersionNumber: v.number(),
    prompt: v.string(),
    allowReplaceFutureVersions: v.boolean(),
    debug: v.optional(v.boolean()),
  },
  returns: v.object({
    versionNumber: v.number(),
    prompt: v.optional(v.string()),
    responseText: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    versionNumber: number;
    prompt?: string;
    responseText?: string;
  }> => {
    const userPrompt = args.prompt.trim();
    if (!userPrompt) {
      throw new Error("Prompt cannot be empty");
    }
    const counters = await ctx.runMutation(api.recipes.ensureVersioningInitialized, {
      recipeId: args.recipeId,
    });
    const baseVersionNumber = Math.round(args.baseVersionNumber);
    if (
      !Number.isFinite(baseVersionNumber) ||
      baseVersionNumber < 1 ||
      baseVersionNumber > counters.latestVersionNumber
    ) {
      throw new Error("Invalid base version number");
    }
    if (
      baseVersionNumber < counters.latestVersionNumber &&
      !args.allowReplaceFutureVersions
    ) {
      throw new Error("REPLACE_FUTURE_VERSIONS_REQUIRED");
    }

    const baseVersion = await ctx.runQuery(api.recipes.getVersionSnapshot, {
      recipeId: args.recipeId,
      versionNumber: baseVersionNumber,
    });
    if (!baseVersion) {
      throw new Error("Base recipe version not found");
    }

    const client = createMistralClient();
    const goalsContext = buildFamilyGoalsContextFromQuery(
      await ctx.runQuery(api.nutritionGoals.getFamilyPlanningContext, {}),
    );
    const editPrompt = recipeEditPrompt(
      snapshotToPromptRecipe(baseVersion.snapshot),
      userPrompt,
      goalsContext,
    );
    const modelResponse = await requestRecipeJsonFromModel(client, editPrompt);
    const parsedServings =
      Number.isFinite(modelResponse.parsed.servings) &&
      modelResponse.parsed.servings > 0
        ? modelResponse.parsed.servings
        : baseVersion.snapshot.servings;
    const normalizedParts = normalizeGeneratedRecipeParts(
      {
        ...modelResponse.parsed,
        servings: parsedServings,
      },
      "edit",
    );
    const nextSnapshot = buildSnapshotFromGeneratedRecipe(
      {
        ...modelResponse.parsed,
        servings: parsedServings,
      },
      normalizedParts,
    );

    const commitResult: { versionNumber: number } = await ctx.runMutation(
      api.recipes.commitEditedVersion,
      {
        recipeId: args.recipeId,
        baseVersionNumber,
        prompt: userPrompt,
        allowReplaceFutureVersions: args.allowReplaceFutureVersions,
        snapshot: nextSnapshot,
      },
    );

    return {
      versionNumber: commitResult.versionNumber,
      prompt: args.debug ? editPrompt : undefined,
      responseText: args.debug ? modelResponse.text : undefined,
    };
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
    const partScaleById = new Map(
      parts.map((part: { _id: Id<"recipeParts">; scale: number }) => [
        part._id,
        part.scale,
      ]),
    );

    const scale = args.servings / recipe.servings;

    for (const ing of ingredients) {
      if (ing.sourcePartId) continue;
      if (!ing.partId) {
        throw new Error("Ingredient is missing required partId");
      }
      const partScale = partScaleById.get(ing.partId);
      if (partScale === undefined || partScale === null) {
        throw new Error("Ingredient part not found in recipe parts");
      }
      const amount = Math.round(ing.amount * scale * partScale * 10) / 10;
      const itemName = `${ing.name} (${amount} ${ing.unit})`;
      await ctx.runAction(api.groceries.categorizeItem, { itemName });
    }

    return null;
  },
});
