import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useRecipeGeneration() {
  const generateRecipe = useAction(api.recipes.generate);
  const [showGenerate, setShowGenerate] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      await generateRecipe({ description: aiPrompt.trim() });
      setAiPrompt("");
      setShowGenerate(false);
    } finally {
      setGenerating(false);
    }
  };

  return {
    showGenerate,
    setShowGenerate,
    aiPrompt,
    setAiPrompt,
    generating,
    handleGenerate,
  };
}
