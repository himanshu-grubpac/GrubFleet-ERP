"use client";

import type { ReactNode } from "react";

import { LeaseContractsProvider } from "@/lib/api/lease-contracts-context";

/** Fleet-wide lease API context — stays mounted across fleet sub-routes to avoid remount flicker. */
export default function FleetLeasingLayout({ children }: { children: ReactNode }) {
  return <LeaseContractsProvider>{children}</LeaseContractsProvider>;
}
