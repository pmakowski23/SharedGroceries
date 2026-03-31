import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useGroceryListViewModel() {
  const groceryData = useQuery(api.groceries.getGroceryList, {});
  const [showStoreManager, setShowStoreManager] = useState(false);

  const clearCompleted = useMutation(
    api.groceries.clearCompletedForStore,
  ).withOptimisticUpdate((store) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;
    const next = {
      ...data,
      itemsByCategory: Object.fromEntries(
        Object.entries(data.itemsByCategory).map(([key, arr]) => [
          key,
          arr.filter((it) => !it.isCompleted),
        ]),
      ),
    };
    store.setQuery(api.groceries.getGroceryList, {}, next);
  });

  const categoriesWithItems = groceryData?.categories ?? [];

  const hasCompleted = Object.values(groceryData?.itemsByCategory ?? {}).some(
    (arr) => arr.some((it) => it.isCompleted),
  );
  const hasItems = Object.values(groceryData?.itemsByCategory ?? {}).some(
    (arr) => arr.length > 0,
  );

  const clearCompletedForCurrentStore = () => {
    const storeId = groceryData?.currentStore?._id;
    if (!storeId) return;
    void clearCompleted({ storeId: storeId as Id<"stores"> });
  };

  return {
    groceryData,
    showStoreManager,
    toggleStoreManager: () => setShowStoreManager((prev) => !prev),
    categoriesWithItems,
    hasCompleted,
    hasItems,
    clearCompletedForCurrentStore,
  };
}
