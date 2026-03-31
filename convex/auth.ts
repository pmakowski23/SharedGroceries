import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import { authSiteUrl, authTrustedOrigins } from "./authSite";
import { env } from "./env";
import { getPluginJwks } from "./lib/jwks";

const convexSiteUrl = env.CONVEX_SITE_URL;
const googleClientId = env.GOOGLE_CLIENT_ID;
const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
const pluginJwks = getPluginJwks(env.JWKS);

export const authComponent = createClient(components.betterAuth);

export const createAuth = (
  ctx: Parameters<typeof authComponent.adapter>[0],
) => {
  return betterAuth({
    baseURL: convexSiteUrl,
    trustedOrigins: authTrustedOrigins,
    database: authComponent.adapter(ctx),
    socialProviders:
      googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
              prompt: "select_account",
            },
          }
        : undefined,
    plugins: [
      crossDomain({
        siteUrl: authSiteUrl,
      }),
      convex({
        authConfig,
        jwks: pluginJwks,
      }),
    ],
  });
};

export const { getAuthUser } = authComponent.clientApi();

export const getAuthConfiguration = query({
  args: {},
  returns: v.object({ googleEnabled: v.boolean() }),
  handler: async () => {
    return {
      googleEnabled: Boolean(googleClientId && googleClientSecret),
    };
  },
});
