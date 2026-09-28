"use client";

import { Menu, LogOut } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";

export function Header() {
  const { isAuthenticated, isLoggingOut, logout } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      {/* Mobile Header */}
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="primary"
          size="sm"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="font-semibold text-slate-900">
          GrubPac ERP
        </span>
      </div>

      <div className="hidden flex-1 md:block" aria-hidden />

      {/* Mobile-only logout; desktop uses sidebar account menu */}
      <div className="ml-auto flex items-center gap-2 md:hidden">
        {isAuthenticated || isLoggingOut ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoggingOut}
            onClick={() => void logout?.()}
            className="!border-slate-200 !text-slate-700 hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            {isLoggingOut ? "Signing out…" : "Log out"}
          </Button>
        ) : null}
      </div>
    </header>
  );
}