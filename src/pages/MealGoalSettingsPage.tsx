import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MealGoalSettingsForm } from "../components/meal-goals/MealGoalSettingsForm";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { authClient, buildAuthReturnUrl } from "../lib/auth";

type LinkedAccount = {
  providerId: string;
  accountId: string;
};

export function MealGoalSettingsPage() {
  const familyHub = useQuery(api.families.getFamilyHub, {});
  const familyPlanning = useQuery(
    api.nutritionGoals.getFamilyPlanningContext,
    {},
  );
  const authConfiguration = useQuery(api.auth.getAuthConfiguration, {});
  const [familyName, setFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [savingFamilyName, setSavingFamilyName] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateFamilyName = useMutation(api.families.updateFamilyName);
  const createInvite = useMutation(api.families.createInvite);
  const revokeInvite = useMutation(api.families.revokeInvite);
  const removeMember = useMutation(api.families.removeMember);

  useEffect(() => {
    if (familyHub?.family.name) {
      setFamilyName(familyHub.family.name);
    }
  }, [familyHub?.family.name]);

  useEffect(() => {
    let cancelled = false;
    setAccountLoading(true);
    void authClient
      .listAccounts()
      .then((result) => {
        if (!cancelled) {
          setLinkedAccounts((result.data ?? []) as LinkedAccount[]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAccountLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasGoogleLinked = useMemo(
    () => linkedAccounts.some((account) => account.providerId === "google"),
    [linkedAccounts],
  );

  const handleSaveFamilyName = async () => {
    if (!familyName.trim()) return;
    setSavingFamilyName(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      await updateFamilyName({ name: familyName.trim() });
      setMessage("Family name updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingFamilyName(false);
    }
  };

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const result = await createInvite({
        email: inviteEmail.trim()
          ? inviteEmail.trim().toLowerCase()
          : undefined,
      });
      setLastInviteUrl(result.inviteUrl);
      setInviteEmail("");
      setMessage(
        result.emailSent
          ? "Invite email sent."
          : "Invite created. Share the activation link below.",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyInvite = async (inviteUrl: string) => {
    await navigator.clipboard.writeText(inviteUrl);
    setMessage("Invite link copied.");
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    setErrorMessage(null);
    const callbackUrl = buildAuthReturnUrl({ redirectTo: "/family" });
    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: callbackUrl,
        errorCallbackURL: callbackUrl,
      });
      if (result.error) {
        throw new Error(
          result.error.message || "Google account linking failed.",
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setLinkingGoogle(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.replace("/auth");
  };

  if (!familyHub || !familyPlanning) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6">
      <PageHeader title="Family" />

      {(message || errorMessage) && (
        <Card
          className={
            errorMessage ? "border-destructive/20" : "border-primary/20"
          }
        >
          <CardContent className="p-4 text-sm">
            <p className={errorMessage ? "text-destructive" : "text-primary"}>
              {errorMessage ?? message}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-gradient-to-br from-white to-secondary/30">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                Shared workspace
              </div>
              <h2 className="mt-1 text-xl font-semibold">
                {familyHub.family.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Groceries, recipes, meal plans, and category learning are shared
                across everyone in this family.
              </p>
            </div>
            <Badge variant="secondary">{familyHub.viewer.role}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-card p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Members
              </div>
              <div className="mt-1 text-xl font-semibold">
                {familyPlanning.memberCount}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Targets saved
              </div>
              <div className="mt-1 text-xl font-semibold">
                {familyPlanning.membersWithTargets}
              </div>
            </div>
          </div>

          {familyPlanning.targets.kcal !== null && (
            <div className="rounded-2xl border bg-card p-3 text-sm text-muted-foreground">
              Household target:{" "}
              <span className="font-medium text-foreground">
                {familyPlanning.targets.kcal} kcal
              </span>
              {" / "}
              <span className="font-medium text-foreground">
                {familyPlanning.targets.protein}p
              </span>
              {" / "}
              <span className="font-medium text-foreground">
                {familyPlanning.targets.carbs}c
              </span>
              {" / "}
              <span className="font-medium text-foreground">
                {familyPlanning.targets.fat}f
              </span>
            </div>
          )}

          {familyHub.viewer.role === "owner" && (
            <div className="space-y-2">
              <Input
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                placeholder="Family name"
                className="h-10"
              />
              <Button
                type="button"
                onClick={() => void handleSaveFamilyName()}
                disabled={savingFamilyName || !familyName.trim()}
                className="w-full"
              >
                {savingFamilyName ? "Saving..." : "Save family name"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MealGoalSettingsForm />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">
              Family members
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each person keeps their own profile and food preferences. Meal
              generation combines them into one shared plan.
            </p>
          </div>

          <div className="space-y-3">
            {familyHub.members.map((member) => (
              <div
                key={member.betterAuthUserId}
                className="rounded-2xl border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{member.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.email ?? "Email hidden"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{member.role}</Badge>
                    {familyHub.viewer.role === "owner" &&
                      member.betterAuthUserId !==
                        familyHub.viewer.betterAuthUserId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void removeMember({
                              betterAuthUserId: member.betterAuthUserId,
                            })
                          }
                        >
                          Remove
                        </Button>
                      )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {member.dietPreference !== "none" && (
                    <Badge variant="secondary">{member.dietPreference}</Badge>
                  )}
                  {member.hardExclusions.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                  {!member.hasTargets && (
                    <Badge variant="outline">Targets missing</Badge>
                  )}
                </div>
                {member.preferenceNotes && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {member.preferenceNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {familyHub.viewer.role === "owner" && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground">
                Invites
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Invite someone by email or create a raw activation link. They
                can continue with Google to join this shared workspace.
              </p>
            </div>

            <div className="space-y-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="member@example.com"
                className="h-10"
              />
              <Button
                type="button"
                onClick={() => void handleCreateInvite()}
                disabled={creatingInvite}
                className="w-full"
              >
                {creatingInvite ? "Creating invite..." : "Create invite"}
              </Button>
            </div>

            {lastInviteUrl && (
              <div className="rounded-2xl border bg-secondary/35 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Latest activation link
                </div>
                <p className="mt-2 break-all text-sm font-medium">
                  {lastInviteUrl}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => void handleCopyInvite(lastInviteUrl)}
                >
                  Copy activation link
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {familyHub.invites.map((invite) => {
                const inviteUrl = `${window.location.origin}/auth?invite=${invite.token}`;
                return (
                  <div
                    key={invite._id}
                    className="rounded-2xl border bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {invite.email ?? "Shareable activation link"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Expires{" "}
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void revokeInvite({ inviteId: invite._id })
                        }
                      >
                        Revoke
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => void handleCopyInvite(inviteUrl)}
                    >
                      Copy invite link
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">
              Sign-in methods
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Google is the supported sign-in method. If this account was
              created before that change, link Google before signing out.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {accountLoading ? (
              <Badge variant="outline">Loading accounts...</Badge>
            ) : linkedAccounts.length > 0 ? (
              linkedAccounts.map((account) => (
                <Badge
                  key={`${account.providerId}-${account.accountId}`}
                  variant="secondary"
                >
                  {account.providerId}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">No linked providers listed yet</Badge>
            )}
          </div>

          {authConfiguration?.googleEnabled && !hasGoogleLinked && (
            <Button
              type="button"
              onClick={() => void handleLinkGoogle()}
              disabled={linkingGoogle}
              className="w-full"
            >
              {linkingGoogle
                ? "Redirecting to Google..."
                : "Link Google account"}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
