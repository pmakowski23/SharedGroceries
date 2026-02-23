import { Link } from "@tanstack/react-router";
import { Id } from "../../../convex/_generated/dataModel";

type RecipeListItemProps = {
  recipe: {
    _id: Id<"recipes">;
    name: string;
    description?: string;
    servings: number;
    totalKcal: number;
    mealTags: Array<string>;
  };
  onDelete: (recipeId: Id<"recipes">) => void;
};

export function RecipeListItem({ recipe, onDelete }: RecipeListItemProps) {
  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe._id }}
      className="block bg-white rounded-xl shadow-sm border p-4 hover:shadow transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{recipe.name}</h3>
          {recipe.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {recipe.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{recipe.servings} servings</span>
            <span>{recipe.totalKcal} kcal</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipe.mealTags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(recipe._id);
          }}
          className="ml-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </Link>
  );
}
