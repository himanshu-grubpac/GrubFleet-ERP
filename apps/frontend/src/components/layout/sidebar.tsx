"use client";

import { usePathname } from "next/navigation";

import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

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

import { DashboardNavLink } from "@/components/ui/dashboard-nav-link";

import { useAuth } from "@/providers/auth-provider";

import { PortalEnvironmentBadge } from "@/components/layout/PortalEnvironmentBadge";
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

    /** Full-width nav drawer on viewports below `md` (header menu). */
    mobileOpen?: boolean;

    onMobileClose?: () => void;

};

export function Sidebar({

    collapsed,

    onToggleCollapsed,

    mobileOpen = false,

    onMobileClose,

}: SidebarProps) {

    const pathname = usePathname();

    const {

        permissions,

        isAuthenticated,

        isLoading: isAuthLoading,

        isLoggingOut,

        user,

        logout,

    } = useAuth();

    const stableNavItemsRef = useRef<NavItem[]>(mainNavItems);

    const items = useMemo(() => {
        if (!isAuthenticated) {
            return [];
        }

        const permissionSource =
            permissions.size > 0 ? permissions : null;

        const filtered = filterNavByPermissions(
            mainNavItems,
            permissionSource,
        );

        if (permissions.size > 0 || !isAuthLoading) {
            stableNavItemsRef.current = filtered;
        }

        return stableNavItemsRef.current;
    }, [isAuthenticated, isAuthLoading, permissions]);

    // Only one expanded submenu at a time.

    const [openModule, setOpenModule] = useState<string | null>(null);

    // Only one collapsed-sidebar flyout at a time.

    const [openFlyout, setOpenFlyout] = useState<string | null>(null);

    useEffect(() => {
        setOpenFlyout(null);

        const activeParent = items.find((item) => {
            if (!item.children?.length) {
                return false;
            }

            return item.children.some((child) =>
                isNavHrefActive(pathname, child.href),
            );
        });

        if (activeParent) {
            setOpenModule(activeParent.href);
            return;
        }

        const onModuleLanding = items.find(
            (item) =>
                item.children?.length &&
                isNavHrefActive(pathname, item.href),
        );

        if (onModuleLanding) {
            setOpenModule(onModuleLanding.href);
        }
    }, [pathname, items]);

    useEffect(() => {
        setOpenFlyout(null);
    }, [collapsed]);

    useEffect(() => {
        onMobileClose?.();
    }, [pathname, onMobileClose]);

    const toggleModule = (href: string) => {

        setOpenModule((current) =>

            current === href ? null : href,

        );

    };

    const toggleFlyout = (href: string) => {

        setOpenFlyout((current) =>

            current === href ? null : href,

        );

    };

    const closeFlyout = () => {

        setOpenFlyout(null);

    };

    const effectiveCollapsed = collapsed && !mobileOpen;

    return (

        <>

            {mobileOpen && onMobileClose ? (
                <button
                    type="button"
                    aria-label="Close navigation menu"
                    className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
                    onClick={onMobileClose}
                />
            ) : null}

        <aside

            className={cn(

                "h-full shrink-0 border-r border-slate-200 bg-white flex flex-col",

                "transition-[width] duration-200 ease-in-out",

                mobileOpen
                    ? "fixed inset-y-0 left-0 z-50 w-64 md:relative md:z-auto"
                    : "hidden md:flex",

                effectiveCollapsed ? "md:w-16" : "md:w-64",

                mobileOpen ? "w-64" : "",

            )}

            aria-label="Sidebar"

        >

            {/* Sidebar Header */}

            <div className="border-b border-slate-200">

                <div

                    className={cn(

                        "flex items-center",

                        effectiveCollapsed && !mobileOpen

                            ? "justify-center px-2 py-2.5"

                            : "justify-between px-4 py-2.5",

                    )}

                >

                    {(!effectiveCollapsed || mobileOpen) && (

                        <div className="min-w-0">

                            <h1 className="truncate text-xl font-bold text-[#FE5720]">

                                Fleet Pulse

                            </h1>

                            <PortalEnvironmentBadge className="mt-0.5" />

                        </div>

                    )}

                    <button

                        type="button"

                        onClick={onToggleCollapsed}

                        aria-expanded={!effectiveCollapsed}

                        aria-controls="erp-sidebar-nav"

                        aria-label={

                            effectiveCollapsed

                                ? "Expand menu"

                                : "Collapse menu"

                        }

                        title={

                            effectiveCollapsed

                                ? "Expand menu"

                                : "Collapse menu"

                        }

                        className={cn(

                            "hidden items-center gap-2 rounded-lg px-2 py-2 md:flex",

                            "text-sm font-medium text-slate-600",

                            "transition-colors hover:bg-slate-100 hover:text-slate-900",

                            "focus-visible:outline focus-visible:outline-2",

                            "focus-visible:outline-offset-2 focus-visible:outline-[#FE5720]",

                            effectiveCollapsed && "justify-center",

                        )}

                    >

                        {effectiveCollapsed ? (

                            <ChevronRight

                                className="h-5 w-5 shrink-0"

                                aria-hidden

                            />

                        ) : (

                            <ChevronLeft

                                className="h-5 w-5 shrink-0"

                                aria-hidden

                            />

                        )}

                    </button>

                </div>

            </div>

            {/* Sidebar Navigation */}

            <nav

                id="erp-sidebar-nav"

                className={cn(
                    "flex-1 space-y-1 hide-scrollbar overflow-y-auto overflow-x-hidden",
                    effectiveCollapsed ? "px-1.5 py-3" : "p-3",
                )}

                aria-label="Main"

            >

                {items.map((item) => {

                    const isChildActive =
                        !!item.children?.length &&
                        item.children.some((child) =>
                            isNavHrefActive(pathname, child.href),
                        );

                    return (
                    <SidebarItem

                        key={item.href}

                        item={item}

                        pathname={pathname}

                        collapsed={effectiveCollapsed}

                        open={openModule === item.href || isChildActive}

                        onToggle={() => toggleModule(item.href)}

                        flyoutOpen={openFlyout === item.href}

                        onToggleFlyout={() =>

                            toggleFlyout(item.href)

                        }

                        onCloseFlyout={closeFlyout}

                    />
                    );
                })}

            </nav>

            {/* Account Footer */}

            {(isAuthenticated || isLoggingOut) && (

                <div className="hidden md:block">

                <SidebarAccountFooter

                    collapsed={effectiveCollapsed}

                    displayName={

                        user?.fullName?.trim() ||

                        user?.name?.trim() ||

                        user?.email?.trim() ||

                        "Account"

                    }

                    initials={userInitials(

                        user?.fullName ?? user?.name,

                        user?.email,

                    )}

                    isLoggingOut={isLoggingOut}

                    onLogout={() => {

                        void logout?.();

                    }}

                />

                </div>

            )}

        </aside>

        </>

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

        if (!open) return;

        function handlePointer(event: PointerEvent) {

            if (

                menuRef.current &&

                !menuRef.current.contains(event.target as Node)

            ) {

                setOpen(false);

            }

        }

        document.addEventListener("pointerdown", handlePointer);

        return () => {

            document.removeEventListener(

                "pointerdown",

                handlePointer,

            );

        };

    }, [open]);

    useEffect(() => {

        if (!open) return;

        function handleKey(event: KeyboardEvent) {

            if (event.key === "Escape") {

                setOpen(false);

            }

        }

        document.addEventListener("keydown", handleKey);

        return () => {

            document.removeEventListener("keydown", handleKey);

        };

    }, [open]);

    return (

        <div

            ref={menuRef}

            className={cn(

                "relative shrink-0 border-t border-slate-200 bg-slate-50/90 pb-3.5 pt-2.5",

                collapsed ? "px-2" : "px-3",

            )}

        >

            {open && (

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

                            isLoggingOut &&

                            "cursor-not-allowed opacity-60",

                        )}

                    >

                        <span

                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"

                            aria-hidden

                        >

                            <LogOut className="h-4 w-4" />

                        </span>

                        {isLoggingOut

                            ? "Signing out…"

                            : "Log out"}

                    </button>

                </div>

            )}

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

                    isLoggingOut &&

                    "cursor-not-allowed opacity-70",

                    collapsed

                        ? "justify-center border-transparent bg-transparent p-1 shadow-none hover:bg-slate-100/80"

                        : "gap-2.5 px-2.5 py-2",

                )}

                aria-expanded={open}

                aria-haspopup="true"

                aria-label={

                    isLoggingOut

                        ? "Signing out"

                        : "Account menu"

                }

                title={

                    collapsed

                        ? displayName

                        : isLoggingOut

                            ? "Signing out…"

                            : undefined

                }

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

                {!collapsed && (

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

                )}

            </button>

        </div>

    );

}

