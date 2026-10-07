"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function ReturnsInspectionsPage() {
  return (
    <DashboardLayout
      title="Returns & Inspections"
      description="Track lease returns and vehicle inspections."
    >
      <p className="text-sm text-slate-500">No returns or inspections to show yet.</p>
    </DashboardLayout>
  );
}
