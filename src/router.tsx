import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from "@tanstack/react-router";
import { BottomNav } from "./components/BottomNav";
import { InitializationGate } from "./components/InitializationGate";
import { GroceryListPage } from "./pages/GroceryListPage";
import { RecipesPage } from "./pages/RecipesPage";
import { MealPlannerPage } from "./pages/MealPlannerPage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { MealGoalSettingsPage } from "./pages/MealGoalSettingsPage";

const rootRoute = createRootRoute({
  component: () => (
    <InitializationGate>
      <div className="min-h-screen bg-gray-50 pb-20">
        <Outlet />
        <BottomNav />
      </div>
    </InitializationGate>
  ),
});

const groceriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: GroceryListPage,
});

const recipesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes",
  component: RecipesPage,
});

const recipeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes/$recipeId",
  component: RecipeDetailPage,
});

const mealPlannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meal-planner",
  component: MealPlannerPage,
});

const mealGoalSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meal-goals",
  component: MealGoalSettingsPage,
});

const routeTree = rootRoute.addChildren([
  groceriesRoute,
  recipesRoute,
  recipeDetailRoute,
  mealPlannerRoute,
  mealGoalSettingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
