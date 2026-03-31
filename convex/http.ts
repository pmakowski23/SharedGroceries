import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { authTrustedOrigins } from "./authSite";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: authTrustedOrigins,
  },
});

export default http;
