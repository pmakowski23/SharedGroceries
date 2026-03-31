import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
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
    api.groceries.reorderCategories,
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;

    const idOrder = args.categoryIds as Array<Id<"categories">>;
    const idToCategory = new Map(data.categories.map((category) => [category._id, category]));
    const newCategories = idOrder
      .map((id, index) => {
        const category = idToCategory.get(id);
        return category ? { ...category, order: index } : null;
      })
      .filter((category): category is NonNullable<typeof category> => category !== null);

    store.setQuery(api.groceries.getGroceryList, {}, {
      ...data,
      categories: newCategories,
    });
  });

  const updateItemCategory = useMutation(
    api.groceries.updateItemCategory,
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;

    const nextItemsByCategory = Object.fromEntries(
      Object.entries(data.itemsByCategory).map(([categoryName, items]) => [
        categoryName,
        items.filter((item) => item._id !== args.itemId),
      ]),
    ) as ItemsByCategory;

    const movedItem = Object.values(data.itemsByCategory)
      .flat()
      .find((item) => item._id === args.itemId);

    if (movedItem) {
      const nextItem = { ...movedItem, category: args.category };
      nextItemsByCategory[args.category] = [
        ...(nextItemsByCategory[args.category] ?? []),
        nextItem,
      ];
    }

    store.setQuery(api.groceries.getGroceryList, {}, {
      ...data,
      itemsByCategory: nextItemsByCategory,
    });
  });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type as "category" | "item" | undefined;
    const overType = over.data.current?.type as "category" | "item" | undefined;

    if (activeType === "category") {
      const overCategoryId =
        (over.data.current?.categoryId as Id<"categories"> | undefined) ??
        (over.id as Id<"categories">);

      if (active.id !== overCategoryId) {
        const oldIndex = categories.findIndex((category) => category._id === active.id);
        const newIndex = categories.findIndex(
          (category) => category._id === overCategoryId,
        );
        if (oldIndex < 0 || newIndex < 0) {
          return;
        }
        const newOrder = arrayMove(categories, oldIndex, newIndex);
        void reorderCategories({
          categoryIds: newOrder.map((category) => category._id),
        });
      }
      return;
    }

    if (activeType === "item") {
      const targetCategoryName =
        (over.data.current?.categoryName as string | undefined) ??
        (overType === "item"
          ? (over.data.current?.categoryName as string | undefined)
          : undefined);
      const sourceCategoryName = active.data.current?.categoryName as string | undefined;

      if (
        targetCategoryName &&
        sourceCategoryName &&
        targetCategoryName !== sourceCategoryName
      ) {
        void updateItemCategory({
          itemId: active.id as Id<"groceryItems">,
          category: targetCategoryName,
          persistOverride: true,
        });
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={categoriesWithItems.map((category) => category._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {categoriesWithItems.map((category) => (
            <SortableCategory
              key={category._id}
              category={category}
              items={itemsByCategory[category.name] ?? []}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
