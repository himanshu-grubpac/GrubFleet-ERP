import { mainNavItems, type NavItem } from "@/lib/navigation/modules";
import { normalizeNavPath } from "@/lib/navigation/nav-path-match";

export type DashboardBreadcrumbItem = {
  label: string;
  href?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function findNavMatch(pathname: string): {
  module: NavItem;
  section?: NavItem;
  baseHref: string;
} | null {
  let best: {
    module: NavItem;
    section?: NavItem;
    baseHref: string;
    matchLen: number;
  } | null = null;

  for (const moduleItem of mainNavItems) {
    if (moduleItem.children) {
      for (const child of moduleItem.children) {
        if (
          pathname === child.href ||
          pathname.startsWith(`${child.href}/`)
        ) {
          const matchLen = child.href.length;
          if (!best || matchLen > best.matchLen) {
            best = {
              module: moduleItem,
              section: child,
              baseHref: child.href,
              matchLen,
            };
          }
        }
      }
    }

    if (
      pathname === moduleItem.href ||
      pathname.startsWith(`${moduleItem.href}/`)
    ) {
      const matchLen = moduleItem.href.length;
      if (!best || matchLen > best.matchLen) {
        best = {
          module: moduleItem,
          section: undefined,
          baseHref: moduleItem.href,
          matchLen,
        };
      }
    }
  }

  if (!best) {
    return null;
  }

  return {
    module: best.module,
    section: best.section,
    baseHref: best.baseHref,
  };
}

function singularSectionLabel(sectionLabel: string): string {
  if (sectionLabel.endsWith("ies")) {
    return `${sectionLabel.slice(0, -3)}y`.toLowerCase();
  }
  if (sectionLabel.endsWith("s")) {
    return sectionLabel.slice(0, -1).toLowerCase();
  }
  return sectionLabel.toLowerCase();
}

function labelForStaticSegment(
  segment: string,
  sectionLabel?: string,
): string {
  const singular = sectionLabel
    ? singularSectionLabel(sectionLabel)
    : "item";

  switch (segment) {
    case "create":
      return `Add ${singular}`;
    case "new":
      return sectionLabel?.includes("Contract")
        ? "New contract"
        : `New ${singular}`;
    case "edit":
      return `Edit ${singular}`;
    case "detail":
      return "Detail";
    case "assign":
      return "Assign to Vehicle";
    case "offboard":
      return "Offboard";
    case "complete":
      return "Complete";
    case "roles":
      return "Roles";
    default:
      return segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function isDynamicIdSegment(segment: string): boolean {
  return (
    UUID_RE.test(segment) ||
    segment === "[id]" ||
    segment === "[leaseId]" ||
    /^client-[0-9a-f-]+$/i.test(segment)
  );
}

export type BuildDashboardBreadcrumbsOptions = {
  /** Label for the current page when the URL ends with a resource id. */
  currentLabel?: string;
  /** Replace auto-built trail entirely when provided. */
  items?: DashboardBreadcrumbItem[];
};

export function buildDashboardBreadcrumbs(
  pathname: string,
  options?: BuildDashboardBreadcrumbsOptions,
): DashboardBreadcrumbItem[] {
  if (options?.items?.length) {
    return options.items;
  }

  const normalized = normalizeNavPath(pathname);

  if (normalized === "/dashboard") {
    return [{ label: "Dashboard" }];
  }

  const match = findNavMatch(normalized);
  if (!match) {
    return options?.currentLabel
      ? [{ label: options.currentLabel }]
      : [];
  }

  const items: DashboardBreadcrumbItem[] = [
    { label: match.module.label, href: match.module.href },
  ];

  if (match.section) {
    items.push({
      label: match.section.label,
      href: match.section.href,
    });
  }

  if (normalized === match.baseHref) {
    const last = items[items.length - 1]!;
    items[items.length - 1] = { label: last.label };
    return items;
  }

  const rest = normalized
    .slice(match.baseHref.length)
    .split("/")
    .filter(Boolean);

  const sectionLabel = match.section?.label;
  let pathPrefix = match.baseHref;

  for (let index = 0; index < rest.length; index += 1) {
    const segment = rest[index]!;
    const isLast = index === rest.length - 1;

    if (isDynamicIdSegment(segment)) {
      if (isLast && options?.currentLabel) {
        items.push({ label: options.currentLabel });
      }
      continue;
    }

    pathPrefix = `${pathPrefix}/${segment}`;
    const label = labelForStaticSegment(segment, sectionLabel);

    if (isLast && options?.currentLabel && segment === "edit") {
      items.push({ label: options.currentLabel });
      continue;
    }

    if (isLast) {
      items.push({ label });
    } else {
      items.push({ label, href: pathPrefix });
    }
  }

  return items;
}
