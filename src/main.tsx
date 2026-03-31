import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { RouterProvider } from "@tanstack/react-router";
import "./index.css";
import { router } from "./router";
import { registerSW } from "virtual:pwa-register";
import { authClient } from "./lib/auth";
import { env } from "./env";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <ConvexBetterAuthProvider client={convex} authClient={authClient}>
    <RouterProvider router={router} />
  </ConvexBetterAuthProvider>
);

registerSW({ immediate: true });
