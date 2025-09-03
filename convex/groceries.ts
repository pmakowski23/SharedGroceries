import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Query to get current user's store and grocery list
export const getGroceryList = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's current store
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    let currentStore;
    if (userSettings) {
      currentStore = await ctx.db.get(userSettings.currentStoreId);
    }

    // If no current store, get default store
    if (!currentStore) {
      currentStore = await ctx.db
        .query("stores")
        .filter((q) => q.eq(q.field("isDefault"), true))
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
    
    // Group items by category
    const itemsByCategory = items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    return {
      currentStore,
      categories,
      itemsByCategory,
    };
  },
});

// Mutation to initialize user with default store
export const initializeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user already has settings
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (userSettings) {
      return; // User already initialized
    }

    // Get or create default store
    let defaultStore = await ctx.db
      .query("stores")
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (!defaultStore) {
      // Create default store
      const storeId = await ctx.db.insert("stores", {
        name: "Default Store",
        isDefault: true,
        createdAt: Date.now(),
      });
      defaultStore = await ctx.db.get(storeId);

      // Create default categories for the store
      await createDefaultCategories(ctx, storeId);
    }

    // Set as user's current store
    await ctx.db.insert("userSettings", {
      userId,
      currentStoreId: defaultStore!._id,
    });
  },
});

// Query to get all stores
export const getStores = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.query("stores").collect();
  },
});

// Query to get categories for a specific store
export const getCategoriesForStore = query({
  args: {
    storeId: v.id("stores"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (userSettings) {
      await ctx.db.patch(userSettings._id, {
        currentStoreId: args.storeId,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        currentStoreId: args.storeId,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get current store
    const groceryData = await ctx.runQuery(api.groceries.getGroceryList);
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
      baseURL: process.env.CONVEX_OPENAI_BASE_URL,
      apiKey: process.env.CONVEX_OPENAI_API_KEY,
    });

    // Get categories for current store
    const categories = groceryData.categories.map((cat: any) => cat.name);

    for (const item of items) {
      const prompt = `Categorize this grocery item for "${currentStore.name}" into one of these categories:

${categories.join('\n')}

Item: "${item.name}"

Respond with just the category name, nothing else.`;

      try {
        const response = await client.chat.completions.create({
          model: "gpt-4.1-nano",
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
        "#EF4444", "#F97316", "#EAB308", "#22C55E", 
        "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899"
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.delete(args.itemId);
  },
});

// Mutation to reorder categories
export const reorderCategories = mutation({
  args: {
    categoryIds: v.array(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Initialize user if needed
    await ctx.runMutation(api.groceries.initializeUser);

    // Get current store and its categories
    const groceryData: any = await ctx.runQuery(api.groceries.getGroceryList);
    if (!groceryData.currentStore) {
      throw new Error("No current store found");
    }

    const currentStore: any = groceryData.currentStore;
    const categories: string[] = groceryData.categories.map((cat: any) => cat.name);

    try {
      const openai = await import("openai");
      const client = new openai.default({
        baseURL: process.env.CONVEX_OPENAI_BASE_URL,
        apiKey: process.env.CONVEX_OPENAI_API_KEY,
      });

      const prompt: string = `Categorize this grocery item for "${currentStore.name}" into one of these categories:

${categories.join('\n')}

Item: "${args.itemName}"

Respond with just the category name, nothing else.`;

      const response: any = await client.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.1,
      });

      const category: string = response.choices[0]?.message?.content?.trim() || categories[0] || "Uncategorized";
      
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
