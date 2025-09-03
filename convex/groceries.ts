import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Query to get current user's store and grocery list
export const getGroceryList = query({
  args: {},
  handler: async (ctx) => {
    // Load global app settings
    const settings = await ctx.db.query("appSettings").first();

    let currentStore = settings?.currentStoreId
      ? await ctx.db.get(settings.currentStoreId)
      : null;

    // If no current store, get default store
    if (!currentStore) {
      currentStore = await ctx.db
        .query("stores")
        .withIndex("by_isDefault", (q) => q.eq("isDefault", true))
        .first();

      // If still no store, return empty state - store will be created by mutation
      if (!currentStore) {
        return {
          currentStore: null,
          categories: [],
          itemsByCategory: {},
        };
      }
    }

    const items = await ctx.db
      .query("groceryItems")
      .withIndex("by_store", (q) => q.eq("storeId", currentStore._id))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_store_and_order", (q) => q.eq("storeId", currentStore._id))
      .collect();

    const itemsByCategory = items.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<string, typeof items>
    );

    return {
      currentStore,
      categories,
      itemsByCategory,
    };
  },
});

// Mutation to initialize user with default store
export const initializeApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Ensure default store exists
    let defaultStore = await ctx.db
      .query("stores")
      .withIndex("by_isDefault", (q) => q.eq("isDefault", true))
      .first();

    if (!defaultStore) {
      const storeId = await ctx.db.insert("stores", {
        name: "Default Store",
        isDefault: true,
        createdAt: Date.now(),
      });
      defaultStore = await ctx.db.get(storeId);
      await createDefaultCategories(ctx, storeId);
    }

    // Ensure app settings doc exists
    const settings = await ctx.db.query("appSettings").first();
    if (!settings) {
      await ctx.db.insert("appSettings", {
        password: undefined,
        currentStoreId: defaultStore!._id,
      });
      return;
    }

    // Ensure currentStoreId set
    if (!settings.currentStoreId) {
      await ctx.db.patch(settings._id, {
        currentStoreId: defaultStore!._id,
      });
    }
  },
});

// Query to get all stores
export const getStores = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stores").collect();
  },
});

// Query to get categories for a specific store
export const getCategoriesForStore = query({
  args: {
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_store_and_order", (q) => q.eq("storeId", args.storeId))
      .collect();
  },
});

// Mutation to create a new store
export const createStore = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const storeId = await ctx.db.insert("stores", {
      name: args.name,
      isDefault: false,
      createdAt: Date.now(),
    });

    // Create default categories for the new store
    await createDefaultCategories(ctx, storeId);

    return storeId;
  },
});

// Mutation to switch current store
export const switchStore = mutation({
  args: {
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("appSettings").first();
    if (settings) {
      await ctx.db.patch(settings._id, { currentStoreId: args.storeId });
    } else {
      await ctx.db.insert("appSettings", {
        currentStoreId: args.storeId,
        password: undefined,
      });
    }
  },
});

// Mutation to add/update a category
export const updateCategory = mutation({
  args: {
    storeId: v.id("stores"),
    categoryId: v.optional(v.id("categories")),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.categoryId) {
      // Update existing category
      await ctx.db.patch(args.categoryId, {
        name: args.name,
        color: args.color,
      });
      return args.categoryId;
    } else {
      // Create new category
      const categories = await ctx.db
        .query("categories")
        .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
        .collect();

      return await ctx.db.insert("categories", {
        name: args.name,
        storeId: args.storeId,
        order: categories.length,
        color: args.color,
      });
    }
  },
});

// Mutation to delete a category
export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Move items to "Uncategorized" category
    const items = await ctx.db
      .query("groceryItems")
      .withIndex("by_store_and_category", (q) =>
        q.eq("storeId", category.storeId).eq("category", category.name)
      )
      .collect();

    for (const item of items) {
      await ctx.db.patch(item._id, {
        category: "Uncategorized",
      });
    }

    // Ensure "Uncategorized" category exists
    const uncategorized = await ctx.db
      .query("categories")
      .withIndex("by_store", (q) => q.eq("storeId", category.storeId))
      .filter((q) => q.eq(q.field("name"), "Uncategorized"))
      .first();

    if (!uncategorized) {
      const categories = await ctx.db
        .query("categories")
        .withIndex("by_store", (q) => q.eq("storeId", category.storeId))
        .collect();

      await ctx.db.insert("categories", {
        name: "Uncategorized",
        storeId: category.storeId,
        order: categories.length,
        color: "#6B7280",
      });
    }

    await ctx.db.delete(args.categoryId);
  },
});

// Action to recategorize all items for current store
export const recategorizeAllItems = action({
  args: {},
  handler: async (ctx) => {
    // Get current store
    const groceryData = await ctx.runQuery(api.groceries.getGroceryList, {});
    if (!groceryData.currentStore) {
      throw new Error("No current store found");
    }

    const currentStore = groceryData.currentStore;

    // Get all items for current store
    const items = await ctx.runQuery(api.groceries.getItemsForStore, {
      storeId: currentStore._id,
    });

    const openai = await import("openai");
    const client = new openai.default({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.CONVEX_OPEN_ROUTER_API_KEY,
    });

    // Get categories for current store
    const categories = groceryData.categories.map((cat: any) => cat.name);

    for (const item of items) {
      const prompt = `Categorize this grocery item for "${currentStore.name}" into one of these categories:

${categories.join("\n")}

Item: "${item.name}"

Respond with just the category name, nothing else.`;

      try {
        const response = await client.chat.completions.create({
          model: "deepseek/deepseek-chat-v3.1:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 50,
          temperature: 0.1,
        });

        const category = response.choices[0]?.message?.content?.trim();

        if (category && categories.includes(category)) {
          await ctx.runMutation(api.groceries.updateItemCategory, {
            itemId: item._id,
            category,
          });
        }
      } catch (error) {
        console.error(`Failed to recategorize item ${item.name}:`, error);
      }
    }
  },
});

