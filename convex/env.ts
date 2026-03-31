import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const nonEmptyString = z.string().trim().min(1);
const urlString = z.url();

const optionalString = z.preprocess(
  emptyStringToUndefined,
  nonEmptyString.optional(),
);

export const env = createEnv({
  server: {
    AUTH_EMAIL_FROM: optionalString,
    CONVEX_ENV: optionalString,
    CONVEX_SITE_URL: urlString,
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    JWKS: optionalString,
    MISTRAL_API_KEY: nonEmptyString,
    RESEND_API_KEY: optionalString,
  },
  runtimeEnv: process.env,
});

function assertEnvPair(
  leftName: string,
  leftValue: string | undefined,
  rightName: string,
  rightValue: string | undefined,
) {
  if (Boolean(leftValue) !== Boolean(rightValue)) {
    throw new Error(`Set both ${leftName} and ${rightName}, or neither.`);
  }
}

assertEnvPair(
  "GOOGLE_CLIENT_ID",
  env.GOOGLE_CLIENT_ID,
  "GOOGLE_CLIENT_SECRET",
  env.GOOGLE_CLIENT_SECRET,
);
assertEnvPair(
  "RESEND_API_KEY",
  env.RESEND_API_KEY,
  "AUTH_EMAIL_FROM",
  env.AUTH_EMAIL_FROM,
);
