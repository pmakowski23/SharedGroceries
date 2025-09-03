import { useEffect, useState } from "react";
import { useMutation, useQuery, useAction, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Id, Doc } from "../convex/_generated/dataModel";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { useAuthActions } from "@convex-dev/auth/react";
import { SortableCategory } from "./components/SortableCategory";
import { StoreManager } from "./components/StoreManager";
import { CategoryManager } from "./components/CategoryManager";

type GroceryData = {
  currentStore: Doc<"stores"> | null;
  categories: Array<Doc<"categories">>;
  itemsByCategory: Record<string, Array<Doc<"groceryItems">>>;
};

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();

  // Auto sign in anonymously on first load if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void signIn("anonymous");
    }
  }, [isAuthenticated, isLoading, signIn]);

  const groceryData: GroceryData | undefined = useQuery(
    api.groceries.getGroceryList,
    isAuthenticated ? {} : undefined
  );
  const stores: Array<Doc<"stores">> | undefined = useQuery(
    api.groceries.getStores,
    isAuthenticated ? {} : undefined
  );
  const categorizeItem = useAction(api.groceries.categorizeItem);
  const toggleCompletion = useMutation(api.groceries.toggleItemCompletion);
  const deleteItem = useMutation(api.groceries.deleteItem);
  const reorderCategories = useMutation(api.groceries.reorderCategories);
  const switchStore = useMutation(api.groceries.switchStore);
  const createStore = useMutation(api.groceries.createStore);
  const updateCategory = useMutation(api.groceries.updateCategory);
  const deleteCategory = useMutation(api.groceries.deleteCategory);
  const recategorizeAllItems = useAction(api.groceries.recategorizeAllItems);
  const initializeUser = useMutation(api.groceries.initializeUser);

  // Ensure user initialization after auth
  useEffect(() => {
    if (isAuthenticated) {
      void initializeUser();
    }
  }, [isAuthenticated, initializeUser]);

  const [isAdding, setIsAdding] = useState(false);
  const [showStoreManager, setShowStoreManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm({
    defaultValues: {
      itemName: "",
    },
    onSubmit: async ({ value }) => {
      if (!value.itemName.trim()) return;

      setIsAdding(true);
      try {
        await categorizeItem({ itemName: value.itemName.trim() });
        form.reset();
      } finally {
        setIsAdding(false);
      }
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !groceryData) return;

    if (active.id !== over.id) {
      const oldIndex = groceryData.categories.findIndex(
        (cat) => cat._id === active.id
      );
      const newIndex = groceryData.categories.findIndex(
        (cat) => cat._id === over.id
      );

      const newOrder = arrayMove(groceryData.categories, oldIndex, newIndex);

      void reorderCategories({
        categoryIds: newOrder.map((cat) => cat._id),
      });
    }
  };

  const handleSwitchStore = async (storeId: Id<"stores">) => {
    await switchStore({ storeId });
  };

  const handleCreateStore = async (name: string) => {
    await createStore({ name });
  };

  const handleUpdateCategory = async (
    categoryId: Id<"categories"> | undefined,
    name: string,
    color: string
  ) => {
    if (!groceryData?.currentStore) return;
    await updateCategory({
      storeId: groceryData.currentStore._id,
      categoryId,
      name,
      color,
    });
  };

  const handleDeleteCategory = async (categoryId: Id<"categories">) => {
    await deleteCategory({ categoryId });
  };

  const handleRecategorizeItems = async () => {
    await recategorizeAllItems();
  };

  // Loading/auth screens
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {isLoading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        ) : (
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-xl shadow-sm border p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  🛒 Grocery List
                </h1>
                <p className="text-gray-600">
                  Sign in to manage your grocery lists
                </p>
              </div>
              <SignInForm />
            </div>
          </div>
        )}
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              🛒 Grocery List
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowStoreManager(!showStoreManager);
                }}
                className="text-gray-600 hover:text-gray-800 p-2"
                title="Store Settings"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
              <SignOutButton />
            </div>
          </div>
          {groceryData.currentStore && (
            <div className="text-sm text-gray-600 mt-1">
              Shopping at:{" "}
              <span className="font-medium">
                {groceryData.currentStore.name}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Store Manager */}
        {showStoreManager && stores && (
          <StoreManager
            currentStore={groceryData.currentStore}
            stores={stores}
            onSwitchStore={handleSwitchStore}
            onCreateStore={handleCreateStore}
            onManageCategories={() => {
              setShowCategoryManager(true);
            }}
            onRecategorizeItems={handleRecategorizeItems}
          />
        )}

        {/* Add Item Form */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="space-y-3"
          >
            <form.Field
              name="itemName"
              children={(field) => (
                <div>
                  <input
                    type="text"
                    placeholder="Add grocery item..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
                    disabled={isAdding}
                  />
                </div>
              )}
            />
            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base"
            >
              {isAdding ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </span>
              ) : (
                "Add Item"
              )}
            </button>
          </form>
        </div>

        {/* Categories and Items */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categoriesWithItems.map((cat) => cat._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {categoriesWithItems.map((category) => {
                const items = groceryData.itemsByCategory[category.name] || [];

                return (
                  <SortableCategory
                    key={category._id}
                    category={category}
                    items={items}
                    toggleCompletion={toggleCompletion}
                    deleteItem={deleteItem}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

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

      {/* Category Manager Modal */}
      {showCategoryManager && groceryData.currentStore && (
        <CategoryManager
          storeId={groceryData.currentStore._id}
          categories={groceryData.categories}
          onClose={() => {
            setShowCategoryManager(false);
          }}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}
    </div>
  );
}
