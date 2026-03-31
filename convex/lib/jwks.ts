type BetterAuthJwksRow = {
  id: string;
  publicKey: string;
  privateKey: string;
  createdAt: number;
  expiresAt?: number;
  alg?: string;
  crv?: string;
};

type ParsedJwks =
  | {
      kind: "better-auth-rows";
      value: BetterAuthJwksRow[];
    }
  | {
      kind: "public-jwks";
      value: { keys: unknown[] };
    };

export function parseStoredJwks(jwks: string | undefined): ParsedJwks | undefined {
  if (!jwks) {
    return undefined;
  }

  const parsed = JSON.parse(jwks) as unknown;

  if (Array.isArray(parsed)) {
    return {
      kind: "better-auth-rows",
      value: parsed,
    };
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { keys?: unknown }).keys)
  ) {
    return {
      kind: "public-jwks",
      value: parsed as { keys: unknown[] },
    };
  }

  throw new Error(
    "JWKS must be a Better Auth jwks row array or a JSON Web Key Set.",
  );
}

export function getPluginJwks(jwks: string | undefined) {
  const parsed = parseStoredJwks(jwks);
  return parsed?.kind === "better-auth-rows" ? jwks : undefined;
}
