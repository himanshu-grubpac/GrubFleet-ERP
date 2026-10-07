import { LeaseContractsProvider } from "@/lib/api/lease-contracts-context";

/**
 * Layout for all lease-contract routes.
 * Mounts the LeaseContractsProvider so every page/component
 * in this subtree can call useLeaseApi() without touching useAuth() directly.
 */
export default function LeaseContractsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LeaseContractsProvider>{children}</LeaseContractsProvider>;
}
