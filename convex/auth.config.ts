import type { AuthConfig } from "convex/server";
import {
  createPublicJwks,
  getAuthConfigProvider,
} from "@convex-dev/better-auth/auth-config";
import { parseStoredJwks } from "./lib/jwks";

function buildStaticJwksUri(publicJwks: { keys: unknown[] }) {
  return `data:text/plain;charset=utf-8;base64,${btoa(JSON.stringify(publicJwks))}`;
}

const parsedJwks = parseStoredJwks(process.env.JWKS);

const authConfigProvider = parsedJwks?.kind === "better-auth-rows"
  ? {
      ...getAuthConfigProvider(),
      jwks: buildStaticJwksUri(createPublicJwks(parsedJwks.value)),
    }
  : getAuthConfigProvider();

export default {
  providers: [authConfigProvider],
} satisfies AuthConfig;
