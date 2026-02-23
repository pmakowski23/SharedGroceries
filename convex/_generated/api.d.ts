/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as groceries from "../groceries.js";
import type * as http from "../http.js";
import type * as mealPlans from "../mealPlans.js";
import type * as nutritionGoals from "../nutritionGoals.js";
import type * as prompts from "../prompts.js";
import type * as recipes from "../recipes.js";
import type * as router from "../router.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  groceries: typeof groceries;
  http: typeof http;
  mealPlans: typeof mealPlans;
  nutritionGoals: typeof nutritionGoals;
  prompts: typeof prompts;
  recipes: typeof recipes;
  router: typeof router;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