// Helper query to get items for a store
export const getItemsForStore = query({
  args: {
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("groceryItems")
      .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
      .collect();
  },
});

// Mutation to update item category
export const updateItemCategory = mutation({
  args: {
    itemId: v.id("groceryItems"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, {
      category: args.category,
    });
  },
});

// Mutation to add a new grocery item
export const addGroceryItem = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    // Check if category exists, if not create it
    const existingCategory = await ctx.db
      .query("categories")
      .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
      .filter((q) => q.eq(q.field("name"), args.category))
      .first();

    if (!existingCategory) {
      const categoryCount = await ctx.db
        .query("categories")
        .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
        .collect();

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

      await ctx.db.insert("categories", {
        name: args.category,
        storeId: args.storeId,
        order: categoryCount.length,
        color: colors[categoryCount.length % colors.length],
      });
    }

    return await ctx.db.insert("groceryItems", {
      name: args.name,
      category: args.category,
      storeId: args.storeId,
      isCompleted: false,
      addedAt: Date.now(),
    });
  },
});

// Mutation to toggle item completion
export const toggleItemCompletion = mutation({
  args: {
    itemId: v.id("groceryItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    return await ctx.db.patch(args.itemId, {
      isCompleted: !item.isCompleted,
    });
  },
});

// Mutation to delete an item
export const deleteItem = mutation({
  args: {
    itemId: v.id("groceryItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.itemId);
  },
});

// Mutation to reorder categories
export const reorderCategories = mutation({
  args: {
    categoryIds: v.array(v.id("categories")),
  },
  handler: async (ctx, args) => {
    for (let i = 0; i < args.categoryIds.length; i++) {
      await ctx.db.patch(args.categoryIds[i], {
        order: i,
      });
    }
  },
});

// Action to categorize item using AI
export const categorizeItem = action({
  args: {
    itemName: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Initialize app if needed
    await ctx.runMutation(api.groceries.initializeApp, {});

    // Get current store and its categories
    const groceryData = await ctx.runQuery(api.groceries.getGroceryList, {});
    if (!groceryData.currentStore) {
      throw new Error("No current store found");
    }

    const currentStore = groceryData.currentStore;
    const categories = groceryData.categories.map((cat) => cat.name);

    try {
      const openai = await import("openai");
      const client = new openai.default({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.CONVEX_OPEN_ROUTER_API_KEY,
      });

      const prompt: string = `Categorize this grocery item for "${currentStore.name}" into one of these categories:

${categories.join("\n")}

Item: "${args.itemName}"

Respond with just the category name, nothing else.`;

      const response: any = await client.chat.completions.create({
        model: "deepseek/deepseek-chat-v3.1:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.1,
      });

      const category: string =
        response.choices[0]?.message?.content?.trim() ||
        categories[0] ||
        "Uncategorized";

      // Add the item with the AI-determined category
      await ctx.runMutation(api.groceries.addGroceryItem, {
        name: args.itemName,
        category,
        storeId: currentStore._id,
      });

      return category;
    } catch (error) {
      console.error("AI categorization failed:", error);
      // Fallback to first category or "Uncategorized"
      const fallbackCategory: string = categories[0] || "Uncategorized";
      await ctx.runMutation(api.groceries.addGroceryItem, {
        name: args.itemName,
        category: fallbackCategory,
        storeId: currentStore._id,
      });
      return fallbackCategory;
    }
  },
});

// Helper function to create default categories
async function createDefaultCategories(ctx: any, storeId: any) {
  const defaultCategories = [
    { name: "Fruits & Vegetables", color: "#22C55E" },
    { name: "Meat & Fish", color: "#EF4444" },
    { name: "Dairy & Eggs", color: "#F97316" },
    { name: "Bread & Bakery", color: "#EAB308" },
    { name: "Frozen Foods", color: "#06B6D4" },
    { name: "Pantry & Canned", color: "#3B82F6" },
    { name: "Snacks & Sweets", color: "#8B5CF6" },
    { name: "Beverages", color: "#EC4899" },
    { name: "Household & Cleaning", color: "#6B7280" },
    { name: "Personal Care", color: "#10B981" },
  ];

  for (let i = 0; i < defaultCategories.length; i++) {
    await ctx.db.insert("categories", {
      name: defaultCategories[i].name,
      storeId,
      order: i,
      color: defaultCategories[i].color,
    });
  }
}

// Password management
export const isPasswordSet = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const settings = await ctx.db.query("appSettings").first();
    return !!(settings && settings.password && settings.password.length > 0);
  },
});

export const setAppPassword = mutation({
  args: { password: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("appSettings").first();
    if (settings && settings.password) {
      throw new Error("Password already set");
    }
    if (settings) {
      await ctx.db.patch(settings._id, { password: args.password });
    } else {
      await ctx.db.insert("appSettings", {
        password: args.password,
        currentStoreId: undefined,
      });
    }
    return null;
  },
});

export const verifyPassword = mutation({
  args: { password: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("appSettings").first();
    const expected = settings?.password ?? "";
    return expected.length > 0 && args.password === expected;
  },
});
