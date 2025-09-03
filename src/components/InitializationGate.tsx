import { ReactNode, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🛒 Grocery List
            </h1>
            <p className="text-gray-600">
              {isPasswordSet
                ? "Enter password to continue"
                : "Set an access password"}
            </p>
          </div>
          {isPasswordSet ? (
            <div className="space-y-3">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
              />
              <button
                onClick={() => void handleVerify()}
                disabled={submitting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base"
              >
                {submitting ? "Checking..." : "Unlock"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                value={settingPassword}
                onChange={(e) => setSettingPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
              />
              <button
                onClick={() => void handleSetPassword()}
                disabled={submitting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-base"
              >
                {submitting ? "Saving..." : "Set Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
