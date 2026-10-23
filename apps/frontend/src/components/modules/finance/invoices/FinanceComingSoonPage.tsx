"use client";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

type FinanceComingSoonPageProps = {
  title: string;
  description: string;
};

export default function FinanceComingSoonPage({
  title,
  description,
}: FinanceComingSoonPageProps) {
  return (
    <OrganizationFormLayout
      title={title}
      description={description}
      contentVariant="form-card"
    >
      <p className="text-sm text-slate-600">
        This flow is not available in the current release. Purchase invoices are
        fully supported; sale and billing will ship in a later Finance phase.
      </p>
    </OrganizationFormLayout>
  );
}
