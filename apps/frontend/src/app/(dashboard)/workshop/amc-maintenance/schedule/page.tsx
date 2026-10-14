import { Suspense } from "react";

import SchedulePage from "@/components/modules/workshop/AmcMaintance/schedulepage";

/** Local dev / legacy entry without query. */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading schedule…
        </div>
      }
    >
      <SchedulePage />
    </Suspense>
  );
}
