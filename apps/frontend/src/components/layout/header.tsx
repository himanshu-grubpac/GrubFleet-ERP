"use client";

import Link from "next/link";
import { Menu, LogOut, User } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
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

      {/* User Information */}
      <div className="hidden items-center gap-2 text-sm text-slate-600 md:flex">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-[#FE5720]">
          <User className="h-4 w-4" />
        </div>

        <span>
          Signed in as{" "}
          <strong className="font-semibold text-slate-900">
            {user?.email || (isAuthenticated ? "Admin" : "Guest")}
          </strong>
        </span>
      </div>

      {/* Auth Actions */}
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={logout}
            className="!border-slate-200 !text-slate-700 hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        ) : (
          <Link href="/login">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="!bg-[#FE5720] !text-white hover:!bg-[#E64A19]"
            >
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}