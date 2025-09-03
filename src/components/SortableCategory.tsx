import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Doc } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function SortableCategory({
  category,
  items,
}: {
  category: Doc<"categories">;
  items: Array<Doc<"groceryItems">>;
}) {
  const toggleCompletion = useMutation(
    api.groceries.toggleItemCompletion
  ).withOptimisticUpdate((store, args) => {
    const data = store.getQuery(api.groceries.getGroceryList, {});
    if (!data) return;

    const next = {
      ...data,
      itemsByCategory: { ...data.itemsByCategory },
    };

    for (const key of Object.keys(next.itemsByCategory)) {
      const arr = next.itemsByCategory[key];
      const idx = arr.findIndex((it) => it._id === args.itemId);
      if (idx !== -1) {
        const item = arr[idx];
        next.itemsByCategory[key] = [
          ...arr.slice(0, idx),
          { ...item, isCompleted: !item.isCompleted },
          ...arr.slice(idx + 1),
        ];
        break;
      }
    }

    store.setQuery(api.groceries.getGroceryList, {}, next);
  });

  const deleteItem = useMutation(api.groceries.deleteItem).withOptimisticUpdate(
    (store, args) => {
      const data = store.getQuery(api.groceries.getGroceryList, {});
      if (!data) return;

      const next = {
        ...data,
        itemsByCategory: { ...data.itemsByCategory },
      };

      for (const key of Object.keys(next.itemsByCategory)) {
        const arr = next.itemsByCategory[key];
        const idx = arr.findIndex((it) => it._id === args.itemId);
        if (idx !== -1) {
          next.itemsByCategory[key] = [
            ...arr.slice(0, idx),
            ...arr.slice(idx + 1),
          ];
          break;
        }
      }

      store.setQuery(api.groceries.getGroceryList, {}, next);
    }
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white overflow-hidden select-none rounded-xl shadow-sm border transition-shadow ${
        isDragging ? "shadow-lg opacity-50" : ""
      }`}
    >
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
