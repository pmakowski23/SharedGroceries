import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { groceryItemPrompt } from "./prompts";
import { Id } from "./_generated/dataModel";
import { Mistral } from "@mistralai/mistralai";
import { nowEpochMs } from "./lib/time";
import { requireViewer } from "./families";
import { env } from "./env";
import {
  createDefaultCategories,
  normalizeOverrideItemName,
} from "./lib/groceryTaxonomy";

const model = "mistral-small-latest";

function createMistralClient() {
  return new Mistral({ apiKey: env.MISTRAL_API_KEY });
}

function extractTextFromMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((chunk) => {
      if (
        chunk &&
        typeof chunk === "object" &&
        (chunk as { type?: unknown }).type === "text" &&
        typeof (chunk as { text?: unknown }).text === "string"
      ) {
        return (chunk as { text: string }).text;
      }
      return "";
    })
    .join(" ")
    .trim();
}

function buildCategoryResponseFormat(categories: string[]) {
  return {
    type: "json_schema" as const,
    jsonSchema: {
      name: "grocery_category",
      description:
        "Categorize a grocery item using exactly one of the allowed categories.",
      strict: true,
      schemaDefinition: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: {
            type: "string",
            enum: categories,
          },
        },
        required: ["category"],
      },
    },
  };
}

function extractCategoryFromStructuredResponse(
  content: unknown,
  categories: string[],
): string | null {
  const responseText = extractTextFromMessageContent(content);
  if (!responseText) {
    return null;
  }

  try {
    const parsed = JSON.parse(responseText) as { category?: unknown };
    if (typeof parsed.category !== "string") {
      return null;
    }

    const category = parsed.category.trim();
    return categories.includes(category) ? category : null;
  } catch {
    return null;
  }
}

async function getCurrentStoreForFamily(
  ctx: any,
  familyId: Id<"families">,
  currentStoreId?: Id<"stores">,
) {
  const currentStore = currentStoreId ? await ctx.db.get(currentStoreId) : null;
  if (currentStore?.familyId === familyId) {
    return currentStore;
  }

  const defaultStore = await ctx.db
    .query("stores")
    .withIndex("by_familyId_and_isDefault", (q: any) =>
      q.eq("familyId", familyId).eq("isDefault", true),
    )
    .first();
  if (defaultStore) {
    return defaultStore;
  }

  return await ctx.db
    .query("stores")
    .withIndex("by_familyId", (q: any) => q.eq("familyId", familyId))
    .first();
}

async function requireStoreForFamily(
  ctx: any,
  familyId: Id<"families">,
  storeId: Id<"stores">,
) {
  const store = await ctx.db.get(storeId);
  if (!store || store.familyId !== familyId) {
    throw new Error("Store not found");
  }
  return store;
}

async function requireItemForFamily(
  ctx: any,
  familyId: Id<"families">,
  itemId: Id<"groceryItems">,
) {
  const item = await ctx.db.get(itemId);
  if (!item || item.familyId !== familyId) {
    throw new Error("Item not found");
  }
  return item;
}

async function ensureCategory(
  ctx: any,
  familyId: Id<"families">,
  storeId: Id<"stores">,
  categoryName: string,
) {
  const trimmedCategory = categoryName.trim();
  const existingCategory = await ctx.db
    .query("categories")
    .withIndex("by_family_store", (q: any) =>
      q.eq("familyId", familyId).eq("storeId", storeId),
    )
    .collect();

  const exactMatch = existingCategory.find(
    (category: any) => category.name === trimmedCategory,
  );
  if (exactMatch) {
    return exactMatch;
  }

  const colors = [
    "#EF4444",
    "#F97316",
    "#EAB308",
    "#22C55E",
    "#06B6D4",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
  ];

  const categoryId = await ctx.db.insert("categories", {
    familyId,
    name: trimmedCategory,
    storeId,
    order: existingCategory.length,
    color: colors[existingCategory.length % colors.length],
  });

  return (await ctx.db.get(categoryId))!;
}

async function ensureUncategorizedCategory(
  ctx: any,
  familyId: Id<"families">,
  storeId: Id<"stores">,
) {
  return await ensureCategory(ctx, familyId, storeId, "Uncategorized");
}

