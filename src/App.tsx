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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Id } from "../convex/_generated/dataModel";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { useAuthActions } from "@convex-dev/auth/react";

function SortableCategory({
  category,
  items,
  toggleCompletion,
  deleteItem,
}: {
  category: any;
  items: any[];
  toggleCompletion: any;
  deleteItem: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-sm border transition-shadow ${
        isDragging ? "shadow-lg opacity-50" : ""
      }`}
    >
      {/* Category Header */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-3 p-4 border-b border-gray-100 cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: category.color + "10" }}
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: category.color }}
        ></div>
        <h2 className="font-semibold text-gray-900 flex-1">{category.name}</h2>
        <div className="text-sm text-gray-500">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </div>
        <div className="text-gray-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
          </svg>
        </div>
      </div>

      {/* Items */}
      <div className="p-2">
        {items.map((item) => (
          <div
            key={item._id}
            className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
              item.isCompleted ? "opacity-60" : ""
            }`}
          >
            <button
              onClick={() => void toggleCompletion({ itemId: item._id })}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                item.isCompleted
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-gray-300 hover:border-green-400"
              }`}
            >
              {item.isCompleted && (
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
            </button>
            <span
              className={`flex-1 text-base ${
                item.isCompleted
                  ? "line-through text-gray-500"
                  : "text-gray-900"
              }`}
            >
              {item.name}
            </span>
            <button
              onClick={() => void deleteItem({ itemId: item._id })}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoreManager({
  currentStore,
  stores,
  onSwitchStore,
  onCreateStore,
  onManageCategories,
  onRecategorizeItems,
}: {
  currentStore: any;
  stores: any[];
  onSwitchStore: (storeId: Id<"stores">) => Promise<void>;
  onCreateStore: (name: string) => Promise<void>;
  onManageCategories: () => void;
  onRecategorizeItems: () => Promise<void>;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [isRecategorizing, setIsRecategorizing] = useState(false);

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;
    await onCreateStore(newStoreName.trim());
    setNewStoreName("");
    setShowCreateForm(false);
  };

  const handleRecategorize = async () => {
    setIsRecategorizing(true);
    try {
      await onRecategorizeItems();
    } finally {
      setIsRecategorizing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Store Settings</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          + New Store
        </button>
      </div>

      {/* Current Store Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Store
        </label>
        <select
          value={currentStore?._id || ""}
          onChange={(e) => {
            void onSwitchStore(e.target.value as Id<"stores">);
          }}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        >
          {stores.map((store) => (
            <option key={store._id} value={store._id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create New Store Form */}
      {showCreateForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Store name (e.g., Lidl, Biedronka)"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <button
              onClick={() => void handleCreateStore()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onManageCategories()}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Manage Categories
        </button>
        <button
          onClick={() => void handleRecategorize()}
          disabled={isRecategorizing}
          className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isRecategorizing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              Recategorizing...
            </span>
          ) : (
            "Recategorize All Items"
          )}
        </button>
      </div>
    </div>
  );
}

function CategoryManager({
  storeId: _storeId,
  categories,
  onClose,
  onUpdateCategory,
  onDeleteCategory,
}: {
  storeId: Id<"stores">;
  categories: any[];
  onClose: () => void;
  onUpdateCategory: (
    categoryId: Id<"categories"> | undefined,
    name: string,
    color: string
  ) => Promise<void>;
  onDeleteCategory: (categoryId: Id<"categories">) => Promise<void>;
}) {
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");

  const colors = [
    "#EF4444",
    "#F97316",
    "#EAB308",
    "#22C55E",
    "#06B6D4",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#6B7280",
    "#10B981",
    "#F59E0B",
    "#8B5A2B",
  ];

  const handleSave = (categoryId?: Id<"categories">) => {
    const name = categoryId ? editingCategory.name : newCategoryName;
    const color = categoryId ? editingCategory.color : newCategoryColor;

    if (!name.trim()) return;

    void onUpdateCategory(categoryId, name.trim(), color);

    if (categoryId) {
      setEditingCategory(null);
    } else {
      setNewCategoryName("");
      setNewCategoryColor("#3B82F6");
      setShowAddForm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Categories
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>

          {/* Categories List */}
          <div className="space-y-3 mb-6">
            {categories.map((category) => (
              <div
                key={category._id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
              >
                {editingCategory?._id === category._id ? (
                  <>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) =>
                          setEditingCategory({
                            ...editingCategory,
                            name: e.target.value,
                          })
                        }
                        className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <select
                        value={editingCategory.color}
                        onChange={(e) =>
                          setEditingCategory({
                            ...editingCategory,
                            color: e.target.value,
                          })
                        }
                        className="px-2 py-1 border border-gray-200 rounded text-sm"
                      >
                        {colors.map((color) => (
                          <option
                            key={color}
                            value={color}
                            style={{ backgroundColor: color }}
                          >
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleSave(category._id)}
                      className="text-green-600 hover:text-green-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="text-gray-500 hover:text-gray-600 text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="flex-1 text-sm font-medium">
                      {category.name}
                    </span>
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        void onDeleteCategory(category._id);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add New Category */}
          {showAddForm ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm"
                />
                <select
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded text-sm"
                >
                  {colors.map((color) => (
                    <option
                      key={color}
                      value={color}
                      style={{ backgroundColor: color }}
                    >
                      {color}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave()}
                  className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Add Category
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              + Add New Category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();

  // Auto sign in anonymously on first load if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void signIn("anonymous");
    }
  }, [isAuthenticated, isLoading, signIn]);

  const groceryData = useQuery(
    api.groceries.getGroceryList,
    isAuthenticated ? {} : undefined
  );
  const stores = useQuery(
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
