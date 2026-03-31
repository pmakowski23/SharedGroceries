import { ReactNode, useEffect, useMemo, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient, buildAuthPath, parseAuthSearch } from "../lib/auth";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

function FullScreenSpinner({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function InitializationGate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const {
    isLoading: isConvexAuthLoading,
    isAuthenticated: isConvexAuthenticated,
  } = useConvexAuth();
  const bootstrapCurrentUser = useMutation(api.families.bootstrapCurrentUser);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [bootstrappedKey, setBootstrappedKey] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const isAuthRoute = currentPath === "/auth";
  const { inviteToken, redirectTarget } = useMemo(
    () => parseAuthSearch(currentSearch),
    [currentSearch],
  );
  const sessionId = session.data?.session?.id ?? null;
  const bootstrapKey = sessionId ? `${sessionId}:${inviteToken ?? ""}` : null;

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!sessionId) {
      setBootstrappedKey(null);
      setInitializationError(null);
      setIsBootstrapping(false);

      if (!isAuthRoute) {
        const redirectTo = `${currentPath}${currentSearch}`;
        window.location.replace(buildAuthPath({ redirectTo }));
      }
      return;
    }

    if (isConvexAuthLoading) {
      return;
    }

    if (!isConvexAuthenticated) {
      setInitializationError(
        "Your sign-in session could not be synced with the workspace. Reload and try again.",
      );
      return;
    }

    if (bootstrapKey === bootstrappedKey) {
      if (isAuthRoute) {
        window.location.replace(redirectTarget);
      }
      return;
    }

    let cancelled = false;
    setInitializationError(null);
    setIsBootstrapping(true);

    void bootstrapCurrentUser(
      inviteToken ? { inviteToken } : {},
    )
      .then(() => {
        if (cancelled) {
          return;
        }

        setBootstrappedKey(bootstrapKey);
        if (isAuthRoute) {
          window.location.replace(redirectTarget);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setInitializationError(
            error instanceof Error ? error.message : String(error),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    bootstrappedKey,
    bootstrapCurrentUser,
    bootstrapKey,
    currentPath,
    currentSearch,
    inviteToken,
    isAuthRoute,
    isConvexAuthenticated,
    isConvexAuthLoading,
    redirectTarget,
    session.isPending,
    sessionId,
  ]);

  if (session.isPending || (sessionId && isConvexAuthLoading)) {
    return <FullScreenSpinner message="Loading your account session..." />;
  }

  if (!sessionId) {
    return isAuthRoute ? <>{children}</> : null;
  }

  if (initializationError) {
    const retryPath = isAuthRoute
      ? buildAuthPath({ inviteToken, redirectTo: redirectTarget })
      : buildAuthPath({ redirectTo: `${currentPath}${currentSearch}` });

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardContent className="space-y-4 p-6">
            <div>
              <h1 className="text-lg font-semibold">Workspace initialization failed</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {initializationError}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => window.location.reload()}>
                Try again
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void authClient.signOut().then(() => window.location.replace(retryPath))
                }
              >
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBootstrapping || bootstrappedKey !== bootstrapKey) {
    return <FullScreenSpinner message="Loading your family workspace..." />;
  }

  if (isAuthRoute) {
    return <FullScreenSpinner message="Opening your family workspace..." />;
  }

  return <>{children}</>;
}
