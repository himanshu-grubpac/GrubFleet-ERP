"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthBootstrapLoader } from "@/components/states/auth-bootstrap-loader";
import { useAuth } from "@/providers/auth-provider";

export default function HomePage() {
  const { isAuthenticated, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isLoggingOut) {
      return;
    }

    if (isAuthenticated) {
      router.replace("/dashboard/");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, isLoggingOut, router]);

  if (isLoggingOut) {
    return <AuthBootstrapLoader layout="login" phase="sign-out" />;
  }

  if (isAuthenticated) {
    return <AuthBootstrapLoader layout="dashboard" phase="boot" />;
  }

  return <AuthBootstrapLoader layout="login" phase="boot" />;
}