import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { CategoryListDnd } from "./components/CategoryListDnd";
import { StoreManager } from "./components/StoreManager";
import { InitializationGate } from "./components/InitializationGate";
import { Header } from "./components/Header";
import { AddItemForm } from "./components/AddItemForm";

export default function App() {
  const groceryData = useQuery(api.groceries.getGroceryList, {});

  const [showStoreManager, setShowStoreManager] = useState(false);

  if (!groceryData || !groceryData.currentStore) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const categoriesWithItems = groceryData.categories.filter(
    (category) => (groceryData.itemsByCategory[category.name] || []).length > 0
  );

  return (
    <InitializationGate>
      <div className="min-h-screen bg-gray-50">
        <Header
          currentStore={groceryData.currentStore}
          onToggleStoreManager={() => setShowStoreManager(!showStoreManager)}
        />

        <div className="max-w-md mx-auto px-4 py-6">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Your grocery list is empty
              </h3>
              <p className="text-gray-500">
                Add your first item above to get started!
              </p>
            </div>
          )}
        </div>
      </div>
    </InitializationGate>
  );
}
