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
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SortableCategory } from "./SortableCategory";

type ItemsByCategory = Record<string, Array<Doc<"groceryItems">>>;

export function CategoryListDnd({
  categories,
  categoriesWithItems,
  itemsByCategory,
}: {
  categories: Array<Doc<"categories">>;
  categoriesWithItems: Array<Doc<"categories">>;
  itemsByCategory: ItemsByCategory;
}) {
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
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat._id === active.id);
      const newIndex = categories.findIndex((cat) => cat._id === over.id);

      const newOrder = arrayMove(categories, oldIndex, newIndex);

      void reorderCategories({
        categoryIds: newOrder.map((cat) => cat._id),
      });
    }
  };

  return (
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
            const items = itemsByCategory[category.name] || [];
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
  );
}
