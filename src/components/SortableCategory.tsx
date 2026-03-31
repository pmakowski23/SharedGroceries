import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

function DraggableItemRow({
  item,
  categoryName,
}: {
  item: Doc<"groceryItems">;
  categoryName: string;
}) {
  const toggleCompletion = useMutation(
    api.groceries.toggleItemCompletion,
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;

    const nextItemsByCategory = { ...data.itemsByCategory };
    for (const key of Object.keys(nextItemsByCategory)) {
      nextItemsByCategory[key] = nextItemsByCategory[key].map((candidate) =>
        candidate._id === args.itemId
          ? { ...candidate, isCompleted: !candidate.isCompleted }
          : candidate,
      );
    }

    store.setQuery(api.groceries.getGroceryList, {}, {
      ...data,
      itemsByCategory: nextItemsByCategory,
    });
  });

  const deleteItem = useMutation(api.groceries.deleteItem).withOptimisticUpdate(
    (store, args) => {
      const data = store.getQuery(api.groceries.getGroceryList, {});
      if (!data) return;

      const nextItemsByCategory = Object.fromEntries(
        Object.entries(data.itemsByCategory).map(([key, items]) => [
          key,
          items.filter((candidate) => candidate._id !== args.itemId),
        ]),
      );

      store.setQuery(api.groceries.getGroceryList, {}, {
        ...data,
        itemsByCategory: nextItemsByCategory,
      });
    },
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item._id,
    data: {
      type: "item",
      itemId: item._id,
      categoryName,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
        item.isCompleted ? "opacity-60" : ""
      } ${isDragging ? "bg-secondary shadow-md" : "hover:bg-gray-50"}`}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="rounded-md border p-1 text-muted-foreground"
        aria-label={`Move ${item.name}`}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 4h2v2H7V4zm0 5h2v2H7V9zm0 5h2v2H7v-2zm4-10h2v2h-2V4zm0 5h2v2h-2V9zm0 5h2v2h-2v-2z" />
        </svg>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => void toggleCompletion({ itemId: item._id })}
        className={`h-6 w-6 rounded-full border-2 transition-colors ${
          item.isCompleted
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input text-muted-foreground hover:border-primary/60"
        }`}
      >
        {item.isCompleted && (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </Button>
      <span
        className={`flex-1 text-base ${
          item.isCompleted
            ? "line-through text-muted-foreground"
            : "text-foreground"
        }`}
      >
        {item.name}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => void deleteItem({ itemId: item._id })}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </Button>
    </div>
  );
}

export function SortableCategory({
  category,
  items,
}: {
  category: Doc<"categories">;
  items: Array<Doc<"groceryItems">>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category._id,
    data: {
      type: "category",
      categoryId: category._id,
      categoryName: category.name,
    },
  });

  const { setNodeRef: setDropZoneRef, isOver } = useDroppable({
    id: `drop-${category._id}`,
    data: {
      type: "category",
      categoryId: category._id,
      categoryName: category.name,
    },
  });

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={`overflow-hidden transition-shadow ${
        isDragging ? "opacity-60 shadow-lg" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex cursor-grab items-center gap-3 border-b p-4 active:cursor-grabbing"
        style={{ backgroundColor: `${category.color}12` }}
      >
        <div
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <h2 className="flex-1 font-semibold">{category.name}</h2>
        <div className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </div>
      </div>

      <CardContent
        ref={setDropZoneRef}
        className={`space-y-1 p-2 transition-colors ${
          isOver ? "bg-secondary/60" : ""
        }`}
      >
        {items.length > 0 ? (
          items.map((item) => (
            <DraggableItemRow
              key={item._id}
              item={item}
              categoryName={category.name}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Drop grocery items here to recategorize them for the whole family.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
