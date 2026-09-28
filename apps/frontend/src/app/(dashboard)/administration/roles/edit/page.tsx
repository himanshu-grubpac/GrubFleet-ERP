import { Suspense } from "react";
import { RoleEditPageClient } from "@/components/modules/administration/roles/RoleEditPageClient";

export default function EditRolePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading role…
        </div>
      }
    >
      <RoleEditPageClient />
    </Suspense>
  );
}
