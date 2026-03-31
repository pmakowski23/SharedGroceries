export type AuthUrlArgs = {
  inviteToken?: string | null;
  redirectTo?: string;
};

export function parseAuthSearch(search: string) {
  const params = new URLSearchParams(search);
  const inviteToken = params.get("invite");
  const redirect = params.get("redirect");

  if (!redirect || !redirect.startsWith("/")) {
    return {
      inviteToken,
      redirectTarget: "/",
    };
  }

  return {
    inviteToken,
    redirectTarget: redirect,
  };
}

export function getCurrentAuthSearch() {
  return parseAuthSearch(window.location.search);
}

export function buildAuthPath(args?: AuthUrlArgs) {
  const url = new URL("/auth", "http://localhost");
  if (args?.inviteToken) {
    url.searchParams.set("invite", args.inviteToken);
  }
  if (args?.redirectTo && args.redirectTo.startsWith("/")) {
    url.searchParams.set("redirect", args.redirectTo);
  }
  return `${url.pathname}${url.search}`;
}

export function buildAuthReturnUrl(args?: AuthUrlArgs) {
  return new URL(buildAuthPath(args), window.location.origin).toString();
}
