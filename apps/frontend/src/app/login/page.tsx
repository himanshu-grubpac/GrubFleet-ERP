"use client";

import { useState } from "react";
import Link from "next/link";
import {
  EmailInput,
  PasswordInput,
} from "@grubpac/ui-kit";

import Button from "@/components/ui/GrubpacButton";
import { useGrubpacAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login, isLoading, showError } = useGrubpacAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setError("");

    try {
      if (login) {
        await login({ email, password });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid credentials";

      setError(msg);

      if (showError) {
        showError(msg);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">

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
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <EmailInput
            label="Email address"
            placeholder="admin@grubpac.com"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
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
            required
          />

          {/* Sign In Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={isLoading}
              className="!bg-[#FE5720] !text-white hover:!bg-[#E64A19]"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </div>

          {/* Temporary Dashboard Link */}
          <div className="pt-2 text-center">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-[#FE5720] hover:underline"
            >
              Skip to dashboard →
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}