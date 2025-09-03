import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { Id } from "../convex/_generated/dataModel";
import { SortableCategory } from "./components/SortableCategory";
import { StoreManager } from "./components/StoreManager";
import { CategoryManager } from "./components/CategoryManager";
import { InitializationGate } from "./components/InitializationGate";
import { Header } from "./components/Header";
import { AddItemForm } from "./components/AddItemForm";

export default function App() {
  const groceryData = useQuery(api.groceries.getGroceryList, {});

  const reorderCategories = useMutation(
    api.groceries.reorderCategories
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;

    const idOrder = args.categoryIds as Array<Id<"categories">>;
    const idToCategory = new Map(data.categories.map((c) => [c._id, c]));
    const newCategories = idOrder
      .map((id, idx) => ({ ...idToCategory.get(id)!, order: idx }))
      .filter(Boolean);

    const next = {
      ...data,
      categories: newCategories,
    } as typeof data;

    store.setQuery(api.groceries.getGroceryList, {}, next);
  });

  const [showStoreManager, setShowStoreManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
              onManageCategories={() => setShowCategoryManager(true)}
            />
          )}

          <AddItemForm />

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
                  const items =
                    groceryData.itemsByCategory[category.name] || [];

                  return (
                    <SortableCategory
                      key={category._id}
                      category={category}
                      items={items}
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
          />
        )}
      </div>
    </InitializationGate>
  );
}
