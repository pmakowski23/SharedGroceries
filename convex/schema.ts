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
    .index("by_store_and_category", ["storeId", "category"]),

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
  }),
};

export default defineSchema({
  ...applicationTables,
});
