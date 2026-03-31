import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = z.preprocess(emptyStringToUndefined, z.url().optional());

export const env = createEnv({
  server: {},
  clientPrefix: "VITE_",
  client: {
    VITE_CONVEX_URL: z.url(),
    VITE_CONVEX_SITE_URL: optionalUrl,
  },
  runtimeEnv: import.meta.env,
});
