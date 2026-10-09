"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";

type WorkOrderStatus = "Not Started" | "In Progress" | "Completed" | "Cancelled";

type WorkOrder = {
    id: string;
    status: WorkOrderStatus;
    vehicleCode: string;
    vehicleName: string;
    customerName: string;
    orderType: string;
    odometerReading: string;
    reportedIssue: string;
    reportedBy: string;
    estimate: string;
    billedAs: string;
    assignedTechnician: string;
    started: string;
    workOrderItems: { description: string; added: string; cost: string }[];
    partsUsed: { item: string; qty: number; status: string }[];
};

const mockWorkOrder: WorkOrder = {
    id: "WO-2026-1187",
    status: "In Progress",
    vehicleCode: "VH-1004",
    vehicleName: "Petrol Scooter",
    customerName: "Meridian Logistics Pvt Ltd.",
    orderType: "General work order",
    odometerReading: "18,420 km",
    reportedIssue: "Engine cranks but won't start — suspected fuel line issue",
    reportedBy: "Aditi Rao",
    estimate: "Rs. 650",
    billedAs: "Leased — not billed, cost absorbed into TCO",
    assignedTechnician: "Vikram Joshi",
    started: "Today, 09:52",
    workOrderItems: [
        { description: "General diagnostic & repair (bundle)", added: "Original", cost: "Rs. 250" },
    ],
    partsUsed: [
        { item: "Fuel filter", qty: 1, status: "Reserved" },
        { item: "Carburetor cleaner (can)", qty: 1, status: "Reserved" },
    ],
};

