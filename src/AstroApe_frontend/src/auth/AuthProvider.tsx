import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
import type { Identity } from "@dfinity/agent";

type AuthContextValue = {
  authClient: AuthClient | null;
  isReady: boolean;
  isAuthenticated: boolean;
  identity: Identity | null;
  principalId: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const II_URL = import.meta.env.VITE_II_URL || "https://id.ai/";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [principalId, setPrincipalId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const client = await AuthClient.create({
        idleOptions: { idleTimeout: 30 * 60 * 1000, disableDefaultIdleCallback: true },
      });
      setAuthClient(client);

      if (await client.isAuthenticated()) {
        const id = client.getIdentity();
        setIdentity(id);
        setIsAuthenticated(true);
        setPrincipalId(id.getPrincipal().toString());
      }
      setIsReady(true);
    })();
  }, []);

  const login = async () => {
    if (!authClient) return;
    await authClient.login({
      identityProvider: II_URL,
      onSuccess: () => {
        const id = authClient.getIdentity();
        setIdentity(id);
        setIsAuthenticated(true);
        setPrincipalId(id.getPrincipal().toString());
      },
    });
  };

  const logout = async () => {
    if (!authClient) return;
    await authClient.logout();
    setIsAuthenticated(false);
    setIdentity(null);
    setPrincipalId(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ authClient, isReady, isAuthenticated, identity, principalId, login, logout }),
    [authClient, isReady, isAuthenticated, identity, principalId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
