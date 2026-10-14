import { Suspense } from "react";

import TierPage from "@/components/modules/workshop/AmcMaintance/tiersPage";

/** Local dev / legacy entry without query — defaults tier in component. */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading tier…
        </div>
      }
    >
      <TierPage />
    </Suspense>
  );
}
