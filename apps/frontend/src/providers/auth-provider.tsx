"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { AuthBootstrapLoader } from "@/components/states/auth-bootstrap-loader";
import { loginApi, refreshApi, logoutApi, getMeApi } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import type { AuthMeUser, AuthMeResponse } from "@grubpac/shared-types";

function clearAuthStorage(): void {
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
  } catch {
    // Ignore localStorage removal errors
  }
}

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

  /** Initial app boot: read storage + validate token once. Not login submit. */
  isLoading?: boolean;

  /**
   * True during boot when localStorage had an access token pending validation.
   * Used by ProtectedRoute for dashboard shell skeleton — not for /login.
   */
  sessionRestoreHint?: boolean;

  /** True while clearing session and navigating to login (avoids stale dashboard chrome). */
  isLoggingOut?: boolean;

  /** True during credential login + /auth/me before navigation completes. */
  isAuthenticating?: boolean;

  /** Login route calls this after mount to clear logout transition loaders. */
  finishLogoutTransition?: () => void;

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
  const [sessionRestoreHint, setSessionRestoreHint] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const permissionRevisionRef = React.useRef<number | null>(null);

  const mountedRef = useRef(true);
  const refetchInFlightRef = useRef(false);
  const logoutInProgressRef = useRef(false);
  const loginInFlightRef = useRef(false);

  const router = useRouter();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyMeData = useCallback((me: AuthMeResponse) => {
    if (!mountedRef.current) {
      return;
    }

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
      if (!mountedRef.current) {
        return false;
      }

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
    if (refetchInFlightRef.current || !mountedRef.current) {
      return false;
    }

    const accessToken = token ?? localStorage.getItem("access_token");
    if (!accessToken) {
      return false;
    }

    refetchInFlightRef.current = true;
    try {
      const me = await getMeApi(accessToken);
      if (!mountedRef.current) {
        return false;
      }
      applyMeData(me);
      return true;
    } catch (err) {
      if (!mountedRef.current) {
        return false;
      }
      if (err instanceof ApiClientError && err.status === 401) {
        return refreshSession();
      }
      return false;
    } finally {
      refetchInFlightRef.current = false;
    }
  }, [token, applyMeData, refreshSession]);

  useEffect(() => {
    if (!token || isLoading || isLoggingOut) {
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
  }, [token, isLoading, isLoggingOut, refetchMe]);

  // Initial session hydration — do not set token until /auth/me (or refresh) succeeds.
  useEffect(() => {
    let hydrateMounted = true;

    async function hydrateSession() {
      const savedToken = localStorage.getItem("access_token");
      if (hydrateMounted && mountedRef.current) {
        setSessionRestoreHint(!!savedToken);
      }

      try {
        if (savedToken) {
          try {
            const me = await getMeApi(savedToken);
            if (hydrateMounted && mountedRef.current) {
              setTokenState(savedToken);
              applyMeData(me);
            }
          } catch (err) {
            if (!hydrateMounted || !mountedRef.current) {
              return;
            }
            if (err instanceof ApiClientError && err.status === 401) {
              const refreshed = await refreshSession();
              if (!refreshed && hydrateMounted && mountedRef.current) {
                setTokenState(null);
                setUser(null);
                clearAuthStorage();
              }
            }
          }
        }
      } finally {
        if (hydrateMounted && mountedRef.current) {
          setSessionRestoreHint(false);
          setIsLoading(false);
        }
      }
    }

    void hydrateSession();

    return () => {
      hydrateMounted = false;
    };
  }, [applyMeData, refreshSession]);

  const setToken = useCallback((newToken: string) => {
    setTokenState(newToken);
    try {
      localStorage.setItem("access_token", newToken);
    } catch {
      // Ignore localStorage write error
    }
  }, []);

  const setAuthCookie = useCallback((
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
  }, [setToken]);

  const login = useCallback(async (data: {
    email: string;
    password: string;
  }) => {
    if (loginInFlightRef.current) {
      throw new Error("Sign-in already in progress.");
    }

    loginInFlightRef.current = true;
    setIsAuthenticating(true);

    try {
      const tokenPair = await loginApi(data);

      let me: AuthMeResponse;
      try {
        me = await getMeApi(tokenPair.accessToken);
      } catch (meErr) {
        // Production-safe: do not persist tokens without a validated /auth/me session.
        clearAuthStorage();
        if (mountedRef.current) {
          setTokenState(null);
          setUser(null);
          setOrganizationId(null);
          setModuleAccess({});
          setPermissions(new Set());
        }
        const message =
          meErr instanceof ApiClientError
            ? meErr.message
            : "Could not load your account. Please try again.";
        throw new Error(message);
      }

      if (!mountedRef.current) {
        throw new Error("Sign-in was interrupted. Please try again.");
      }

      setTokenState(tokenPair.accessToken);
      try {
        localStorage.setItem("access_token", tokenPair.accessToken);
        localStorage.setItem("refresh_token", tokenPair.refreshToken);
      } catch {
        // Ignore localStorage write error
      }

      applyMeData(me);

      const userObj = {
        id: me.user.id,
        email: me.user.email,
        fullName: me.user.fullName,
        name: me.user.fullName || me.user.email.split("@")[0],
      };

      router.replace("/dashboard/");

      return {
        success: true,
        token: tokenPair.accessToken,
        user: userObj,
      };
    } finally {
      loginInFlightRef.current = false;
      if (mountedRef.current) {
        setIsAuthenticating(false);
      }
    }
  }, [applyMeData, router]);

  const finishLogoutTransition = useCallback(() => {
    logoutInProgressRef.current = false;
    if (mountedRef.current) {
      setIsLoggingOut(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (logoutInProgressRef.current) {
      return;
    }
    logoutInProgressRef.current = true;
    setIsLoggingOut(true);

    const currentToken = token;
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refresh_token") || undefined
        : undefined;

    setTokenState(null);
    setUser(null);
    setOrganizationId(null);
    setModuleAccess({});
    setPermissions(new Set());
    clearAuthStorage();

    router.replace("/login");

    if (currentToken) {
      try {
        await logoutApi(currentToken, refreshToken);
      } catch {
        // Ignore backend logout network error
      }
    }
  }, [token, router]);

  const showSuccess = useCallback((message: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Auth Success]:", message);
    }
  }, []);

  const showError = useCallback((message?: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Auth Warning]:", message);
    }
  }, []);

  const getApiError = useCallback((error: unknown): string => {
    if (error instanceof ApiClientError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "An unexpected error occurred";
  }, []);

  const contextValue = useMemo<GrubpacAuthContextType>(
    () => ({
      isAuthenticated: !!token,
      isLoading,
      sessionRestoreHint,
      isLoggingOut,
      isAuthenticating,
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
      finishLogoutTransition,
      showSuccess,
      showError,
      getApiError,
    }),
    [
      token,
      isLoading,
      sessionRestoreHint,
      isLoggingOut,
      isAuthenticating,
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
      finishLogoutTransition,
      showSuccess,
      showError,
      getApiError,
    ],
  );

  return (
    <GrubpacAuthContext.Provider value={contextValue}>
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
  const { isAuthenticated, isLoading, isLoggingOut, sessionRestoreHint } =
    useGrubpacAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoggingOut) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, isLoggingOut, router]);

  if (isLoggingOut) {
    return <AuthBootstrapLoader layout="login" phase="sign-out" />;
  }

  if (isLoading) {
    if (isAuthenticated || sessionRestoreHint) {
      return <AuthBootstrapLoader layout="dashboard" phase="boot" />;
    }
    return <AuthBootstrapLoader layout="minimal" phase="boot" />;
  }

  if (!isAuthenticated) {
    return <AuthBootstrapLoader layout="minimal" phase="boot" />;
  }

  return <>{children}</>;
}
