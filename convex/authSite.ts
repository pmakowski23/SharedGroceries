const canonicalAppUrl = "https://groceries.pmakowski.dev";

const localAppOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
] as const;

export const authSiteUrl = canonicalAppUrl;

export const authTrustedOrigins = [canonicalAppUrl, ...localAppOrigins];
