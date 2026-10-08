"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";

type FinancePlaceholderPageProps = {
  title: string;
  description: string;
};

export default function FinancePlaceholderPage({
  title,
  description,
}: FinancePlaceholderPageProps) {
  return (
    <DashboardLayout title={title} description={description}>
      <div className="px-6 pb-8">
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          This submodule is planned for a later Finance phase. Invoices (purchase)
          is available now.
        </div>
      </div>
    </DashboardLayout>
  );
}
