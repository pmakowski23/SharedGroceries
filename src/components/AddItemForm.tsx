import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useForm } from "@tanstack/react-form";

export function AddItemForm() {
  const categorizeItem = useAction(api.groceries.categorizeItem);
  const [isAdding, setIsAdding] = useState(false);

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

  return (
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
  );
}
