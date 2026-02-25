import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { logAiDebug } from "@/lib/aiDebugLogger";

export function useRecipeGeneration() {
  const generateRecipe = useAction(api.recipes.generate);
  const [showGenerate, setShowGenerate] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [includeGoalsContext, setIncludeGoalsContext] = useState(false);
  const [servingsCount, setServingsCount] = useState(1);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    const startedAt = performance.now();
    const description = aiPrompt.trim();
    try {
      const result = await generateRecipe({
        description,
        servings: servingsCount,
        includeGoalsContext,
        debug: import.meta.env.DEV,
      });
      const debugResult =
        typeof result === "object" && result !== null && "prompt" in result ? result : null;
      await logAiDebug({
        action: "recipes.generate",
        input:
          debugResult?.prompt ?? {
            description,
            servings: servingsCount,
            includeGoalsContext,
          },
        output:
          debugResult?.responseText ??
          (typeof result === "string"
            ? { recipeId: result, message: "Recipe generated successfully" }
            : "Recipe generated successfully"),
        durationMs: Math.round(performance.now() - startedAt),
      });
      setAiPrompt("");
      setShowGenerate(false);
    } catch (error) {
      await logAiDebug({
        action: "recipes.generate",
        input: {
          description,
          servings: servingsCount,
          includeGoalsContext,
        },
        error: error instanceof Error ? error.message : String(error),
        durationMs: Math.round(performance.now() - startedAt),
      });
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  return {
    showGenerate,
    setShowGenerate,
    aiPrompt,
    setAiPrompt,
    includeGoalsContext,
    setIncludeGoalsContext,
    servingsCount,
    increaseServingsCount: () =>
      setServingsCount((current) => Math.min(50, current + 1)),
    decreaseServingsCount: () =>
      setServingsCount((current) => Math.max(1, current - 1)),
    generating,
    handleGenerate,
  };
}
