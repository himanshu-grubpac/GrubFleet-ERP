"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

export default function ReturnsInspectionsTable() {
    return (
        <DashboardLayout
            title="Returns & Inspections"
            description="Manage vehicle returns and inspect assets at the end of a lease."
        >
            <DashboardEmptyState
                title="No returns or inspections yet"
                description="Returns and inspections will appear here when vehicles are scheduled for return."
            />
        </DashboardLayout>
    );
}
