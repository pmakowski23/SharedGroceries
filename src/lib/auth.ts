import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { env } from "../env";
export {
  buildAuthPath,
  buildAuthReturnUrl,
  getCurrentAuthSearch,
  parseAuthSearch,
  type AuthUrlArgs,
} from "./authUrl";

const convexSiteUrl = env.VITE_CONVEX_SITE_URL ?? env.VITE_CONVEX_URL;

export const authBaseUrl = new URL("/api/auth", convexSiteUrl).toString();

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [convexClient(), crossDomainClient()],
});