async function upsertCategoryOverride(args: {
  ctx: any;
  familyId: Id<"families">;
  storeId?: Id<"stores">;
  normalizedItemName: string;
  category: string;
  updatedByUserId: string;
}) {
  const existing = await args.ctx.db
    .query("familyCategoryOverrides")
    .withIndex("by_family_store_and_name", (q: any) =>
      q
        .eq("familyId", args.familyId)
        .eq("storeId", args.storeId)
        .eq("normalizedItemName", args.normalizedItemName),
    )
    .first();

  if (existing) {
    await args.ctx.db.patch(existing._id, {
      category: args.category,
      updatedAt: nowEpochMs(),
      updatedByUserId: args.updatedByUserId,
    });
    return;
  }

  await args.ctx.db.insert("familyCategoryOverrides", {
    familyId: args.familyId,
    storeId: args.storeId,
    normalizedItemName: args.normalizedItemName,
    category: args.category,
    updatedByUserId: args.updatedByUserId,
    updatedAt: nowEpochMs(),
  });
}

export const getGroceryList = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    const currentStore = await getCurrentStoreForFamily(
      ctx,
      viewer.family._id,
      viewer.family.currentStoreId,
    );

    if (!currentStore) {
      return {
        currentStore: null,
        categories: [],
        itemsByCategory: {},
      };
    }

    const items = await ctx.db
      .query("groceryItems")
      .withIndex("by_family_store", (q) =>
        q.eq("familyId", viewer.family._id).eq("storeId", currentStore._id),
      )
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_family_store_and_order", (q) =>
        q.eq("familyId", viewer.family._id).eq("storeId", currentStore._id),
      )
      .collect();

    const itemsByCategory = items.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<string, typeof items>,
    );

    return {
      currentStore,
      categories,
      itemsByCategory,
    };
  },
});

export const getStores = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireViewer(ctx);
    return await ctx.db
      .query("stores")
      .withIndex("by_familyId", (q) => q.eq("familyId", viewer.family._id))
      .collect();
  },
});

export const getCategoriesForStore = query({
  args: {
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireStoreForFamily(ctx, viewer.family._id, args.storeId);
    return await ctx.db
      .query("categories")
      .withIndex("by_family_store_and_order", (q) =>
        q.eq("familyId", viewer.family._id).eq("storeId", args.storeId),
      )
      .collect();
  },
});

export const createStore = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const storeId = await ctx.db.insert("stores", {
      familyId: viewer.family._id,
      name: args.name,
      isDefault: false,
      createdAt: nowEpochMs(),
    });

    await createDefaultCategories(ctx, storeId, viewer.family._id);

    if (!viewer.family.currentStoreId) {
      await ctx.db.patch(viewer.family._id, {
        currentStoreId: storeId,
      });
    }

    return storeId;
  },
});

export const switchStore = mutation({
  args: {
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireStoreForFamily(ctx, viewer.family._id, args.storeId);
    await ctx.db.patch(viewer.family._id, {
      currentStoreId: args.storeId,
    });
  },
});

export const updateCategory = mutation({
  args: {
    storeId: v.id("stores"),
    categoryId: v.optional(v.id("categories")),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireStoreForFamily(ctx, viewer.family._id, args.storeId);

    if (args.categoryId) {
      const existingCategory = await ctx.db.get(args.categoryId);
      if (
        !existingCategory ||
        existingCategory.familyId !== viewer.family._id ||
        existingCategory.storeId !== args.storeId
      ) {
        throw new Error("Category not found");
      }

      if (existingCategory.name !== args.name) {
        const items = await ctx.db
          .query("groceryItems")
          .withIndex("by_family_store_and_category", (q) =>
            q
              .eq("familyId", viewer.family._id)
              .eq("storeId", args.storeId)
              .eq("category", existingCategory.name),
          )
          .collect();
        for (const item of items) {
          await ctx.db.patch(item._id, {
            category: args.name,
          });
        }

        const overrides = await ctx.db.query("familyCategoryOverrides").collect();
        for (const override of overrides) {
          if (
            override.familyId === viewer.family._id &&
            override.storeId === args.storeId &&
            override.category === existingCategory.name
          ) {
            await ctx.db.patch(override._id, {
              category: args.name,
              updatedAt: nowEpochMs(),
            });
          }
        }
      }

      await ctx.db.patch(args.categoryId, {
        name: args.name,
        color: args.color,
      });
      return args.categoryId;
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_family_store", (q) =>
        q.eq("familyId", viewer.family._id).eq("storeId", args.storeId),
      )
      .collect();

    return await ctx.db.insert("categories", {
      familyId: viewer.family._id,
      name: args.name,
      storeId: args.storeId,
      order: categories.length,
      color: args.color,
    });
  },
});

