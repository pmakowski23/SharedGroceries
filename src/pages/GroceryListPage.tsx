import { CategoryListDnd } from "../components/CategoryListDnd";
import { StoreManager } from "../components/StoreManager";
import { AddItemForm } from "../components/AddItemForm";
import { Button } from "../components/ui/button";
import { useGroceryListViewModel } from "../hooks/useGroceryListViewModel";

export function GroceryListPage() {
  const {
    groceryData,
    showStoreManager,
    toggleStoreManager,
    categoriesWithItems,
    hasCompleted,
    clearCompletedForCurrentStore,
  } = useGroceryListViewModel();

  if (!groceryData?.currentStore) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold">Groceries</h1>
        <div className="flex items-center gap-2">
          {groceryData.currentStore && hasCompleted && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear completed"
              onClick={clearCompletedForCurrentStore}
              className="text-destructive hover:text-destructive"
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
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleStoreManager}
            title="List Settings"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
      </div>
      {groceryData.currentStore && (
        <div className="mb-4 text-sm text-muted-foreground">
          Active list: <span className="font-medium">{groceryData.currentStore.name}</span>
        </div>
      )}

      {showStoreManager && (
        <StoreManager
          currentStore={groceryData.currentStore}
          categories={groceryData.categories}
        />
      )}

      <AddItemForm />

      <CategoryListDnd
        categories={groceryData.categories}
        categoriesWithItems={categoriesWithItems}
        itemsByCategory={groceryData.itemsByCategory}
      />

      {categoriesWithItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="mb-2 text-lg font-semibold">
            Your grocery list is empty
          </h3>
          <p className="text-muted-foreground">
            Add your first item above to get started!
          </p>
        </div>
      )}
    </div>
  );
}
