import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { RouterProvider } from "@tanstack/react-router";
import "./index.css";
import { router } from "./router";
import { registerSW } from "virtual:pwa-register";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <RouterProvider router={router} />
  </ConvexProvider>
);

registerSW({ immediate: true });
