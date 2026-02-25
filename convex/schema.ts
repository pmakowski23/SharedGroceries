import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  groceryItems: defineTable({
    name: v.string(),
    category: v.string(),
    storeId: v.optional(v.id("stores")),
    isCompleted: v.boolean(),
    addedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_store", ["storeId"])
    .index("by_store_and_category", ["storeId", "category"])
    .index("by_store_and_isCompleted", ["storeId", "isCompleted"]),

  categories: defineTable({
    name: v.string(),
    storeId: v.optional(v.id("stores")),
    order: v.number(),
    color: v.string(),
  })
    .index("by_order", ["order"])
    .index("by_store", ["storeId"])
    .index("by_store_and_order", ["storeId", "order"]),

  stores: defineTable({
    name: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  }).index("by_isDefault", ["isDefault"]),

  appSettings: defineTable({
    password: v.optional(v.string()),
    currentStoreId: v.optional(v.id("stores")),
    selectedModel: v.optional(v.string()),
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
        v.literal("veryActive")
      )
    ),
    profileGoalDirection: v.optional(
      v.union(v.literal("lose"), v.literal("maintain"), v.literal("gain"))
    ),
    macroTolerancePct: v.optional(v.number()),
    targetKcal: v.optional(v.number()),
    targetProtein: v.optional(v.number()),
    targetCarbs: v.optional(v.number()),
    targetFat: v.optional(v.number()),
  }),

  recipes: defineTable({
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
  }).searchIndex("search_name", { searchField: "name" }),

  recipeParts: defineTable({
    recipeId: v.id("recipes"),
    name: v.string(),
    position: v.number(),
    scale: v.number(),
    yieldAmount: v.optional(v.number()),
    yieldUnit: v.optional(v.string()),
    instructions: v.array(v.string()),
  })
    .index("by_recipeId", ["recipeId"])
    .index("by_recipeId_and_position", ["recipeId", "position"]),

  recipeIngredients: defineTable(
    v.union(
      v.object({
        recipeId: v.id("recipes"),
        partId: v.optional(v.id("recipeParts")),
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
        recipeId: v.id("recipes"),
        partId: v.optional(v.id("recipeParts")),
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
    .index("by_recipeId", ["recipeId"])
    .index("by_recipeId_and_partId", ["recipeId", "partId"])
    .index("by_sourcePartId", ["sourcePartId"]),

  mealPlans: defineTable({
    date: v.string(),
    mealType: v.string(),
    recipeId: v.id("recipes"),
    servings: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_date_and_mealType", ["date", "mealType"]),
};

export default defineSchema({
  ...applicationTables,
});
