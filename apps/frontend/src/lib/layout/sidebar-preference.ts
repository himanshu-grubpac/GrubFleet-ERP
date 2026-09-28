export const ERP_SIDEBAR_COLLAPSED_KEY = "erp_sidebar_collapsed";

export function readSidebarCollapsedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ERP_SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsedPreference(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ERP_SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}
