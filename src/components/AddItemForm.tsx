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
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add grocery item..."
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
                disabled={isAdding}
              />
              <button
                type="submit"
                disabled={isAdding}
                aria-label="Add item"
                className="h-12 w-12 shrink-0 inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
              >
                {isAdding ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      d="M22 2L11 13"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M22 2L15 22L11 13L2 9L22 2Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
        />
      </form>
    </div>
  );
}
