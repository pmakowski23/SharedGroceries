import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const DEFAULT_CATEGORY_DEFINITIONS = [
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
] as const;

export function normalizeOverrideItemName(name: string) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function createDefaultCategories(
  ctx: MutationCtx,
  storeId: Id<"stores">,
  familyId: Id<"families">,
) {
  for (let i = 0; i < DEFAULT_CATEGORY_DEFINITIONS.length; i += 1) {
    const category = DEFAULT_CATEGORY_DEFINITIONS[i];
    await ctx.db.insert("categories", {
      familyId,
      name: category.name,
      storeId,
      order: i,
      color: category.color,
    });
  }
}