export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.familyId !== viewer.family._id || !category.storeId) {
      throw new Error("Category not found");
    }

    const uncategorized = await ensureUncategorizedCategory(
      ctx,
      viewer.family._id,
      category.storeId,
    );

    const items = await ctx.db
      .query("groceryItems")
      .withIndex("by_family_store_and_category", (q) =>
        q
          .eq("familyId", viewer.family._id)
          .eq("storeId", category.storeId)
          .eq("category", category.name),
      )
      .collect();

    for (const item of items) {
      await ctx.db.patch(item._id, {
        category: uncategorized.name,
      });
    }

    await ctx.db.delete(args.categoryId);
  },
});

export const recategorizeAllItems = action({
  args: {},
  handler: async (ctx) => {
    const viewer = await ctx.runQuery(api.families.getViewerRuntimeContext, {});
    if (!viewer.currentStoreId) {
      throw new Error("No current store found");
    }

    const currentStore = await ctx.runQuery(api.groceries.getGroceryList, {});
    if (!currentStore.currentStore) {
      throw new Error("No current store found");
    }

    const items = await ctx.runQuery(api.groceries.getItemsForStore, {
      storeId: viewer.currentStoreId,
    });

    const client = createMistralClient();
    const categories = currentStore.categories.map(
      (category: { name: string }) => category.name,
    );
    if (categories.length === 0) {
      return null;
    }
    const responseFormat = buildCategoryResponseFormat(categories);

    for (const item of items) {
      const normalizedName = normalizeOverrideItemName(item.name);
      const override = await ctx.runQuery(api.groceries.getCategoryOverride, {
        storeId: viewer.currentStoreId,
        normalizedItemName: normalizedName,
      });
      if (override) {
        await ctx.runMutation(api.groceries.updateItemCategory, {
          itemId: item._id,
          category: override.category,
          persistOverride: false,
        });
        continue;
      }

      const prompt = groceryItemPrompt(
        currentStore.currentStore.name,
        categories,
        item.name,
      );

      try {
        const response = await client.chat.complete({
          model,
          messages: [{ role: "user", content: prompt }],
          maxTokens: 50,
          temperature: 0.1,
          responseFormat,
        });
        const category = extractCategoryFromStructuredResponse(
          response.choices[0]?.message?.content,
          categories,
        );
        if (category) {
          await ctx.runMutation(api.groceries.updateItemCategory, {
            itemId: item._id,
            category,
            persistOverride: false,
          });
        }
      } catch (error) {
        console.error(`Failed to recategorize item ${item.name}:`, error);
      }
    }

    return null;
  },
});

export const getItemsForStore = query({
  args: {
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireStoreForFamily(ctx, viewer.family._id, args.storeId);
    return await ctx.db
      .query("groceryItems")
      .withIndex("by_family_store", (q) =>
        q.eq("familyId", viewer.family._id).eq("storeId", args.storeId),
      )
      .collect();
  },
});

export const getCategoryOverride = query({
  args: {
    storeId: v.optional(v.id("stores")),
    normalizedItemName: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      category: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const override = await ctx.db
      .query("familyCategoryOverrides")
      .withIndex("by_family_store_and_name", (q) =>
        q
          .eq("familyId", viewer.family._id)
          .eq("storeId", args.storeId)
          .eq("normalizedItemName", args.normalizedItemName),
      )
      .first();

    if (!override) {
      return null;
    }

    return {
      category: override.category,
    };
  },
});

export const updateItemCategory = mutation({
  args: {
    itemId: v.id("groceryItems"),
    category: v.string(),
    persistOverride: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const item = await requireItemForFamily(ctx, viewer.family._id, args.itemId);
    await ensureCategory(ctx, viewer.family._id, item.storeId!, args.category);

    await ctx.db.patch(args.itemId, {
      category: args.category,
    });

    if (args.persistOverride) {
      await upsertCategoryOverride({
        ctx,
        familyId: viewer.family._id,
        storeId: item.storeId,
        normalizedItemName: normalizeOverrideItemName(item.name),
        category: args.category,
        updatedByUserId: viewer.authUser._id,
      });
    }
  },
});

export const addGroceryItem = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireStoreForFamily(ctx, viewer.family._id, args.storeId);
    await ensureCategory(ctx, viewer.family._id, args.storeId, args.category);

    return await ctx.db.insert("groceryItems", {
      familyId: viewer.family._id,
      name: args.name,
      category: args.category,
      storeId: args.storeId,
      isCompleted: false,
      addedAt: nowEpochMs(),
    });
  },
});

