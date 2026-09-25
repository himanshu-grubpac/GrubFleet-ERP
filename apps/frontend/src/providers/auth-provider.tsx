"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { loginApi, refreshApi, logoutApi, getMeApi } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import type { AuthMeUser, AuthMeResponse } from "@grubpac/shared-types";

export interface GrubpacAuthContextType {
  authService?: unknown;

  showSuccess?: (
    message: string,
    description?: string,
    autoClose?: boolean
  ) => void;

  showError?: (message?: string) => void;

  getApiError?: (error: unknown) => string;

  setToken?: (token: string) => void;

  setAuthCookie?: (
    email: string,
    token: string,
    days?: number
  ) => void;

  login?: (data: {
    email: string;
    password: string;
  }) => Promise<{
    success: boolean;
    token: string;
    user: AuthMeUser | { id: string; email: string; name?: string };
  }>;

  refreshSession?: () => Promise<boolean>;

  /** Refetch `/auth/me` with the current access token (RBAC changes). */
  refetchMe?: () => Promise<boolean>;

  isAuthenticated?: boolean;

  isLoading?: boolean;

  token?: string | null;

  user?: {
    email?: string;
    id?: string;
    name?: string;
    fullName?: string | null;
  } | null;

  organizationId?: string | null;

  moduleAccess?: Record<string, string>;

  logout?: () => Promise<void>;

  // Navigation permissions
  permissions: Set<string>;
}

const GrubpacAuthContext =
  createContext<GrubpacAuthContextType | undefined>(undefined);

