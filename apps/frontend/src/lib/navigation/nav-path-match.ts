/** Strip query/hash and trailing slash (except root) for consistent nav matching. */
export function normalizeNavPath(pathname: string): string {
  const trimmed = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }
  return trimmed || "/";
}

/** Whether `pathname` is the nav item `href` or a nested route under it. */
export function isNavHrefActive(pathname: string, href: string): boolean {
  const path = normalizeNavPath(pathname);
  const target = normalizeNavPath(href);

  if (path === target || path.startsWith(`${target}/`)) {
    return true;
  }

  if (path === "/" && target === "/dashboard") {
    return true;
  }

  return false;
}
