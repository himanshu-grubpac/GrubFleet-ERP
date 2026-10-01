"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    LogOut,
} from "lucide-react";

import {
    mainNavItems,
    filterNavByPermissions,
    type NavItem,
} from "@/lib/navigation/modules";
import { isNavHrefActive } from "@/lib/navigation/nav-path-match";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

function userInitials(
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
        return email.slice(0, 2).toUpperCase();
    }
    return "?";
}

export type SidebarProps = {
    collapsed: boolean;
    onToggleCollapsed: () => void;
};

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {

    const pathname = usePathname();
    const { permissions, isAuthenticated, isLoggingOut, user, logout } =
        useAuth();

    const items = filterNavByPermissions(
        mainNavItems,
        isAuthenticated && permissions.size > 0 ? permissions : null,
    );

    return (
        <aside
            className={cn(
                "hidden h-full shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col",
                "transition-[width] duration-200 ease-in-out",
                collapsed ? "w-16" : "w-64",
            )}
            aria-label="Sidebar"
        >
            <div
                className={cn(
                    "shrink-0 border-b border-slate-200",
                    collapsed ? "px-2 py-2" : "px-3 py-2",
                )}
            >
                <button
                    type="button"
                    onClick={onToggleCollapsed}
                    aria-expanded={!collapsed}
                    aria-controls="erp-sidebar-nav"
                    aria-label={collapsed ? "Expand menu" : "Collapse menu"}
                    title={collapsed ? "Expand menu" : "Collapse menu"}
                    className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600",
                        "transition-colors hover:bg-slate-100 hover:text-slate-900",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FE5720]",
                        collapsed && "justify-center",
                    )}
                >
                    {collapsed ? (
                        <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                    ) : (
                        <>
                            <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
                            <span className="truncate">Collapse menu</span>
                        </>
                    )}
                </button>
            </div>

            <div
                className={cn(
                    "border-b border-slate-200",
                    collapsed ? "px-2 py-4 text-center" : "px-4 py-5",
                )}
            >
                {collapsed ? (
                    <p
                        className="text-sm font-bold text-[#FE5720]"
                        title="GrubPac ERP Platform"
                    >
                        GP
                    </p>
                ) : (
                    <>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#FE5720]">
                            GrubPac
                        </p>
                        <h1 className="text-lg font-bold text-slate-900">ERP Platform</h1>
                    </>
                )}
            </div>

            <nav
                id="erp-sidebar-nav"
                className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3"
                aria-label="Main"
            >
                {items.map((item) => (
                    <SidebarItem
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        collapsed={collapsed}
                    />
                ))}
            </nav>

            {(isAuthenticated || isLoggingOut) && (
                <SidebarAccountFooter
                    collapsed={collapsed}
                    displayName={
                        user?.fullName?.trim() ||
                        user?.name?.trim() ||
                        user?.email?.trim() ||
                        "Account"
                    }
                    initials={userInitials(user?.fullName ?? user?.name, user?.email)}
                    isLoggingOut={isLoggingOut}
                    onLogout={() => {
                        void logout?.();
                    }}
                />
            )}
        </aside>
    );
}

function SidebarAccountFooter({
    collapsed,
    displayName,
    initials,
    isLoggingOut,
    onLogout,
}: {
    collapsed: boolean;
    displayName: string;
    initials: string;
    isLoggingOut?: boolean;
    onLogout: () => void;
}) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!open) return undefined;
        function handlePointer(event: PointerEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("pointerdown", handlePointer);
        return () => document.removeEventListener("pointerdown", handlePointer);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open]);

    return (
        <div
            ref={menuRef}
            className={cn(
                "relative shrink-0 border-t border-slate-200 bg-slate-50/90 pb-3.5 pt-2.5",
                collapsed ? "px-2" : "px-3",
            )}
        >
            {open ? (
                <div
                    className={cn(
                        "absolute bottom-full z-50 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5",
                        collapsed
                            ? "left-0 min-w-[12rem]"
                            : "left-3 right-3",
                    )}
                    role="menu"
                    aria-label="Account menu"
                >
                    <button
                        type="button"
                        role="menuitem"
                        disabled={isLoggingOut}
                        onClick={() => {
                            if (isLoggingOut) return;
                            setOpen(false);
                            onLogout();
                        }}
                        className={cn(
                            "flex w-full items-center gap-3 px-3.5 py-2.5 text-left",
                            "text-sm font-medium text-slate-700 transition-colors",
                            "hover:bg-slate-50 hover:text-red-700",
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FE5720]",
                            isLoggingOut && "cursor-not-allowed opacity-60",
                        )}
                    >
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
                            aria-hidden
                        >
                            <LogOut className="h-4 w-4" />
                        </span>
                        {isLoggingOut ? "Signing out…" : "Log out"}
                    </button>
                </div>
            ) : null}

            <button
                type="button"
                disabled={isLoggingOut}
                className={cn(
                    "flex w-full items-center rounded-xl border text-left transition-[border-color,background-color,box-shadow]",
                    "border-slate-200 bg-white shadow-sm",
                    "hover:border-slate-300 hover:bg-slate-50/80",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FE5720]",
                    open &&
                    "border-[#FE5720]/60 bg-orange-50/90 shadow-[0_0_0_1px_rgba(254,87,32,0.25)]",
                    isLoggingOut && "cursor-not-allowed opacity-70",
                    collapsed
                        ? "justify-center border-transparent bg-transparent p-1 shadow-none hover:bg-slate-100/80"
                        : "gap-2.5 px-2.5 py-2",
                )}
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={isLoggingOut ? "Signing out" : "Account menu"}
                title={collapsed ? displayName : isLoggingOut ? "Signing out…" : undefined}
                onClick={() => {
                    if (isLoggingOut) return;
                    setOpen((value) => !value);
                }}
            >
                <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-800"
                    aria-hidden
                >
                    {initials}
                </div>
                {!collapsed ? (
                    <>
                        <span className="min-w-0 flex-1 truncate text-[0.78rem] font-bold uppercase tracking-wide text-slate-800">
                            {displayName}
                        </span>
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
                                open && "rotate-180 text-[#FE5720]",
                            )}
                            aria-hidden
                        />
                    </>
                ) : null}
            </button>
        </div>
    );
}

