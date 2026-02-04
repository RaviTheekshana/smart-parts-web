"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

type Claims = {
  sub?: string;
  email?: string;
  "cognito:groups"?: string[] | string;
};

type UserInfo = { id: string; email?: string; role?: string } | null;

type AuthCtx = {
  token: string | null; // Cognito ID token (JWT)
  user: UserInfo;
  isAuthLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

function normalizeGroups(groups: Claims["cognito:groups"]): string[] {
  if (!groups) return [];
  if (Array.isArray(groups)) return groups;
  return String(groups).split(",").map((g) => g.trim()).filter(Boolean);
}

function roleFromGroups(groups: string[]) {
  return groups.includes("admin") ? "admin" : "customer";
}

function decodeUser(idToken: string | null): UserInfo {
  if (!idToken) return null;
  try {
    const c = jwtDecode<Claims>(idToken);
    const groups = normalizeGroups(c["cognito:groups"]);
    return { id: c.sub || "", email: c.email, role: roleFromGroups(groups) };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  async function refresh() {
    try {
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString() ?? null;
      setToken(idToken);
      setUser(decodeUser(idToken));
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { signIn } = await import("aws-amplify/auth");
    await signIn({ username: email, password });
    await refresh();
  };

  const signUp: AuthCtx["signUp"] = async (name, email, password) => {
    const { signUp } = await import("aws-amplify/auth");
    const out = await signUp({
      username: email,
      password,
      options: { userAttributes: { email, name } },
    });
    return { needsConfirmation: out?.isSignUpComplete === false };
  };

  const confirmSignUp: AuthCtx["confirmSignUp"] = async (email, code) => {
    const { confirmSignUp } = await import("aws-amplify/auth");
    await confirmSignUp({ username: email, confirmationCode: code });
  };

  const logout: AuthCtx["logout"] = async () => {
    const { signOut } = await import("aws-amplify/auth");
    await signOut();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthLoading, signIn, signUp, confirmSignUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
