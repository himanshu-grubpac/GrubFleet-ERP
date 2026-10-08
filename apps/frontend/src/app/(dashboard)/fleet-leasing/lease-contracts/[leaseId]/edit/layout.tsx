import type { ReactNode } from "react";

export async function generateStaticParams() {
  return [{ leaseId: "_" }];
}

export default function EditLeaseContractLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
