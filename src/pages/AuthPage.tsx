import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { cn } from "../lib/utils";
import {
  authClient,
  buildAuthReturnUrl,
  getCurrentInviteToken,
  getCurrentRedirectTarget,
} from "../lib/auth";

const workspaceHighlights: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: ShoppingCart,
    title: "Shared grocery flow",
    description:
      "Lists, stores, and category changes stay in sync for the whole household.",
  },
  {
    icon: CalendarDays,
    title: "Meal plans that stick",
    description:
      "Recipes and weekly planning live in the same workspace instead of scattered chats.",
  },
  {
    icon: Users,
    title: "One family workspace",
    description:
      "Invites land in the right hub so everyone sees the same groceries and targets.",
  },
];

const signInNotes = [
  "Google handles account access and recovery.",
  "Invite links activate the workspace on the selected account.",
  "You land directly in the shared family hub after sign-in.",
];

function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#efe4d4] text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#efe4d4_0%,#faf4eb_44%,#dde9d8_100%)]" />
      <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,#d68256_0%,rgba(214,130,86,0.18)_32%,transparent_68%)] blur-3xl" />
      <div className="absolute right-[-4rem] top-16 h-96 w-96 rounded-full bg-[radial-gradient(circle,#6f9164_0%,rgba(111,145,100,0.18)_28%,transparent_68%)] blur-3xl" />
      <div className="absolute bottom-[-5rem] left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,#f6d39b_0%,rgba(246,211,155,0.16)_36%,transparent_70%)] blur-3xl" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(78,63,41,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(78,63,41,0.12)_1px,transparent_1px)] [background-size:108px_108px]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M21.805 12.23c0-.76-.068-1.49-.195-2.192H12v4.146h5.49a4.697 4.697 0 0 1-2.038 3.082v2.56h3.297c1.93-1.778 3.056-4.4 3.056-7.596Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.075-.915 6.767-2.475l-3.297-2.56c-.915.614-2.086.978-3.47.978-2.667 0-4.926-1.801-5.733-4.223H2.858v2.641A10.218 10.218 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.267 13.72A6.134 6.134 0 0 1 5.946 12c0-.596.102-1.174.32-1.72V7.64H2.858A10.218 10.218 0 0 0 1.777 12c0 1.647.395 3.207 1.08 4.36l3.41-2.64Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.057c1.502 0 2.852.517 3.914 1.53l2.934-2.934C17.07 3 14.758 2 12 2 7.95 2 4.447 4.32 2.858 7.64l3.409 2.64c.807-2.422 3.066-4.223 5.733-4.223Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function HighlightCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[26px] border border-[#d9cbb5]/80 bg-white/72 p-4 shadow-[0_18px_40px_rgba(95,77,52,0.08)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-primary/10 bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className='font-["Avenir_Next","Segoe_UI",sans-serif] text-sm font-semibold text-foreground'>
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AuthBackdrop>
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6">
        <Card className="mx-auto w-full max-w-xl overflow-hidden rounded-[34px] border-white/70 bg-white/72 shadow-[0_36px_100px_rgba(76,58,34,0.16)] backdrop-blur-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-primary/15 bg-primary/10 text-primary shadow-[0_12px_40px_rgba(87,113,83,0.16)]">
                <LoaderCircle className="h-7 w-7 animate-spin" />
              </div>
              <Badge
                variant="secondary"
                className="mt-6 border border-white/70 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-primary/80"
              >
                Shared Groceries
              </Badge>
              <h1 className='mt-5 max-w-md font-["Iowan_Old_Style","Palatino_Linotype","Book_Antiqua",Palatino,serif] text-4xl leading-none tracking-[-0.04em] text-foreground sm:text-5xl'>
                {title}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthBackdrop>
  );
}

