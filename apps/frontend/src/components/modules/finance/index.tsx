"use client";

import FinancePlaceholderPage from "@/components/modules/finance/FinancePlaceholderPage";

/** Legacy finance shell entry — routes use dashboard invoice pages instead. */
export function FinanceModule() {
  return (
    <FinancePlaceholderPage
      title="Finance"
      description="Track invoices, expenses, revenue, and financial summaries."
    />
  );
}
