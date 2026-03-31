import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "../lib/auth";
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
  const initializeCurrentUser = useMutation(api.families.initializeCurrentUser);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const initializedSessionIdRef = useRef<string | null>(null);

  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const isAuthRoute = currentPath === "/auth";
  const inviteToken = useMemo(
    () => new URLSearchParams(currentSearch).get("invite"),
    [currentSearch],
  );

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!session.data?.session) {
      initializedSessionIdRef.current = null;
      setInitializationError(null);

      if (!isAuthRoute) {
        const redirectTarget = `${currentPath}${currentSearch}`;
        const nextUrl = `/auth?redirect=${encodeURIComponent(redirectTarget)}`;
        window.location.replace(nextUrl);
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

    if (isAuthRoute && inviteToken) {
      return;
    }

    if (initializedSessionIdRef.current === session.data.session.id) {
      return;
    }

    setInitializationError(null);
    void initializeCurrentUser({})
      .then(() => {
        initializedSessionIdRef.current = session.data!.session.id;
      })
      .catch((error) => {
        setInitializationError(
          error instanceof Error ? error.message : String(error),
        );
      });
  }, [
    currentPath,
    currentSearch,
    initializeCurrentUser,
    isConvexAuthenticated,
    isConvexAuthLoading,
    inviteToken,
    isAuthRoute,
    session.data?.session,
    session.isPending,
  ]);

  if (session.isPending || (session.data?.session && isConvexAuthLoading)) {
    return <FullScreenSpinner message="Loading your account session..." />;
  }

  if (!session.data?.session) {
    return isAuthRoute ? <>{children}</> : null;
  }

  if (initializationError) {
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
                onClick={() => void authClient.signOut().then(() => window.location.replace("/auth"))}
              >
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    !(
      isAuthRoute && inviteToken
    ) &&
    (initializedSessionIdRef.current !== session.data.session.id ||
      !isConvexAuthenticated)
  ) {
    return <FullScreenSpinner message="Loading your family workspace..." />;
  }

  return <>{children}</>;
}
