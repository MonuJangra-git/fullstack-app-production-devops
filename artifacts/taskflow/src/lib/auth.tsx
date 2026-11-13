import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, otp: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function authRequest(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`/api/auth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | null;
  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? "Authentication failed");
  }
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void authRequest("get-session")
      .then((data) => {
        const session = data as { user?: AuthUser } | null;
        setUser(session?.user ?? null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        const data = (await authRequest("sign-in/email", {
          email,
          password,
        })) as { user: AuthUser };
        setUser(data.user);
      },
      async signUp(name, email, password) {
        const data = (await authRequest("sign-up/email", {
          name,
          email,
          password,
        })) as { user: AuthUser };
        setUser(data.user);
      },
      async requestPasswordReset(email) {
        await authRequest("email-otp/request-password-reset", { email });
      },
      async verifyPasswordResetOtp(email, otp) {
        await authRequest("email-otp/check-verification-otp", {
          email,
          otp,
          type: "forget-password",
        });
      },
      async resetPassword(email, otp, password) {
        await authRequest("email-otp/reset-password", {
          email,
          otp,
          password,
        });
      },
      async signOut() {
        await authRequest("sign-out", {});
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
