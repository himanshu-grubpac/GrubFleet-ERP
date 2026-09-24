"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";

export interface GrubpacAuthContextType {
  authService?: any;

  showSuccess?: (
    message: string,
    description?: string,
    autoClose?: boolean
  ) => void;

  showError?: (message?: string) => void;

  getApiError?: (error: any) => string;

  setToken?: (token: string) => void;

  setAuthCookie?: (
    email: string,
    token: string,
    days: number
  ) => void;

  login?: (data: {
    email: string;
    password: string;
  }) => Promise<any>;

  refreshSession?: () => Promise<boolean>;

  isAuthenticated?: boolean;

  isLoading?: boolean;

  token?: string | null;

  user?: {
    email?: string;
    id?: string;
    name?: string;
  } | null;

  logout?: () => void;

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
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Currently no backend permissions are being loaded.
  // Empty Set means all navigation items are allowed.
  const [permissions] = useState<Set<string>>(new Set());

  const router = useRouter();

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("access_token");
      const savedUser = localStorage.getItem("auth_user");

      if (savedToken) {
        setTokenState(savedToken);

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      }
    } catch {
      // Ignore localStorage read errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setToken = (newToken: string) => {
    setTokenState(newToken);

    try {
      localStorage.setItem("access_token", newToken);
    } catch { }
  };

  const setAuthCookie = (
    email: string,
    tokenVal: string,
    days: number = 7
  ) => {
    try {
      setToken(tokenVal);

      const userObj = {
        email,
        name: email.split("@")[0],
      };

      setUser(userObj);

      localStorage.setItem(
        "auth_user",
        JSON.stringify(userObj)
      );
    } catch { }
  };

  const login = async (data: {
    email: string;
    password: string;
  }) => {
    setIsLoading(true);

    try {
      // Mock login for frontend development
      const mockToken = "mock-jwt-token-grubpac";

      const mockUser = {
        email: data.email,
        id: "1",
        name: data.email.split("@")[0],
      };

      setTokenState(mockToken);
      setUser(mockUser);

      localStorage.setItem(
        "access_token",
        mockToken
      );

      localStorage.setItem(
        "auth_user",
        JSON.stringify(mockUser)
      );

      router.push("/dashboard");

      return {
        success: true,
        token: mockToken,
        user: mockUser,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setTokenState(null);
    setUser(null);

    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_user");
    } catch { }

    router.push("/login");
  };

  const showSuccess = (message: string) => {
    console.log("[Auth Success]:", message);
  };

  const showError = (message?: string) => {
    console.error("[Auth Error]:", message);
  };

  const getApiError = (error: any): string => {
    return (
      error?.response?.data?.message ||
      error?.message ||
      "An error occurred"
    );
  };

  return (
    <GrubpacAuthContext.Provider
      value={{
        isAuthenticated: !!token,
        isLoading,
        token,
        user,

        // Permissions
        permissions,

        setToken,
        setAuthCookie,
        login,
        logout,
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