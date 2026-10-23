"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RedirectingState } from "@/components/states/async-states";

const ASSET_ASSIGN_LIST_HREF = "/asset-register/asset-assign/";

/** Legacy success interstitial — bulk assign now uses Sonner + list redirect. */
export default function BulkAssignDonePage() {
    const router = useRouter();

    useEffect(() => {
        router.replace(ASSET_ASSIGN_LIST_HREF);
    }, [router]);

    return <RedirectingState />;
}
