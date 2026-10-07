/**
 * Canonical href for Next Link / router (static export: trailingSlash true on CloudFront).
 * Preserves query string and hash; no-op for absolute http(s) URLs.
 */
export function internalHref(href: string): string {
  if (
    !href ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href === "#"
  ) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;

  const queryIndex = beforeHash.indexOf("?");
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";
  const pathname =
    queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;

  if (pathname === "/" || pathname.endsWith("/")) {
    return `${pathname}${query}${hash}`;
  }

  return `${pathname}/${query}${hash}`;
}

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
