"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmailInput,
  PasswordInput,
} from "@grubpac/ui-kit";

import { Loader2 } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { AuthBootstrapLoader } from "@/components/states/auth-bootstrap-loader";
import {
  AuthSessionTopBar,
} from "@/components/states/auth-session-progress";
import { LoginCardSkeleton } from "@/components/states/skeleton";
import { useGrubpacAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const {
    login,
    isLoading,
    isAuthenticated,
    isAuthenticating,
    isLoggingOut,
    finishLogoutTransition,
    showError,
    getApiError,
  } = useGrubpacAuth();

  useEffect(() => {
    finishLogoutTransition?.();
  }, [finishLogoutTransition]);

  useEffect(() => {
    if (!isLoading && !isLoggingOut && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isLoggingOut, isAuthenticated, router]);

  if (isLoggingOut) {
    return <AuthBootstrapLoader layout="minimal" phase="sign-out" />;
  }

  if (isLoading) {
    return <LoginCardSkeleton />;
  }

  if (isAuthenticated) {
    return <AuthBootstrapLoader layout="minimal" phase="sign-in" />;
  }

  const formBusy = isSubmitting || isAuthenticating;
  const canSubmit =
    email.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formBusy) {
      return;
    }

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      if (login) {
        await login({ email, password });
      }
    } catch (err: unknown) {
      const msg = getApiError
        ? getApiError(err)
        : err instanceof Error
          ? err.message
          : "Invalid credentials";

      setError(msg);

      if (showError) {
        showError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        {isAuthenticating ? (
          <div
            className="absolute inset-0 z-10 flex flex-col overflow-hidden rounded-2xl bg-white/85"
            aria-busy="true"
            aria-live="polite"
          >
            <AuthSessionTopBar className="shrink-0" />
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Loader2
                className="h-8 w-8 animate-spin text-[#FE5720]"
                aria-hidden
              />
              <p className="text-sm font-medium text-slate-700">Signing in…</p>
              <span className="sr-only">Signing in</span>
            </div>
          </div>
        ) : null}

        {/* Header */}
        <div className="mb-6 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[#FE5720]">
            GrubPac
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to ERP
          </h1>

          <p className="text-sm text-slate-500">
            Enter your credentials to access fleet & operations.
          </p>
        </div>

        {/* Error */}
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={formBusy}>

          {/* Email */}
          <EmailInput
            label="Email address"
            placeholder="admin@grubpac.local"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            disabled={formBusy}
            required
          />

          {/* Password */}
          <PasswordInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            disabled={formBusy}
            required
          />

          {/* Sign In Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!canSubmit || formBusy}
            >
              {isSubmitting || isAuthenticating ? "Signing in..." : "Sign In"}
            </Button>
          </div>

          {/* Temporary Dashboard Link removed */}

        </form>
      </div>
    </div>
  );
}