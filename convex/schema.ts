import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const familyRoleValidator = v.union(v.literal("owner"), v.literal("member"));
const familyInviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
  v.literal("expired"),
);
const dietPreferenceValidator = v.union(
  v.literal("none"),
  v.literal("moreVegetarian"),
  v.literal("moreVegan"),
  v.literal("vegetarian"),
  v.literal("vegan"),
);

const mealTagValidator = v.union(
  v.literal("Breakfast"),
  v.literal("Lunch"),
  v.literal("Dinner"),
  v.literal("Snack"),
);

const ingredientSnapshotMassMacroValidator = v.object({
  name: v.string(),
  amount: v.number(),
  unit: v.string(),
  partSnapshotId: v.string(),
  sourcePartSnapshotId: v.optional(v.string()),
  usedAmount: v.optional(v.number()),
  usedUnit: v.optional(v.string()),
  kcalPer100: v.number(),
  proteinPer100: v.number(),
  carbsPer100: v.number(),
  fatPer100: v.number(),
});

const ingredientSnapshotPerUnitMacroValidator = v.object({
  name: v.string(),
  amount: v.number(),
  unit: v.string(),
  partSnapshotId: v.string(),
  sourcePartSnapshotId: v.optional(v.string()),
  usedAmount: v.optional(v.number()),
  usedUnit: v.optional(v.string()),
  kcalPerUnit: v.number(),
  proteinPerUnit: v.number(),
  carbsPerUnit: v.number(),
  fatPerUnit: v.number(),
});

const recipeVersionSnapshotValidator = v.object({
  name: v.string(),
  description: v.string(),
  servings: v.number(),
  instructions: v.array(v.string()),
  mealTags: v.array(mealTagValidator),
  parts: v.array(
    v.object({
      snapshotPartId: v.string(),
      name: v.string(),
      position: v.number(),
      scale: v.number(),
      yieldAmount: v.optional(v.number()),
      yieldUnit: v.optional(v.string()),
      instructions: v.array(v.string()),
    }),
  ),
  ingredients: v.array(
    v.union(
      ingredientSnapshotMassMacroValidator,
      ingredientSnapshotPerUnitMacroValidator,
    ),
  ),
});

