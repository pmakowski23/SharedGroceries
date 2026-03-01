import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Link, useParams } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AddIngredientsButton } from "../components/recipes/AddIngredientsButton";
import { IngredientsList } from "../components/recipes/IngredientsList";
import { InstructionsList } from "../components/recipes/InstructionsList";
import { MacrosGrid } from "../components/recipes/MacrosGrid";
import { MealTagSelector } from "../components/recipes/MealTagSelector";
import { RecipeEditDialog } from "../components/recipes/RecipeEditDialog";
import { RecipeHeader } from "../components/recipes/RecipeHeader";
import { ServingsControl } from "../components/recipes/ServingsControl";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useScaledRecipeNutrition } from "../hooks/useScaledRecipeNutrition";

export function RecipeDetailPage() {
  const { recipeId } = useParams({ from: "/recipes/$recipeId" });
  const recipeIdAsId = recipeId as Id<"recipes">;
  const ensureVersioningInitialized = useMutation(
    api.recipes.ensureVersioningInitialized,
  );
  const selectVersion = useMutation(api.recipes.selectVersion);
  const editWithPrompt = useAction(api.recipes.editWithPrompt);
  const recipe = useQuery(api.recipes.get, {
    recipeId: recipeIdAsId,
  });
  const ingredients = useQuery(api.recipes.getIngredients, {
    recipeId: recipeIdAsId,
  });
  const parts = useQuery(api.recipes.getParts, {
    recipeId: recipeIdAsId,
  });
  const versions = useQuery(api.recipes.getVersions, {
    recipeId: recipeIdAsId,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState(false);
  const [selectingVersion, setSelectingVersion] = useState(false);

  useEffect(() => {
    void ensureVersioningInitialized({ recipeId: recipeIdAsId });
  }, [ensureVersioningInitialized, recipeIdAsId]);

  const fallbackServings = recipe?.servings ?? 1;
  const fallbackIngredients = ingredients ?? [];
  const fallbackParts = parts ?? [];
  const {
    displayServings,
    setServings,
    scale,
    totalMacros,
    effectiveParts,
    setPartScale,
  } = useScaledRecipeNutrition(fallbackServings, fallbackParts, fallbackIngredients);

  if (
    recipe === undefined ||
    ingredients === undefined ||
    parts === undefined ||
    versions === undefined
  ) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (recipe === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Button type="button" variant="link" className="mt-4" asChild>
          <Link to="/recipes">Back to recipes</Link>
        </Button>
      </div>
    );
  }

  const runRecipeEdit = async (allowReplaceFutureVersions: boolean) => {
    if (!recipe || !editPrompt.trim()) return;

    setEditingRecipe(true);
    setEditErrorMessage(null);
    try {
      await editWithPrompt({
        recipeId: recipeIdAsId,
        baseVersionNumber: recipe.currentVersionNumber,
        prompt: editPrompt.trim(),
        allowReplaceFutureVersions,
        debug: import.meta.env.DEV,
      });
      setEditDialogOpen(false);
      setReplaceConfirmOpen(false);
      setEditPrompt("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("REPLACE_FUTURE_VERSIONS_REQUIRED") &&
        !allowReplaceFutureVersions
      ) {
        setReplaceConfirmOpen(true);
        return;
      }
      setEditErrorMessage(message);
    } finally {
      setEditingRecipe(false);
    }
  };

  const handleSelectVersion = async (versionNumber: number) => {
    setSelectingVersion(true);
    try {
      await selectVersion({ recipeId: recipeIdAsId, versionNumber });
    } finally {
      setSelectingVersion(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <RecipeHeader
        name={recipe.name}
        description={recipe.description}
        onEditClick={() => {
          setEditErrorMessage(null);
          setEditDialogOpen(true);
        }}
        editDisabled={editingRecipe}
      />
      <MealTagSelector
        recipeId={recipeIdAsId}
        activeTags={recipe.mealTags}
        currentVersionNumber={recipe.currentVersionNumber}
        versions={versions}
        selectingVersion={selectingVersion}
        onSelectVersion={handleSelectVersion}
      />
      <ServingsControl servings={displayServings} setServings={setServings} />
      <MacrosGrid totalMacros={totalMacros} />
      <IngredientsList
        ingredients={ingredients}
        parts={effectiveParts}
        setPartScale={setPartScale}
        scale={scale}
      />
      <AddIngredientsButton
        recipeId={recipeIdAsId}
        servings={displayServings}
      />
      <InstructionsList instructions={recipe.instructions} parts={parts} />
      <RecipeEditDialog
        open={editDialogOpen}
        prompt={editPrompt}
        errorMessage={editErrorMessage}
        submitting={editingRecipe}
        onPromptChange={setEditPrompt}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditErrorMessage(null);
          }
        }}
        onSubmit={() => void runRecipeEdit(false)}
      />
      <Dialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Replace later versions?</DialogTitle>
            <DialogDescription>
              Generating from v{recipe.currentVersionNumber} will replace existing
              versions after it up to v{recipe.latestVersionNumber}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReplaceConfirmOpen(false)}
              disabled={editingRecipe}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void runRecipeEdit(true)}
              disabled={editingRecipe}
            >
              {editingRecipe ? "Generating..." : "Replace and generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
