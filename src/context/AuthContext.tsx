"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, fetchAuthSession, signOut, signIn, confirmSignUp } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import "@/lib/amplify-config"; // Ensure Amplify is configured

type UserInfo = { id: string; email?: string; role?: string } | null;

type AuthCtx = {
  token: string | null;
  user: UserInfo;
  isAuthLoading: boolean;
  login: () => void; // Deprecated, kept for compat or re-purposed for re-sync
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  async function checkUser() {
    try {
      const session = await fetchAuthSession();
      const currentUser = await getCurrentUser().catch(() => null);

      if (session.tokens?.idToken && currentUser) {
        setToken(session.tokens.idToken.toString());
        // For now, mapping userId to id. Cognito attributes need separate fetch if we want email specifically, 
        // but often claims have email.
        const email = session.tokens.idToken.payload.email as string | undefined;
        // Role management in Cognito is via Groups or Custom Attributes. 
        // For simplicity, we default role or parse from claims if available.
        const role = (session.tokens.idToken.payload["custom:role"] as string) || "user";

        setUser({
          id: currentUser.userId,
          email: email,
          role: role
        });
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking auth session", error);
      setToken(null);
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }

  useEffect(() => {
    checkUser();

    // Listen for auth events
    const listener = Hub.listen("auth", (data) => {
      switch (data.payload.event) {
        case "signedIn":
          checkUser();
          break;
        case "signedOut":
          setToken(null);
          setUser(null);
          break;
      }
    });

    return () => listener();
  }, []);

  const login = () => {
    // No-op or trigger check
    checkUser();
  };

  const logout = async () => {
    await signOut();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
