import { ReactNode, useEffect, useMemo, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient, buildAuthPath, parseAuthSearch } from "../lib/auth";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

type InitializationStage = {
  detail: string;
  progress: number;
  stepLabel: string;
  title: string;
};

function InitializationLoader({ stage }: { stage: InitializationStage }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md overflow-hidden border-white/70 bg-[#fff8ef]/92 shadow-[0_28px_80px_rgba(98,73,42,0.12)] backdrop-blur-xl">
        <div className="h-1 w-full bg-[linear-gradient(90deg,rgba(111,145,100,0.18)_0%,rgba(214,130,86,0.45)_48%,rgba(111,145,100,0.22)_100%)]" />
        <CardContent className="space-y-5 p-6 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <div className="space-y-2">
            <h1 className='font-["Iowan_Old_Style","Palatino_Linotype","Book_Antiqua",Palatino,serif] text-[1.8rem] leading-none tracking-[-0.03em] text-foreground'>
              Opening Shared Groceries
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {stage.detail}
            </p>
          </div>
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.24em] text-primary/75">
              <span>{stage.stepLabel}</span>
              <span>{stage.progress}%</span>
            </div>
            <div
              aria-hidden="true"
              className="h-2.5 overflow-hidden rounded-full bg-[#e6dccd]"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#6f9164_0%,#d68256_100%)] transition-[width] duration-500 ease-out"
                style={{ width: `${stage.progress}%` }}
              />
            </div>
            <p className="text-sm font-medium text-foreground">{stage.title}</p>
          </div>
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
  const initializationStage = useMemo<InitializationStage | null>(() => {
    if (session.isPending) {
      return {
        progress: 24,
        stepLabel: "Step 1 of 4",
        title: "Checking your session",
        detail:
          "Confirming your account access before the family workspace loads.",
      };
    }

    if (!sessionId) {
      return null;
    }

    if (isConvexAuthLoading) {
      return {
        progress: 48,
        stepLabel: "Step 2 of 4",
        title: "Syncing account access",
        detail: "Linking your Google sign-in with Shared Groceries.",
      };
    }

    if (isBootstrapping || bootstrappedKey !== bootstrapKey) {
      return {
        progress: inviteToken ? 76 : 72,
        stepLabel: "Step 3 of 4",
        title: inviteToken
          ? "Applying family invite"
          : "Loading family workspace",
        detail: inviteToken
          ? "Preparing the invited workspace and shared household data."
          : "Preparing your shared groceries, recipes, and planning space.",
      };
    }

    if (isAuthRoute) {
      return {
        progress: 100,
        stepLabel: "Step 4 of 4",
        title: "Opening your family hub",
        detail: "Routing you into the workspace now.",
      };
    }

    return null;
  }, [
    bootstrapKey,
    bootstrappedKey,
    inviteToken,
    isAuthRoute,
    isBootstrapping,
    isConvexAuthLoading,
    session.isPending,
    sessionId,
  ]);

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

    void bootstrapCurrentUser(inviteToken ? { inviteToken } : {})
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

  if (initializationError) {
    const retryPath = isAuthRoute
      ? buildAuthPath({ inviteToken, redirectTo: redirectTarget })
      : buildAuthPath({ redirectTo: `${currentPath}${currentSearch}` });

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md border-destructive/20">
          <CardContent className="space-y-4 p-6">
            <div>
              <h1 className="text-lg font-semibold">
                Workspace initialization failed
              </h1>
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
                  void authClient
                    .signOut()
                    .then(() => window.location.replace(retryPath))
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

  if (initializationStage) {
    return <InitializationLoader stage={initializationStage} />;
  }

  if (!sessionId) {
    return isAuthRoute ? <>{children}</> : null;
  }

  return <>{children}</>;
}
