
"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

interface LayoutHeaderProps {
  onMenuClick?: () => void;
}

function headerUserInitials(
  fullName?: string | null,
  email?: string,
): string {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
    }
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.trim().charAt(0).toUpperCase() || "U";
  }
  return "U";
}

export default function LayoutHeader({
  onMenuClick,
}: LayoutHeaderProps) {
  const { isAuthenticated, isLoggingOut, logout, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const userName = useMemo(
    () =>
      user?.fullName?.trim() ||
      user?.name?.trim() ||
      user?.email?.trim() ||
      "Account",
    [user?.email, user?.fullName, user?.name],
  );
  const userEmail = user?.email?.trim() ?? "";
  const userInitial = headerUserInitials(
    user?.fullName ?? user?.name,
    user?.email,
  );

  const handleLogout = () => {
    if (isLoggingOut) return;

    setProfileOpen(false);
    void logout?.();
  };

  return (
    <header className="relative z-30 flex min-h-[64px] min-w-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      {/* Left: Mobile Navigation */}
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FE5720] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Right: Search and Profile Actions */}
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
        {/* Global Search */}
        <div className="relative hidden w-full max-w-xl min-w-0 sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search across Fleet Pulse..."
            aria-label="Global search"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#FE5720] focus:bg-white focus:ring-2 focus:ring-[#FE5720]/10"
          />
        </div>

        {/* Mobile Search */}
        <button
          type="button"
          aria-label="Focus global search"
          onClick={() => {
            const searchInput =
              document.querySelector<HTMLInputElement>(
                'input[aria-label="Global search"]',
              );

            searchInput?.focus();
          }}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 sm:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {/* Profile Dropdown */}
        {isAuthenticated && (
          <div
            className="group relative shrink-0"
            onMouseEnter={() => setProfileOpen(true)}
            onMouseLeave={() => setProfileOpen(false)}
          >
            {/* Profile Trigger */}
            <button
              type="button"
              onClick={() =>
                setProfileOpen((open) => !open)
              }
              aria-label={`Profile menu for ${userName}`}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 transition-colors hover:bg-slate-50",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FE5720]",
              )}
            >
              {/* Circular Avatar */}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
                {userInitial}
              </span>

              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-500 transition-transform duration-150",
                  profileOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown with Connected Hover Area */}
            <div
              className={cn(
                "invisible absolute right-0 top-full z-50 w-64 pt-2 opacity-0 transition-all duration-150",
                "group-hover:visible group-hover:opacity-100",
                "group-focus-within:visible group-focus-within:opacity-100",
                profileOpen &&
                "visible translate-y-0 opacity-100",
              )}
            >
              <div
                role="menu"
                aria-label="Profile options"
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
              >
                {/* User Information */}
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-base font-semibold text-slate-900">
                    {userName}
                  </p>
                  {userEmail ? (
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {userEmail}
                    </p>
                  ) : null}
                </div>

                {/* Logout */}
                <button
                  type="button"
                  role="menuitem"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut className="h-5 w-5" />
                  <span>
                    {isLoggingOut
                      ? "Signing out..."
                      : "Logout"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
