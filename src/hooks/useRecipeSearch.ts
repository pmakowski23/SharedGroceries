import { useMemo, useState } from "react";

type RecipeSearchItem = {
  name: string;
};

export function useRecipeSearch<T extends RecipeSearchItem>(
  recipes: Array<T> | undefined,
) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const source = recipes ?? [];
    if (!search.trim()) return source;
    const normalized = search.toLowerCase();
    return source.filter((recipe) =>
      recipe.name.toLowerCase().includes(normalized),
    );
  }, [recipes, search]);

  return { search, setSearch, filtered };
}