export function GrubpacAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<{
    email?: string;
    id?: string;
    name?: string;
    fullName?: string | null;
  } | null>(null);

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [moduleAccess, setModuleAccess] = useState<Record<string, string>>({});
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const permissionRevisionRef = React.useRef<number | null>(null);

  const router = useRouter();

  const applyMeData = useCallback((me: AuthMeResponse) => {
    const userObj = {
      id: me.user.id,
      email: me.user.email,
      fullName: me.user.fullName,
      name: me.user.fullName || me.user.email.split("@")[0],
    };
    setUser(userObj);

    const activeOrgId = me.memberships?.[0]?.organizationId || null;
    setOrganizationId(activeOrgId);

    const modMap: Record<string, string> = {};
    const permSet = new Set<string>(me.permissionKeys || []);

    if (me.moduleAccess && Array.isArray(me.moduleAccess)) {
      for (const entry of me.moduleAccess) {
        modMap[entry.moduleId] = entry.accessLevel;
      }
    }

    setModuleAccess(modMap);
    setPermissions(permSet);

    const activeMembership =
      me.memberships?.find((m) => m.organizationId === activeOrgId) ??
      me.memberships?.[0];
    if (activeMembership && typeof activeMembership.permissionRevision === "number") {
      permissionRevisionRef.current = activeMembership.permissionRevision;
    }

    try {
      localStorage.setItem("auth_user", JSON.stringify(userObj));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const savedRefreshToken = localStorage.getItem("refresh_token");
      if (!savedRefreshToken) return false;

      const tokenRes = await refreshApi(savedRefreshToken);
      setTokenState(tokenRes.accessToken);
      localStorage.setItem("access_token", tokenRes.accessToken);
      localStorage.setItem("refresh_token", tokenRes.refreshToken);

      const me = await getMeApi(tokenRes.accessToken);
      applyMeData(me);
      return true;
    } catch {
      return false;
    }
  }, [applyMeData]);

  const refetchMe = useCallback(async (): Promise<boolean> => {
    const accessToken = token ?? localStorage.getItem("access_token");
    if (!accessToken) {
      return false;
    }
    try {
      const me = await getMeApi(accessToken);
      applyMeData(me);
      return true;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        return refreshSession();
      }
      return false;
    }
  }, [token, applyMeData, refreshSession]);

  useEffect(() => {
    if (!token || isLoading) {
      return;
    }

    const onFocus = () => {
      void refetchMe();
    };
    window.addEventListener("focus", onFocus);
    const intervalId = window.setInterval(() => {
      void refetchMe();
    }, 10_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(intervalId);
    };
  }, [token, isLoading, refetchMe]);

  // Initial session hydration
  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const savedToken = localStorage.getItem("access_token");
        const savedUser = localStorage.getItem("auth_user");

        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            // Ignore parse errors
          }
        }

        if (savedToken) {
          setTokenState(savedToken);
          try {
            const me = await getMeApi(savedToken);
            if (mounted) {
              applyMeData(me);
            }
          } catch (err) {
            // If access token is expired (401), try refreshing
            if (err instanceof ApiClientError && err.status === 401) {
              const refreshed = await refreshSession();
              if (!refreshed && mounted) {
                // Refresh failed; clear credentials
                setTokenState(null);
                setUser(null);
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("auth_user");
              }
            }
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void hydrateSession();

    return () => {
      mounted = false;
    };
  }, [applyMeData, refreshSession]);

  const setToken = (newToken: string) => {
    setTokenState(newToken);
    try {
      localStorage.setItem("access_token", newToken);
    } catch {
      // Ignore localStorage write error
    }
  };

  const setAuthCookie = (
    email: string,
    tokenVal: string,
  ) => {
    setToken(tokenVal);
    const userObj = {
      email,
      name: email.split("@")[0],
    };
    setUser(userObj);
    try {
      localStorage.setItem("auth_user", JSON.stringify(userObj));
    } catch {
      // Ignore localStorage write error
    }
  };

  const login = async (data: {
    email: string;
    password: string;
  }) => {
    setIsLoading(true);

    try {
      // 1. Authenticate with backend
      const tokenPair = await loginApi(data);

      setTokenState(tokenPair.accessToken);
      try {
        localStorage.setItem("access_token", tokenPair.accessToken);
        localStorage.setItem("refresh_token", tokenPair.refreshToken);
      } catch {
        // Ignore localStorage write error
      }

      // 2. Fetch authenticated user profile & permissions
      let userObj = {
        id: "",
        email: data.email,
        name: data.email.split("@")[0],
      };

      try {
        const me = await getMeApi(tokenPair.accessToken);
        applyMeData(me);
        userObj = {
          id: me.user.id,
          email: me.user.email,
          name: me.user.fullName || me.user.email.split("@")[0],
        };
      } catch {
        setUser(userObj);
      }

      router.push("/dashboard");

      return {
        success: true,
        token: tokenPair.accessToken,
        user: userObj,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const currentToken = token;
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") || undefined : undefined;

    // Reset local state first
    setTokenState(null);
    setUser(null);
    setOrganizationId(null);
    setModuleAccess({});
    setPermissions(new Set());

    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_user");
    } catch {
      // Ignore localStorage removal errors
    }

    // Attempt server logout in the background
    if (currentToken) {
      try {
        await logoutApi(currentToken, refreshToken);
      } catch {
        // Ignore backend logout network error
      }
    }

    router.push("/login");
  };

  const showSuccess = (message: string) => {
    console.log("[Auth Success]:", message);
  };

  const showError = (message?: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Auth Warning]:", message);
    }
  };

  const getApiError = (error: unknown): string => {
    if (error instanceof ApiClientError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "An unexpected error occurred";
  };

  return (
    <GrubpacAuthContext.Provider
      value={{
        isAuthenticated: !!token,
        isLoading,
        token,
        user,
        organizationId,
        moduleAccess,
        permissions,

        setToken,
        setAuthCookie,
        login,
        logout,
        refreshSession,
        refetchMe,
        showSuccess,
        showError,
        getApiError,
      }}
    >
      {children}
    </GrubpacAuthContext.Provider>
  );
}

export function useGrubpacAuth(): GrubpacAuthContextType {
  const context = useContext(GrubpacAuthContext);

  if (!context) {
    throw new Error(
      "useGrubpacAuth must be used within a GrubpacAuthProvider"
    );
  }

  return context;
}

/** Aliases for convenience */
export const AuthProvider = GrubpacAuthProvider;
export const useAuth = useGrubpacAuth;

/** Guard to redirect unauthenticated users to /login */
export function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useGrubpacAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-500">
          Checking session...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}