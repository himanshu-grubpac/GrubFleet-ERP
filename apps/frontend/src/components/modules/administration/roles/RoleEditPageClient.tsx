"use client";

import { useSearchParams } from "next/navigation";
import { useSecureEntityId } from "@/lib/navigation/use-secure-entity-id";
import { RoleEditorView } from "./RoleEditorView";

export function RoleEditPageClient() {
  const searchParams = useSearchParams();
  const roleId = useSecureEntityId({ legacyQueryKey: "roleId" }) || undefined;
  const viewOnly = searchParams.get("mode") === "view";

  return (
    <RoleEditorView mode="edit" roleId={roleId} viewOnly={viewOnly} />
  );
}