export function AuthPage() {
  const inviteToken = useMemo(() => getCurrentInviteToken(), []);
  const redirectTarget = useMemo(() => getCurrentRedirectTarget(), []);
  const authConfiguration = useQuery(api.auth.getAuthConfiguration, {});
  const invitePreview = useQuery(
    api.families.getInvitePreview,
    inviteToken ? { token: inviteToken } : "skip",
  );
  const session = authClient.useSession();
  const {
    isLoading: isConvexAuthLoading,
    isAuthenticated: isConvexAuthenticated,
  } = useConvexAuth();
  const acceptInvite = useMutation(api.families.acceptInvite);

  const [startingGoogle, setStartingGoogle] = useState(false);
  const [claimingInvite, setClaimingInvite] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteHandledForSession, setInviteHandledForSession] = useState<
    string | null
  >(null);

  const callbackUrl = buildAuthReturnUrl({
    inviteToken,
    redirectTo: redirectTarget,
  });

  useEffect(() => {
    if (!session.data?.session) {
      setInviteHandledForSession(null);
      return;
    }

    if (!inviteToken) {
      window.location.replace(redirectTarget);
      return;
    }

    if (isConvexAuthLoading) {
      return;
    }

    if (!isConvexAuthenticated) {
      setErrorMessage(
        "Your sign-in session could not be synced with the workspace. Reload and try again.",
      );
      return;
    }

    if (inviteHandledForSession === session.data.session.id) {
      return;
    }

    setClaimingInvite(true);
    setErrorMessage(null);
    void acceptInvite({ token: inviteToken })
      .then(() => {
        setInviteHandledForSession(session.data!.session.id);
        window.location.replace(redirectTarget);
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        setClaimingInvite(false);
      });
  }, [
    acceptInvite,
    isConvexAuthenticated,
    isConvexAuthLoading,
    inviteHandledForSession,
    inviteToken,
    redirectTarget,
    session.data?.session,
  ]);

  const handleGoogleSignIn = async () => {
    setStartingGoogle(true);
    setErrorMessage(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
        newUserCallbackURL: callbackUrl,
        errorCallbackURL: callbackUrl,
      });
      if (result.error) {
        throw new Error(result.error.message || "Google sign-in failed.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStartingGoogle(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.replace(callbackUrl);
  };

  if (
    session.isPending ||
    claimingInvite ||
    (session.data?.session && inviteToken && isConvexAuthLoading)
  ) {
    return (
      <LoadingPanel
        title="Preparing your family workspace"
        description={
          inviteToken
            ? "We’re validating the invite and opening the shared hub on the selected Google account."
            : "We’re restoring your session and loading the family workspace."
        }
      />
    );
  }

  const isInviteExpired = Boolean(invitePreview?.isExpired);
  const inviteStateLabel = inviteToken
    ? invitePreview === undefined
      ? "Checking invite"
      : isInviteExpired
        ? "Invite expired"
        : "Invite ready"
    : "Google-only access";
  const inviteStateDescription = inviteToken
    ? invitePreview === undefined
      ? "Validating the family invite before sign-in."
      : isInviteExpired
        ? "This invite is no longer active. Ask the family owner for a fresh link before continuing."
        : invitePreview?.email
          ? `This invite was prepared for ${invitePreview.email}. Continue with Google and the workspace will attach to that account.`
          : "Continue with Google and this family workspace will open on the selected account."
    : "Choose the Google account that should own or join this family workspace.";

  return (
    <AuthBackdrop>
      <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-white/68 p-6 shadow-[0_36px_100px_rgba(76,58,34,0.14)] backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="absolute right-6 top-6 hidden h-28 w-28 rounded-full border border-white/60 bg-[radial-gradient(circle,#ffffff_0%,#f2eadc_50%,transparent_72%)] sm:block" />

            <Badge
              variant="secondary"
              className="border border-white/70 bg-white/76 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-primary/80"
            >
              Family workspace
            </Badge>

            <div className="mt-6 max-w-xl">
              <h1 className='font-["Iowan_Old_Style","Palatino_Linotype","Book_Antiqua",Palatino,serif] text-[3.15rem] leading-[0.95] tracking-[-0.05em] text-foreground sm:text-[4.2rem]'>
                Dinner plans, grocery lists, and invites finally live in one
                calm place.
              </h1>
              <p className='mt-5 max-w-lg font-["Avenir_Next","Segoe_UI",sans-serif] text-[15px] leading-7 text-muted-foreground sm:text-base'>
                Shared Groceries is the family control room for meal planning,
                shopping, and nutrition. Sign in once with Google and everyone
                lands in the same workspace.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[26px] border border-[#d9cbb5]/80 bg-[#fffaf2]/88 p-4 shadow-[0_18px_50px_rgba(95,77,52,0.08)]">
                <div className="text-[11px] uppercase tracking-[0.28em] text-primary/70">
                  Shared
                </div>
                <div className='mt-3 font-["Iowan_Old_Style","Palatino_Linotype","Book_Antiqua",Palatino,serif] text-3xl leading-none text-foreground'>
                  1 hub
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Groceries, recipes, meal plans, and targets move together.
                </p>
              </div>
              <div className="rounded-[26px] border border-[#d9cbb5]/80 bg-[#fffaf2]/88 p-4 shadow-[0_18px_50px_rgba(95,77,52,0.08)]">
                <div className="text-[11px] uppercase tracking-[0.28em] text-primary/70">
                  Access
                </div>
                <div className='mt-3 font-["Iowan_Old_Style","Palatino_Linotype","Book_Antiqua",Palatino,serif] text-3xl leading-none text-foreground'>
                  Google
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Cleaner onboarding, simpler recovery, fewer account edge
                  cases.
                </p>
              </div>
              <div className="rounded-[26px] border border-[#d9cbb5]/80 bg-[#fffaf2]/88 p-4 shadow-[0_18px_50px_rgba(95,77,52,0.08)]">
                <div className="text-[11px] uppercase tracking-[0.28em] text-primary/70">
                  Invites
                </div>
                <div className='mt-3 font-["Iowan_Old_Style","Palatino_Linotype","Book_Antiqua",Palatino,serif] text-3xl leading-none text-foreground'>
                  Ready
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Family links open the right workspace without extra setup.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3">
              {workspaceHighlights.map((highlight) => (
                <HighlightCard key={highlight.title} {...highlight} />
              ))}
            </div>
          </section>

          <section className="relative">
            <Card className="overflow-hidden rounded-[34px] border-white/70 bg-[#faf3e8]/78 shadow-[0_36px_100px_rgba(76,58,34,0.16)] backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent" />
              <CardContent className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-primary/70">
                      Shared Groceries
                    </div>
                    <h2 className='mt-3 font-["Iowan_Old_Style","Palatino_Linotype","Book_Antiqua",Palatino,serif] text-[2.5rem] leading-none tracking-[-0.04em] text-foreground'>
                      Open your family hub
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                      Google is the only sign-in method for this workspace, so
                      everyone joins through the same clean entry point.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/80 p-3 shadow-[0_20px_48px_rgba(83,67,42,0.12)]">
                    <img
                      src="/nourishly-favicons/logo.svg"
                      alt="Nourishly logo"
                      className="h-10 w-auto"
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-6 rounded-[28px] border p-5 shadow-[0_18px_50px_rgba(94,73,43,0.08)]",
                    isInviteExpired
                      ? "border-destructive/20 bg-destructive/5"
                      : "border-[#ddceb6]/80 bg-white/74",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            isInviteExpired ? "destructive" : "secondary"
                          }
                          className={cn(
                            "px-3 py-1 text-[11px] uppercase tracking-[0.24em]",
                            !isInviteExpired &&
                              "border border-white/70 bg-white/76 text-primary/80",
                          )}
                        >
                          {inviteStateLabel}
                        </Badge>
                        {invitePreview?.familyName && (
                          <span className="text-sm font-medium text-foreground">
                            {invitePreview.familyName}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {inviteStateDescription}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border",
                        isInviteExpired
                          ? "border-destructive/15 bg-destructive/10 text-destructive"
                          : "border-primary/10 bg-primary/10 text-primary",
                      )}
                    >
                      {isInviteExpired ? (
                        <ShieldCheck className="h-5 w-5" />
                      ) : (
                        <Sparkles className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mt-4 rounded-[24px] border border-destructive/20 bg-destructive/5 p-4">
                    <p className="text-sm leading-6 text-destructive">
                      {errorMessage}
                    </p>
                    {session.data?.session && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleSignOut()}
                        className="mt-3 rounded-[16px]"
                      >
                        Use a different account
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-6 rounded-[30px] bg-[#33412f] p-4 text-white shadow-[0_30px_70px_rgba(36,46,32,0.32)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/60">
                        Sign in
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        Pick the Google account that should access this family
                        workspace.
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/15 bg-white/10 p-2.5 text-white/90">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4">
                    {authConfiguration === undefined ? (
                      <div className="flex h-14 items-center justify-center rounded-[20px] border border-white/15 bg-white/10 px-4 text-sm text-white/72">
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Checking Google sign-in configuration...
                      </div>
                    ) : authConfiguration.googleEnabled ? (
                      <Button
                        type="button"
                        onClick={() => void handleGoogleSignIn()}
                        disabled={startingGoogle || isInviteExpired}
                        className="group h-14 w-full justify-between rounded-[20px] bg-white px-4 text-left text-[#243121] shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-all hover:bg-[#f4efe7] hover:text-[#243121]"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f4efe7] shadow-inner">
                            <GoogleMark />
                          </span>
                          <span className="flex flex-col items-start">
                            <span className='font-["Avenir_Next","Segoe_UI",sans-serif] text-sm font-semibold'>
                              {startingGoogle
                                ? "Redirecting to Google..."
                                : "Continue with Google"}
                            </span>
                            <span className="text-xs text-[#566252]">
                              Secure access to the shared family workspace
                            </span>
                          </span>
                        </span>
                        <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                      </Button>
                    ) : (
                      <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 text-sm leading-6 text-white/78">
                        Google sign-in is not configured. Set `GOOGLE_CLIENT_ID`
                        and `GOOGLE_CLIENT_SECRET` for this deployment before
                        using the app.
                      </div>
                    )}
                  </div>

                  <p className="mt-3 px-1 text-xs leading-5 text-white/56">
                    After sign-in, Shared Groceries loads your family workspace
                    automatically.
                  </p>
                </div>

                <div className="mt-6 grid gap-3">
                  {signInNotes.map((note) => (
                    <div
                      key={note}
                      className="flex items-start gap-3 rounded-[22px] border border-[#ddceb6]/80 bg-white/72 p-4 shadow-[0_16px_40px_rgba(94,73,43,0.06)]"
                    >
                      <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {note}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </AuthBackdrop>
  );
}