const applicationTables = {
  userProfiles: defineTable({
    betterAuthUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_betterAuthUserId", ["betterAuthUserId"]),

  families: defineTable({
    name: v.string(),
    createdByUserId: v.string(),
    currentStoreId: v.optional(v.id("stores")),
    createdAt: v.number(),
  }).index("by_createdByUserId", ["createdByUserId"]),

  familyMembers: defineTable({
    familyId: v.id("families"),
    betterAuthUserId: v.string(),
    role: familyRoleValidator,
    joinedAt: v.number(),
  })
    .index("by_familyId", ["familyId"])
    .index("by_betterAuthUserId", ["betterAuthUserId"])
    .index("by_familyId_and_betterAuthUserId", ["familyId", "betterAuthUserId"]),

  familyInvites: defineTable({
    familyId: v.id("families"),
    email: v.optional(v.string()),
    token: v.string(),
    createdByUserId: v.string(),
    status: familyInviteStatusValidator,
    expiresAt: v.number(),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedByUserId: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_familyId", ["familyId"])
    .index("by_email", ["email"]),

  memberProfiles: defineTable({
    familyId: v.id("families"),
    betterAuthUserId: v.string(),
    displayName: v.optional(v.string()),
    profileAge: v.optional(v.number()),
    profileSex: v.optional(v.union(v.literal("male"), v.literal("female"))),
    profileHeightCm: v.optional(v.number()),
    profileWeightKg: v.optional(v.number()),
    profileBodyFatPct: v.optional(v.number()),
    profileActivityLevel: v.optional(
      v.union(
        v.literal("sedentary"),
        v.literal("light"),
        v.literal("moderate"),
        v.literal("active"),
        v.literal("veryActive"),
      ),
    ),
    profileGoalDirection: v.optional(
      v.union(v.literal("lose"), v.literal("maintain"), v.literal("gain")),
    ),
    macroTolerancePct: v.optional(v.number()),
    targetKcal: v.optional(v.number()),
    targetProtein: v.optional(v.number()),
    targetCarbs: v.optional(v.number()),
    targetFat: v.optional(v.number()),
    dietPreference: v.optional(dietPreferenceValidator),
    excludeBeef: v.optional(v.boolean()),
    excludePork: v.optional(v.boolean()),
    excludeSeafood: v.optional(v.boolean()),
    excludeDairy: v.optional(v.boolean()),
    excludeEggs: v.optional(v.boolean()),
    excludeGluten: v.optional(v.boolean()),
    excludeNuts: v.optional(v.boolean()),
    preferenceNotes: v.optional(v.string()),
  })
    .index("by_familyId", ["familyId"])
    .index("by_betterAuthUserId", ["betterAuthUserId"])
    .index("by_familyId_and_betterAuthUserId", ["familyId", "betterAuthUserId"]),

  familyCategoryOverrides: defineTable({
    familyId: v.id("families"),
    storeId: v.optional(v.id("stores")),
    normalizedItemName: v.string(),
    category: v.string(),
    updatedByUserId: v.string(),
    updatedAt: v.number(),
  }).index("by_family_store_and_name", [
    "familyId",
    "storeId",
    "normalizedItemName",
  ]),

  groceryItems: defineTable({
    familyId: v.id("families"),
    name: v.string(),
    category: v.string(),
    storeId: v.optional(v.id("stores")),
    isCompleted: v.boolean(),
    addedAt: v.number(),
  })
    .index("by_familyId", ["familyId"])
    .index("by_category", ["category"])
    .index("by_store", ["storeId"])
    .index("by_store_and_category", ["storeId", "category"])
    .index("by_store_and_isCompleted", ["storeId", "isCompleted"])
    .index("by_family_store", ["familyId", "storeId"])
    .index("by_family_store_and_category", ["familyId", "storeId", "category"])
    .index("by_family_store_and_isCompleted", [
      "familyId",
      "storeId",
      "isCompleted",
    ]),

  categories: defineTable({
    familyId: v.id("families"),
    name: v.string(),
    storeId: v.optional(v.id("stores")),
    order: v.number(),
    color: v.string(),
  })
    .index("by_familyId", ["familyId"])
    .index("by_order", ["order"])
    .index("by_store", ["storeId"])
    .index("by_store_and_order", ["storeId", "order"])
    .index("by_family_store", ["familyId", "storeId"])
    .index("by_family_store_and_order", ["familyId", "storeId", "order"]),

  stores: defineTable({
    familyId: v.id("families"),
    name: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_isDefault", ["isDefault"])
    .index("by_familyId", ["familyId"])
    .index("by_familyId_and_isDefault", ["familyId", "isDefault"]),

  recipes: defineTable({
    familyId: v.id("families"),
    name: v.string(),
    description: v.string(),
    servings: v.number(),
    instructions: v.array(v.string()),
    currentVersionNumber: v.optional(v.number()),
    latestVersionNumber: v.optional(v.number()),
    mealTags: v.optional(
      v.array(
        mealTagValidator
      )
    ),
  })
    .index("by_familyId", ["familyId"])
    .searchIndex("search_name", { searchField: "name" }),

  recipeVersions: defineTable({
    familyId: v.id("families"),
    recipeId: v.id("recipes"),
    versionNumber: v.number(),
    prompt: v.optional(v.string()),
    createdAt: v.number(),
    snapshot: recipeVersionSnapshotValidator,
  })
    .index("by_familyId", ["familyId"])
    .index("by_recipeId", ["recipeId"])
    .index("by_recipeId_and_versionNumber", ["recipeId", "versionNumber"]),

  recipeParts: defineTable({
    familyId: v.id("families"),
    recipeId: v.id("recipes"),
    name: v.string(),
    position: v.number(),
    scale: v.number(),
    yieldAmount: v.optional(v.number()),
    yieldUnit: v.optional(v.string()),
      instructions: v.array(v.string()),
  })
    .index("by_familyId", ["familyId"])
    .index("by_recipeId", ["recipeId"])
    .index("by_recipeId_and_position", ["recipeId", "position"]),

  recipeIngredients: defineTable(
    v.union(
      v.object({
        familyId: v.id("families"),
        recipeId: v.id("recipes"),
        partId: v.id("recipeParts"),
        sourcePartId: v.optional(v.id("recipeParts")),
        usedAmount: v.optional(v.number()),
        usedUnit: v.optional(v.string()),
        name: v.string(),
        amount: v.number(),
        unit: v.string(),
        kcalPer100: v.number(),
        proteinPer100: v.number(),
        carbsPer100: v.number(),
        fatPer100: v.number(),
      }),
      v.object({
        familyId: v.id("families"),
        recipeId: v.id("recipes"),
        partId: v.id("recipeParts"),
        sourcePartId: v.optional(v.id("recipeParts")),
        usedAmount: v.optional(v.number()),
        usedUnit: v.optional(v.string()),
        name: v.string(),
        amount: v.number(),
        unit: v.string(),
        kcalPerUnit: v.number(),
        proteinPerUnit: v.number(),
        carbsPerUnit: v.number(),
        fatPerUnit: v.number(),
      }),
    ),
  )
    .index("by_familyId", ["familyId"])
    .index("by_recipeId", ["recipeId"])
    .index("by_recipeId_and_partId", ["recipeId", "partId"])
    .index("by_sourcePartId", ["sourcePartId"]),

  mealPlans: defineTable({
    familyId: v.id("families"),
    date: v.string(),
    mealType: v.string(),
    recipeId: v.id("recipes"),
    servings: v.number(),
  })
    .index("by_familyId", ["familyId"])
    .index("by_date", ["date"])
    .index("by_date_and_mealType", ["date", "mealType"])
    .index("by_family_date", ["familyId", "date"])
    .index("by_family_date_and_mealType", ["familyId", "date", "mealType"]),
};

export default defineSchema({
  ...applicationTables,
});