export default function WorkOrderViewPage() {
    const router = useRouter();
    const [status, setStatus] = useState<WorkOrderStatus>(mockWorkOrder.status);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

    const workOrder = mockWorkOrder;
    const isCompleted = status === "Completed";
    const isNotStarted = status === "Not Started";

    const handleEdit = () => router.push(`/workshop/work-orders/${workOrder.id}/edit`);
    const handleAddToWorkOrder = () => router.push(`/workshop/work-orders/${workOrder.id}/add`);
    const handleStart = () => setStatus("In Progress");
    const handleConfirmComplete = () => {
        // Replace this local state update with the completion API when it is available.
        setStatus("Completed");
        setIsCompleteModalOpen(false);
    };

    return (
        <div className="min-h-full bg-gray-50 text-sm text-gray-700">
            <div className="mx-auto w-full max-w-[1200px] px-4 py-3 sm:px-5">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-[14px] font-semibold text-gray-900">{workOrder.id}</h1>
                            <StatusBadge status={status} />
                        </div>
                        <p className="mt-1 text-[12px] leading-4 text-gray-500">
                            {workOrder.vehicleCode} — {workOrder.customerName}. {workOrder.orderType}
                            {isCompleted ? ", completed." : isNotStarted ? " — assigned, not yet started." : " — in progress."}
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {!isCompleted && !isNotStarted && (
                            <>
                                <Button type="button" variant="secondary" onClick={handleEdit} className="h-8 px-3 text-[12px] font-medium">
                                    Edit
                                </Button>
                                <Button type="button" variant="secondary" onClick={handleAddToWorkOrder} className="h-8 px-3 text-[12px] font-medium">
                                    Add to Work Order
                                </Button>
                                <Button type="button" variant="primary" onClick={() => setIsCompleteModalOpen(true)} className="h-8 px-3 text-[12px] font-medium">
                                    Mark as completed
                                </Button>
                            </>
                        )}
                        {isNotStarted && (
                            <Button type="button" variant="primary" onClick={handleStart} className="h-8 px-3 text-[12px] font-medium">
                                Start work order
                            </Button>
                        )}
                    </div>
                </div>

                {isCompleted && (
                    <div className="mb-3 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-[12px] text-green-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Work completed. Rs. 800 logged to this vehicle&apos;s TCO.</span>
                    </div>
                )}

                <section className="mb-3">
                    <SectionCard title={isCompleted ? "COMPLETION" : "WORK ORDER"}>
                        {isCompleted ? (
                            <>
                                <InfoRow label="Completed by" value={workOrder.assignedTechnician} />
                                <InfoRow label="Odometer reading" value={workOrder.odometerReading} />
                                <InfoRow label="Estimate at logging" value={workOrder.estimate} />
                                <InfoRow label="Total cost" value="Rs. 800" />
                                <InfoRow label="Billed as" value={workOrder.billedAs} />
                            </>
                        ) : (
                            <>
                                <InfoRow label="Vehicle" value={`${workOrder.vehicleCode} — ${workOrder.vehicleName} — Standard`} />
                                <InfoRow label="Odometer reading" value={workOrder.odometerReading} />
                                <InfoRow label="Type" value="General" />
                                <InfoRow label="Reported issue" value={workOrder.reportedIssue} />
                                <InfoRow label="Reported by" value={workOrder.reportedBy} />
                                <InfoRow label="Estimate" value={workOrder.estimate} />
                                <InfoRow label="Billed as" value={workOrder.billedAs} />
                            </>
                        )}
                    </SectionCard>
                </section>

                {!isCompleted && (
                    <section className="mb-3">
                        <SectionCard title="PERSONNEL">
                            <InfoRow label="Assigned technician" value={workOrder.assignedTechnician} />
                            <InfoRow label={isNotStarted ? "Assigned" : "Started"} value={isNotStarted ? "Today, 09:40" : workOrder.started} />
                        </SectionCard>
                    </section>
                )}

                <section className="mb-3">
                    <SectionCard title="WORK ORDER ITEMS">
                        <TableHeader columns={["Description", "Added", "Cost"]} template="minmax(0,1fr) 20% 17%" />
                        {workOrder.workOrderItems.map((item, index) => (
                            <div key={`${item.description}-${index}`} className="grid grid-cols-[minmax(0,1fr)_20%_17%] gap-3 border-b border-gray-100 px-3 py-2.5 last:border-b-0">
                                <p className="min-w-0 break-words text-[14px] leading-5 text-gray-700">{item.description}</p>
                                <p className="text-[14px] leading-5 text-gray-700">{item.added}</p>
                                <p className="text-[14px] leading-5 text-gray-700">{isCompleted && index === 0 ? "Rs. 250" : item.cost}</p>
                            </div>
                        ))}
                        {isCompleted && (
                            <div className="grid grid-cols-[minmax(0,1fr)_20%_17%] gap-3 border-b border-gray-100 px-3 py-2.5 last:border-b-0">
                                <p className="text-[14px] leading-5 text-gray-700">Cracked frame mount — repair</p>
                                <p className="text-[14px] leading-5 text-gray-700">Added</p>
                                <p className="text-[14px] leading-5 text-gray-700">Rs. 550</p>
                            </div>
                        )}
                        <div className="px-3 py-2">
                            <p className="text-[12px] text-gray-400">Total: {isCompleted ? "Rs. 800" : "Rs. 250"}</p>
                        </div>
                    </SectionCard>
                </section>

                <section>
                    <SectionCard title="PARTS & CONSUMABLES USED">
                        <TableHeader columns={["Item", "Qty", "Status"]} template="minmax(0,1fr) 25% 25%" />
                        {workOrder.partsUsed.map((part, index) => (
                            <div key={`${part.item}-${index}`} className="grid grid-cols-[minmax(0,1fr)_25%_25%] gap-3 border-b border-gray-100 px-3 py-2.5 last:border-b-0">
                                <p className="min-w-0 break-words text-[14px] leading-5 text-gray-700">{part.item}</p>
                                <p className="text-[14px] leading-5 text-gray-700">{part.qty}</p>
                                <p className={`text-[14px] leading-5 font-medium ${isCompleted ? "text-gray-500" : "text-blue-800"}`}>
                                    {isCompleted ? "Issued" : part.status}
                                </p>
                            </div>
                        ))}
                    </SectionCard>
                </section>

                {!isCompleted && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[12px] leading-4 text-gray-500">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Parts are reserved against Inventory since this work order was logged. Only the assigned technician can start it; editing to remove a part line releases that part&apos;s reservation.</span>
                    </div>
                )}
            </div>

            {isCompleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 py-6" role="presentation">
                    <div role="dialog" aria-modal="true" aria-labelledby="complete-work-order-title" className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
                        <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
                            <div>
                                <h2 id="complete-work-order-title" className="text-[14px] font-semibold text-gray-900">Mark work order as completed?</h2>
                                <p className="mt-1 text-[12px] text-gray-500">Please confirm the work and final cost before completing this order.</p>
                            </div>
                            <button type="button" onClick={() => setIsCompleteModalOpen(false)} aria-label="Close confirmation" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-0 px-4 py-2">
                            <InfoRow label="Work order" value={workOrder.id} />
                            <InfoRow label="Technician" value={workOrder.assignedTechnician} />
                            <InfoRow label="Final cost" value="Rs. 800" />
                        </div>
                        <p className="px-4 pb-3 text-[12px] leading-4 text-gray-500">Confirming will mark this order Completed and log the final cost to the vehicle&apos;s TCO. Make sure all work and parts are recorded first.</p>
                        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
                            <Button type="button" variant="neutral" onClick={() => setIsCompleteModalOpen(false)} className="h-8 px-3 text-[12px] font-medium">
                                Cancel
                            </Button>
                            <Button type="button" variant="primary" onClick={handleConfirmComplete} className="h-8 px-3 text-[12px] font-medium">
                                Confirm completion
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="px-3 pt-3">
                <h2 className="text-[10px] font-semibold text-gray-400">{title}</h2>
            </div>
            <div className="mt-1">{children}</div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-h-[25px] items-center gap-3 border-b border-gray-100 px-3 py-1 last:border-b-0">
            <p className="w-1/2 shrink-0 text-[14px] font-medium leading-5 text-gray-500">{label}</p>
            <p className="min-w-0 flex-1 break-words text-right text-[14px] font-semibold leading-5 text-gray-800">{value}</p>
        </div>
    );
}

function TableHeader({ columns, template }: { columns: string[]; template: string }) {
    return (
        <div className="border-b border-gray-100 px-3 pb-2">
            <div className="grid gap-3" style={{ gridTemplateColumns: template }}>
                {columns.map((column) => (
                    <p key={column} className="text-[10px] font-semibold uppercase text-gray-400">{column}</p>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: WorkOrderStatus }) {
    const styles: Record<WorkOrderStatus, string> = {
        "Not Started": "bg-gray-100 text-gray-600",
        "In Progress": "bg-blue-50 text-blue-700",
        Completed: "bg-green-50 text-green-700",
        Cancelled: "bg-red-50 text-red-600",
    };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>{status}</span>;
}
