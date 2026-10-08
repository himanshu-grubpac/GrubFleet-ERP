import type { ReactNode } from "react";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function InventoryStockReceiptEditLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
