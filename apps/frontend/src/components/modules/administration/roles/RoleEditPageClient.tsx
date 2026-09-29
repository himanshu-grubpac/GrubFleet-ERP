"use client";

import { useSearchParams } from "next/navigation";
import { RoleEditorView } from "./RoleEditorView";

export function RoleEditPageClient() {
  const searchParams = useSearchParams();
  const roleId = searchParams.get("roleId") ?? undefined;
  const viewOnly = searchParams.get("mode") === "view";

  return (
    <RoleEditorView mode="edit" roleId={roleId} viewOnly={viewOnly} />
  );
}
