"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import { useAuth } from "@/lib/auth-context";
=======
import { AuthBootstrapLoader } from "@/components/states/auth-bootstrap-loader";
import { useAuth } from "@/providers/auth-provider";
>>>>>>> origin/develop

export default function HomePage() {
  const { isAuthenticated, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isLoggingOut) {
      return;
    }

    if (isAuthenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, isLoggingOut, router]);

  if (isLoggingOut) {
    return <AuthBootstrapLoader layout="minimal" phase="sign-out" />;
  }

  return <AuthBootstrapLoader layout="minimal" phase="boot" />;
}