export const toggleItemCompletion = mutation({
  args: {
    itemId: v.id("groceryItems"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const item = await requireItemForFamily(ctx, viewer.family._id, args.itemId);
    await ctx.db.patch(args.itemId, {
      isCompleted: !item.isCompleted,
    });
  },
});

export const deleteItem = mutation({
  args: {
    itemId: v.id("groceryItems"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireItemForFamily(ctx, viewer.family._id, args.itemId);
    await ctx.db.delete(args.itemId);
  },
});

export const clearCompletedForStore = mutation({
  args: {
    storeId: v.id("stores"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await requireStoreForFamily(ctx, viewer.family._id, args.storeId);

    const completedItems = await ctx.db
      .query("groceryItems")
      .withIndex("by_family_store_and_isCompleted", (q) =>
        q
          .eq("familyId", viewer.family._id)
          .eq("storeId", args.storeId)
          .eq("isCompleted", true),
      )
      .collect();

    for (const item of completedItems) {
      await ctx.db.delete(item._id);
    }

    return null;
  },
});

export const reorderCategories = mutation({
  args: {
    categoryIds: v.array(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const categories = await Promise.all(
      args.categoryIds.map(async (categoryId) => await ctx.db.get(categoryId)),
    );
    const validCategories = categories.filter(
      (category): category is NonNullable<typeof category> => category !== null,
    );
    if (
      validCategories.length !== args.categoryIds.length ||
      validCategories.some((category) => category.familyId !== viewer.family._id)
    ) {
      throw new Error("Category not found");
    }

    for (let i = 0; i < args.categoryIds.length; i += 1) {
      await ctx.db.patch(args.categoryIds[i], {
        order: i,
      });
    }
  },
});

export const categorizeItem = action({
  args: {
    itemName: v.string(),
    debug: v.optional(v.boolean()),
  },
  returns: v.union(
    v.string(),
    v.object({
      category: v.string(),
      prompt: v.string(),
      responseText: v.optional(v.string()),
      error: v.optional(v.string()),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<
    | string
    | {
        category: string;
        prompt: string;
        responseText?: string;
        error?: string;
      }
  > => {
    await ctx.runMutation(api.families.initializeCurrentUser, {});
    const viewer: {
      currentStoreId: Id<"stores"> | null;
    } = await ctx.runQuery(api.families.getViewerRuntimeContext, {});
    if (!viewer.currentStoreId) {
      throw new Error("No current store found");
    }

    const groceryData: {
      currentStore: { name: string } | null;
      categories: Array<{ name: string }>;
    } = await ctx.runQuery(api.groceries.getGroceryList, {});
    if (!groceryData.currentStore) {
      throw new Error("No current store found");
    }

    const categories = groceryData.categories.map(
      (category: { name: string }) => category.name,
    );
    const allowedCategories: string[] =
      categories.length > 0 ? categories : ["Uncategorized"];
    const normalizedItemName = normalizeOverrideItemName(args.itemName);

    const override: { category: string } | null = await ctx.runQuery(
      api.groceries.getCategoryOverride,
      {
        storeId: viewer.currentStoreId,
        normalizedItemName,
      },
    );
    if (override) {
      await ctx.runMutation(api.groceries.addGroceryItem, {
        name: args.itemName,
        category: override.category,
        storeId: viewer.currentStoreId,
      });
      return args.debug
        ? {
            category: override.category,
            prompt: "category override",
          }
        : override.category;
    }

    try {
      const client = createMistralClient();
      const responseFormat = buildCategoryResponseFormat(allowedCategories);
      const prompt = groceryItemPrompt(
        groceryData.currentStore.name,
        allowedCategories,
        args.itemName,
      );

      const response = await client.chat.complete({
        model,
        messages: [{ role: "user", content: prompt }],
        maxTokens: 50,
        temperature: 0.1,
        responseFormat,
      });
      const responseText = extractTextFromMessageContent(
        response.choices[0]?.message?.content,
      );

      const category: string =
        extractCategoryFromStructuredResponse(
          response.choices[0]?.message?.content,
          allowedCategories,
        ) ||
        allowedCategories[0];

      await ctx.runMutation(api.groceries.addGroceryItem, {
        name: args.itemName,
        category,
        storeId: viewer.currentStoreId,
      });

      if (args.debug) {
        return {
          category,
          prompt,
          responseText,
        };
      }
      return category;
    } catch (error) {
      console.error("AI categorization failed:", error);
      const fallbackCategory = allowedCategories[0];
      const prompt = groceryItemPrompt(
        groceryData.currentStore.name,
        allowedCategories,
        args.itemName,
      );

      await ctx.runMutation(api.groceries.addGroceryItem, {
        name: args.itemName,
        category: fallbackCategory,
        storeId: viewer.currentStoreId,
      });

      if (args.debug) {
        return {
          category: fallbackCategory,
          prompt,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      return fallbackCategory;
    }
  },
});
