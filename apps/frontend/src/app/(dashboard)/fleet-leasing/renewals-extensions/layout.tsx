import { LeaseContractsProvider } from "@/lib/api/lease-contracts-context";

export default function RenewalsExtensionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LeaseContractsProvider>{children}</LeaseContractsProvider>;
}
