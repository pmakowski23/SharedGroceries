import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RecipeAIGenerator } from "../components/recipes/RecipeAIGenerator";
import { RecipeListItem } from "../components/recipes/RecipeListItem";
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
    generating,
    handleGenerate,
  } = useRecipeGeneration();

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Recipes</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
        />
        <button
          onClick={() => setShowGenerate(!showGenerate)}
          className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          + AI
        </button>
      </div>
      <RecipeAIGenerator
        showGenerate={showGenerate}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        generating={generating}
        onGenerate={() => void handleGenerate()}
      />

      {recipes === undefined ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {search ? "No recipes found" : "No recipes yet"}
          </h3>
          <p className="text-gray-500 text-sm">
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
