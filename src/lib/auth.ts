import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { env } from "../env";

const convexSiteUrl = env.VITE_CONVEX_SITE_URL ?? env.VITE_CONVEX_URL;

export const authBaseUrl = new URL("/api/auth", convexSiteUrl).toString();

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [convexClient(), crossDomainClient()],
});

export function getCurrentInviteToken() {
  return new URLSearchParams(window.location.search).get("invite");
}

export function getCurrentRedirectTarget() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect || !redirect.startsWith("/")) {
    return "/";
  }
  return redirect;
}

export function buildAuthReturnUrl(args?: {
  inviteToken?: string | null;
  redirectTo?: string;
}) {
  const url = new URL("/auth", window.location.origin);
  if (args?.inviteToken) {
    url.searchParams.set("invite", args.inviteToken);
  }
  if (args?.redirectTo && args.redirectTo.startsWith("/")) {
    url.searchParams.set("redirect", args.redirectTo);
  }
  return url.toString();
}
