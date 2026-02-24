import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RecipeAIGenerator } from "../components/recipes/RecipeAIGenerator";
import { RecipeListItem } from "../components/recipes/RecipeListItem";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useRecipeGeneration } from "../hooks/useRecipeGeneration";
import { useRecipeSearch } from "../hooks/useRecipeSearch";

export function RecipesPage() {
  const recipes = useQuery(api.recipes.list, {});
  const deleteRecipe = useMutation(api.recipes.remove);
  const { search, setSearch, filtered } = useRecipeSearch(recipes);
  const {
    showGenerate,
    setShowGenerate,
    aiPrompt,
    setAiPrompt,
    includeGoalsContext,
    setIncludeGoalsContext,
    generating,
    handleGenerate,
  } = useRecipeGeneration();

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Recipes</h1>

      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 flex-1"
        />
        <Button
          onClick={() => setShowGenerate(!showGenerate)}
          variant={showGenerate ? "secondary" : "default"}
          className="whitespace-nowrap"
        >
          + AI
        </Button>
      </div>
      <RecipeAIGenerator
        showGenerate={showGenerate}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        includeGoalsContext={includeGoalsContext}
        setIncludeGoalsContext={setIncludeGoalsContext}
        generating={generating}
        onGenerate={() => void handleGenerate()}
      />

      {recipes === undefined ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📖</div>
          <h3 className="mb-2 text-lg font-semibold">
            {search ? "No recipes found" : "No recipes yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {search
              ? "Try a different search term"
              : 'Use the "+ AI" button to generate your first recipe'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe) => (
            <RecipeListItem
              key={recipe._id}
              recipe={recipe}
              onDelete={(recipeId) => void deleteRecipe({ recipeId })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