function SidebarItem({

    item,

    pathname,

    collapsed,

    open,

    onToggle,

    flyoutOpen,

    onToggleFlyout,

    onCloseFlyout,

}: {

    item: NavItem;

    pathname: string;

    collapsed: boolean;

    open: boolean;

    onToggle: () => void;

    flyoutOpen: boolean;

    onToggleFlyout: () => void;

    onCloseFlyout: () => void;

}) {

    const hasChildren = !!item.children?.length;

    const isSelfActive = isNavHrefActive(pathname, item.href);

    const isChildActive =

        hasChildren &&

        item.children!.some((child) =>

            isNavHrefActive(pathname, child.href),

        );

    const isModuleActive = isSelfActive || isChildActive;

    const flyoutRef = useRef<HTMLDivElement>(null);

    const flyoutPanelRef = useRef<HTMLDivElement>(null);

    const [flyoutPosition, setFlyoutPosition] = useState<{

        top: number;

        left: number;

    } | null>(null);

    const Icon = item.icon;

    useLayoutEffect(() => {

        if (!flyoutOpen || !flyoutRef.current) {

            setFlyoutPosition(null);

            return;

        }

        const FLYOUT_MIN_WIDTH = 192;

        const VIEWPORT_PADDING = 8;

        function updatePosition() {

            const trigger = flyoutRef.current;

            if (!trigger) {

                return;

            }

            const rect = trigger.getBoundingClientRect();

            let left = rect.right + 8;

            if (

                left + FLYOUT_MIN_WIDTH >

                window.innerWidth - VIEWPORT_PADDING

            ) {

                left = Math.max(

                    VIEWPORT_PADDING,

                    rect.left - FLYOUT_MIN_WIDTH - 8,

                );

            }

            let top = rect.top;

            const maxTop = window.innerHeight - VIEWPORT_PADDING - 280;

            top = Math.min(

                Math.max(VIEWPORT_PADDING, top),

                Math.max(VIEWPORT_PADDING, maxTop),

            );

            setFlyoutPosition({ top, left });

        }

        updatePosition();

        window.addEventListener("resize", updatePosition);

        window.addEventListener("scroll", updatePosition, true);

        return () => {

            window.removeEventListener("resize", updatePosition);

            window.removeEventListener("scroll", updatePosition, true);

        };

    }, [flyoutOpen]);

    useEffect(() => {

        if (!flyoutOpen) return;

        function handlePointer(event: PointerEvent) {

            const target = event.target as Node;

            if (

                flyoutRef.current?.contains(target) ||

                flyoutPanelRef.current?.contains(target)

            ) {

                return;

            }

            onCloseFlyout();

        }

        document.addEventListener("pointerdown", handlePointer);

        return () => {

            document.removeEventListener(

                "pointerdown",

                handlePointer,

            );

        };

    }, [flyoutOpen, onCloseFlyout]);

    if (hasChildren) {

        if (collapsed) {

            return (

                <div className="relative" ref={flyoutRef}>

                    {flyoutOpen && flyoutPosition ? (

                        <div

                            ref={flyoutPanelRef}

                            className="fixed z-[60] max-h-[min(24rem,calc(100vh-1rem))] min-w-[12rem] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"

                            style={{

                                top: flyoutPosition.top,

                                left: flyoutPosition.left,

                            }}

                            role="menu"

                            aria-label={`${item.label} submenu`}

                        >

                            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">

                                {item.label}

                            </p>

                            {item.children!.map((child) => {

                                const childActive =

                                    isNavHrefActive(

                                        pathname,

                                        child.href,

                                    );

                                return (

                                    <DashboardNavLink

                                        key={child.href}

                                        href={child.href}

                                        role="menuitem"

                                        onClick={onCloseFlyout}

                                        className={cn(

                                            "block px-3 py-2 text-sm transition-colors",

                                            childActive

                                                ? "bg-orange-100 font-semibold text-[#FE5720]"

                                                : "text-slate-600 hover:bg-orange-50 hover:text-[#FE5720]",

                                        )}

                                    >

                                        {child.label}

                                    </DashboardNavLink>

                                );

                            })}

                        </div>

                    ) : null}

                    <div className="flex h-11 w-full items-center">
                        <button
                            type="button"
                            title={item.label}
                            aria-label={item.label}
                            aria-expanded={flyoutOpen}
                            aria-haspopup="menu"
                            onClick={onToggleFlyout}
                            className={cn(
                                "flex h-10 w-full min-w-0 items-center justify-center rounded-lg",
                                "transition-colors",
                                isModuleActive
                                    ? "bg-[#FE5720] text-white"
                                    : "text-slate-800 hover:bg-orange-50 hover:text-[#FE5720]",
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" aria-hidden />
                            <span className="sr-only">{item.label}</span>
                        </button>
                    </div>

                </div>

            );

        }

        return (

            <div>

                {/* Module link and submenu toggle are separate controls. */}

                <div className="flex items-center gap-1">

                    <DashboardNavLink

                        href={item.href}

                        className={cn(

                            "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3",

                            "text-sm font-medium transition-colors",

                            isModuleActive

                                ? "bg-[#FE5720] text-white"

                                : "text-slate-800 hover:bg-orange-50 hover:text-[#FE5720]",

                        )}

                    >

                        <Icon

                            className="h-5 w-5 shrink-0"

                            aria-hidden

                        />

                        <span className="truncate text-left">

                            {item.label}

                        </span>

                    </DashboardNavLink>

                    <button

                        type="button"

                        onClick={onToggle}

                        aria-expanded={open}

                        aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}

                        className={cn(

                            "rounded-lg p-2 transition-colors",

                            isModuleActive

                                ? "text-[#FE5720]"

                                : "text-slate-600 hover:bg-orange-50 hover:text-[#FE5720]",

                        )}

                    >

                        {open ? (

                            <ChevronDown className="h-4 w-4" />

                        ) : (

                            <ChevronRight className="h-4 w-4" />

                        )}

                    </button>

                </div>

                {open && (

                    <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">

                        {item.children!.map((child) => {

                            const childActive =

                                isNavHrefActive(

                                    pathname,

                                    child.href,

                                );

                            return (

                                <DashboardNavLink

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

                                </DashboardNavLink>

                            );

                        })}

                    </div>

                )}

            </div>

        );

    }

    return (

        <DashboardNavLink

            href={item.href}

            title={collapsed ? item.label : undefined}

            className={cn(

                "flex items-center rounded-lg text-sm font-medium transition-colors",

                collapsed

                    ? "justify-center gap-0 px-2 py-3"

                    : "gap-3 px-3 py-3",

                isModuleActive

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

        </DashboardNavLink>

    );

}