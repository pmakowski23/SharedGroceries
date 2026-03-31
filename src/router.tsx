import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { BottomNav } from "./components/BottomNav";
import { InitializationGate } from "./components/InitializationGate";
import { GroceryListPage } from "./pages/GroceryListPage";
import { RecipesPage } from "./pages/RecipesPage";
import { MealPlannerPage } from "./pages/MealPlannerPage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { MealGoalSettingsPage } from "./pages/MealGoalSettingsPage";
import { ErrorFallbackPage } from "./pages/ErrorFallbackPage";
import { AuthPage } from "./pages/AuthPage";

function AppShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isAuthRoute = pathname === "/auth";

  return (
    <div className={`min-h-screen ${isAuthRoute ? "" : "bg-gray-50 pb-20"}`}>
      <Outlet />
      {!isAuthRoute && <BottomNav />}
    </div>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <InitializationGate>
      <AppShell />
    </InitializationGate>
  ),
  errorComponent: ({ error, reset }) => (
    <ErrorFallbackPage error={error} onTryAgain={reset} />
  ),
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
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
  path: "/family",
  component: MealGoalSettingsPage,
});

const routeTree = rootRoute.addChildren([
  authRoute,
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
