import { ReactNode, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";

export function InitializationGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checkingCookie, setCheckingCookie] = useState(true);

  const isPasswordSet: boolean | undefined = useQuery(
    api.groceries.isPasswordSet,
    {}
  );

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )sgl_logged_in=([^;]*)/);
    const logged = match?.[1] === "1";
    setUnlocked(!!logged);
    setCheckingCookie(false);
  }, []);

  const initializeApp = useMutation(api.groceries.initializeApp);
  const verifyPassword = useMutation(api.groceries.verifyPassword);
  const setAppPassword = useMutation(api.groceries.setAppPassword);

  useEffect(() => {
    if (unlocked) {
      void initializeApp();
    }
  }, [unlocked, initializeApp]);

  const [passwordInput, setPasswordInput] = useState("");
  const [settingPassword, setSettingPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleVerify = async () => {
    setSubmitting(true);
    try {
      const ok: boolean = await verifyPassword({ password: passwordInput });
      if (ok) {
        document.cookie = "sgl_logged_in=1; path=/; max-age=2592000";
        setUnlocked(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async () => {
    if (!settingPassword.trim()) return;
    setSubmitting(true);
    try {
      await setAppPassword({ password: settingPassword.trim() });
      document.cookie = "sgl_logged_in=1; path=/; max-age=2592000";
      setUnlocked(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!unlocked && (checkingCookie || isPasswordSet === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
          <div className="text-center mb-6">
            <h1 className="mb-2 text-2xl font-bold">
              🛒 Grocery List
            </h1>
            <p className="text-muted-foreground">
              {isPasswordSet
                ? "Enter password to continue"
                : "Set an access password"}
            </p>
          </div>
          {isPasswordSet ? (
            <div className="space-y-3">
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                className="h-11"
              />
              <Button
                type="button"
                onClick={() => void handleVerify()}
                disabled={submitting}
                className="h-11 w-full"
              >
                {submitting ? "Checking..." : "Unlock"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                type="password"
                value={settingPassword}
                onChange={(e) => setSettingPassword(e.target.value)}
                placeholder="Create a password"
                className="h-11"
              />
              <Button
                type="button"
                onClick={() => void handleSetPassword()}
                disabled={submitting}
                className="h-11 w-full"
              >
                {submitting ? "Saving..." : "Set Password"}
              </Button>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
