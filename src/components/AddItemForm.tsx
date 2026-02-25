import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { logAiDebug } from "@/lib/aiDebugLogger";

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
      const startedAt = performance.now();
      const itemName = value.itemName.trim();
      try {
        const result = await categorizeItem({
          itemName,
          debug: import.meta.env.DEV,
        });
        const debugResult =
          typeof result === "object" && result !== null && "prompt" in result ? result : null;
        await logAiDebug({
          action: "groceries.categorizeItem",
          input: debugResult?.prompt ?? { itemName },
          output:
            debugResult?.responseText ??
            (typeof result === "string" ? { category: result } : "Item categorized successfully"),
          error: debugResult?.error,
          durationMs: Math.round(performance.now() - startedAt),
        });
        form.reset();
      } catch (error) {
        await logAiDebug({
          action: "groceries.categorizeItem",
          input: { itemName },
          error: error instanceof Error ? error.message : String(error),
          durationMs: Math.round(performance.now() - startedAt),
        });
        throw error;
      } finally {
        setIsAdding(false);
      }
    },
  });

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
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
              <Input
                type="text"
                placeholder="Add grocery item..."
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="h-11 flex-1"
                disabled={isAdding}
              />
              <Button
                type="submit"
                disabled={isAdding}
                aria-label="Add item"
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {isAdding ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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
              </Button>
            </div>
          )}
        />
      </form>
      </CardContent>
    </Card>
  );
}