function SidebarItem({
    item,
    pathname,
    collapsed,
}: {
    item: NavItem;
    pathname: string;
    collapsed: boolean;
}) {
    const router = useRouter();
    const hasChildren =
        !!item.children && item.children.length > 0;

    const isActive = isNavHrefActive(pathname, item.href);

    const [open, setOpen] = useState(isActive);
    const [flyoutOpen, setFlyoutOpen] = useState(false);
    const flyoutRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isActive) {
            setOpen(true);
        }
    }, [isActive]);

    useEffect(() => {
        if (!flyoutOpen) return undefined;
        function handlePointer(event: PointerEvent) {
            if (
                flyoutRef.current &&
                !flyoutRef.current.contains(event.target as Node)
            ) {
                setFlyoutOpen(false);
            }
        }
        document.addEventListener("pointerdown", handlePointer);
        return () => document.removeEventListener("pointerdown", handlePointer);
    }, [flyoutOpen]);

    useEffect(() => {
        setFlyoutOpen(false);
    }, [pathname, collapsed]);

    const Icon = item.icon;

    if (hasChildren) {
        if (collapsed) {
            return (
                <div className="relative" ref={flyoutRef}>
                    {flyoutOpen ? (
                        <div
                            className="absolute left-full top-0 z-50 ml-2 min-w-[12rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
                            role="menu"
                            aria-label={`${item.label} submenu`}
                        >
                            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {item.label}
                            </p>
                            {item.children!.map((child) => {
                                const childActive = isNavHrefActive(
                                    pathname,
                                    child.href,
                                );

                                return (
                                    <Link
                                        key={child.href}
                                        href={child.href}
                                        role="menuitem"
                                        onClick={() => setFlyoutOpen(false)}
                                        className={cn(
                                            "block px-3 py-2 text-sm transition-colors",
                                            childActive
                                                ? "bg-orange-100 font-semibold text-[#FE5720]"
                                                : "text-slate-600 hover:bg-orange-50 hover:text-[#FE5720]",
                                        )}
                                    >
                                        {child.label}
                                    </Link>
                                );
                            })}
                        </div>
                    ) : null}

                    <button
                        type="button"
                        title={item.label}
                        aria-expanded={flyoutOpen}
                        aria-haspopup="menu"
                        onClick={() => setFlyoutOpen((value) => !value)}
                        className={cn(
                            "flex w-full items-center justify-center rounded-lg px-2 py-3",
                            "text-sm font-medium transition-colors",
                            isActive || flyoutOpen
                                ? "bg-[#FE5720] text-white"
                                : "text-slate-800 hover:bg-orange-50 hover:text-[#FE5720]",
                        )}
                    >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="sr-only">{item.label}</span>
                    </button>
                </div>
            );
        }

        const handleParentClick = () => {
            setOpen(true);
            const firstChild = item.children?.[0];
            if (!isActive && firstChild) {
                router.push(firstChild.href);
            } else {
                setOpen((prev) => !prev);
            }
        };

        return (
            <div>
                <button
                    type="button"
                    onClick={handleParentClick}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-3",
                        "text-sm font-medium transition-colors",
                        isActive
                            ? "bg-[#FE5720] text-white"
                            : "text-slate-800 hover:bg-orange-50 hover:text-[#FE5720]",
                    )}
                >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span
                        role="presentation"
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpen((prev) => !prev);
                        }}
                        className="rounded p-0.5 transition hover:bg-black/10"
                    >
                        {open ? (
                            <ChevronDown className="h-4 w-4" aria-hidden />
                        ) : (
                            <ChevronRight className="h-4 w-4" aria-hidden />
                        )}
                    </span>
                </button>

                {open && (
                    <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
                        {item.children!.map((child) => {
                            const childActive = isNavHrefActive(
                                pathname,
                                child.href,
                            );

                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    className={cn(
                                        "block rounded-md px-3 py-2 text-sm transition-colors",
                                        childActive
                                            ? "bg-orange-100 font-semibold text-[#FE5720]"
                                            : "text-slate-600 hover:bg-orange-50 hover:text-[#FE5720]",
                                    )}
                                >
                                    {child.label}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed
                    ? "justify-center gap-0 px-2 py-3"
                    : "gap-3 px-3 py-3",
                isActive
                    ? "bg-[#FE5720] text-white"
                    : "text-slate-800 hover:bg-orange-50 hover:text-[#FE5720]",
            )}
        >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {collapsed ? (
                <span className="sr-only">{item.label}</span>
            ) : (
                <span>{item.label}</span>
            )}
        </Link>
    );
}
