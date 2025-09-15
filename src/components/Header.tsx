import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";

export function Header({
  currentStore,
  onToggleStoreManager,
}: {
  currentStore?: { _id?: string; name: string } | null;
  onToggleStoreManager: () => void;
}) {
  const groceryData = useQuery(api.groceries.getGroceryList, {});
  const clearCompleted = useMutation(
    api.groceries.clearCompletedForStore
  ).withOptimisticUpdate((store) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;
    const next = {
      ...data,
      itemsByCategory: Object.fromEntries(
        Object.entries(data.itemsByCategory).map(([key, arr]) => [
          key,
          arr.filter((it) => !it.isCompleted),
        ])
      ),
    };
    store.setQuery(api.groceries.getGroceryList, {}, next);
  });

  const hasCompleted =
    !!groceryData &&
    Object.values(groceryData.itemsByCategory).some((arr) =>
      arr.some((it) => it.isCompleted)
    );

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🛒 Grocery Lists</h1>
          <div className="flex items-center gap-2">
            {currentStore && hasCompleted && (
              <button
                aria-label="Clear completed"
                onClick={() =>
                  currentStore?._id &&
                  void clearCompleted({
                    storeId: currentStore._id as Id<"stores">,
                  })
                }
                className="text-red-600 hover:text-red-700 p-2"
                title="Clear completed"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path d="M3 6h18" strokeLinecap="round" />
                  <path
                    d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M10 10v8M14 10v8" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              onClick={onToggleStoreManager}
              className="text-gray-600 hover:text-gray-800 p-2"
              title="List Settings"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>
        </div>
        {currentStore && (
          <div className="text-sm text-gray-600 mt-1">
            Active list:{" "}
            <span className="font-medium">{currentStore.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
