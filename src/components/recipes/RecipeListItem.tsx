import { Link } from "@tanstack/react-router";
import { Id } from "../../../convex/_generated/dataModel";
import { X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

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
      className="block"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{recipe.name}</h3>
          {recipe.description && (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {recipe.description}
            </p>
          )}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{recipe.servings} servings</span>
                <span>{recipe.totalKcal} kcal</span>
          </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recipe.mealTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[11px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(recipe._id);
              }}
              className="ml-2 text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${recipe.name}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
