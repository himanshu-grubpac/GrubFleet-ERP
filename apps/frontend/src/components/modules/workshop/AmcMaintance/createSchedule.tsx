
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";

export default function CreateAmcSchedulePage() {
    const router = useRouter();

    const [form, setForm] = useState({
        name: "",
        assetClass: "",
        maintenanceType: "Preventive Maintenance",
        intervalType: "Odometer",
        intervalValue: "",
        applicability: "Leased",
        description: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextErrors: Record<string, string> = {};

        if (!form.name.trim()) nextErrors.name = "Schedule name is required.";
        if (!form.assetClass) nextErrors.assetClass = "Select an asset class.";
        if (!form.intervalValue.trim()) {
            nextErrors.intervalValue = "Enter the service interval.";
        } else if (
            !Number.isFinite(Number(form.intervalValue)) ||
            Number(form.intervalValue) <= 0
        ) {
            nextErrors.intervalValue = "Enter a valid positive number.";
        }

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) return;

        // Connect this to your schedule creation API.
        console.log("Create AMC schedule:", form);
    };

    return (
        <main className="min-h-full bg-gray-50 px-5 py-4 text-[14px] text-gray-800">
            {/* Breadcrumb */}
            <nav className="mb-5 flex items-center gap-2 text-xs text-gray-500">
                <button
                    onClick={() => router.push("/workshop/amc-maintenance")}
                    className="hover:text-[#FE5720]"
                >
                    AMC &amp; Maintenance
                </button>
                <span>/</span>
                <span>Create Schedule</span>
            </nav>

            {/* Header */}
            <div className="mb-5">
                <h1 className="text-[14px] font-semibold text-gray-900">
                    Create Maintenance Schedule
                </h1>
                <p className="mt-1 text-xs text-gray-500">
                    Configure maintenance intervals for applicable vehicle classes.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-4xl">
                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-4 py-3">
                        <h2 className="text-[14px] font-semibold">
                            Schedule Information
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Enter the schedule details and service threshold.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-4 sm:grid-cols-2">
                        <FormField label="Schedule name" required error={errors.name}>
                            <input
                                value={form.name}
                                onChange={(e) => updateField("name", e.target.value)}
                                placeholder="e.g. Cargo bed & hitch inspection"
                                className={inputClass}
                            />
                        </FormField>

                        <FormField
                            label="Asset class"
                            required
                            error={errors.assetClass}
                        >
                            <select
                                value={form.assetClass}
                                onChange={(e) => updateField("assetClass", e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Select asset class</option>
                                <option value="Petrol Auto — Cargo">
                                    Petrol Auto — Cargo
                                </option>
                                <option value="Petrol Scooter">Petrol Scooter</option>
                                <option value="Electric Scooter">Electric Scooter</option>
                            </select>
                        </FormField>

                        <FormField label="Maintenance type" required>
                            <select
                                value={form.maintenanceType}
                                onChange={(e) =>
                                    updateField("maintenanceType", e.target.value)
                                }
                                className={inputClass}
                            >
                                <option>Preventive Maintenance</option>
                                <option>Inspection</option>
                                <option>Servicing</option>
                            </select>
                        </FormField>

                        <FormField label="Threshold type" required>
                            <select
                                value={form.intervalType}
                                onChange={(e) =>
                                    updateField("intervalType", e.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="Odometer">Odometer (km)</option>
                                <option value="Calendar">Calendar interval (days)</option>
                            </select>
                        </FormField>

                        <FormField
                            label={
                                form.intervalType === "Odometer"
                                    ? "Service interval (km)"
                                    : "Service interval (days)"
                            }
                            required
                            error={errors.intervalValue}
                        >
                            <input
                                type="number"
                                min="1"
                                value={form.intervalValue}
                                onChange={(e) =>
                                    updateField("intervalValue", e.target.value)
                                }
                                placeholder={
                                    form.intervalType === "Odometer"
                                        ? "e.g. 4000"
                                        : "e.g. 90"
                                }
                                className={inputClass}
                            />
                        </FormField>

                        <FormField label="Vehicle applicability" required>
                            <select
                                value={form.applicability}
                                onChange={(e) =>
                                    updateField("applicability", e.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="Leased">Leased</option>
                                <option value="Owned">Owned</option>
                                <option value="All">All vehicles</option>
                            </select>
                        </FormField>

                        <div className="sm:col-span-2">
                            <FormField label="Description / Notes">
                                <textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) =>
                                        updateField("description", e.target.value)
                                    }
                                    placeholder="Add schedule instructions or notes (optional)"
                                    className={`${inputClass} h-auto py-2`}
                                />
                            </FormField>
                        </div>
                    </div>
                </section>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => router.push("/workshop/amc-maintenance")}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-xs font-medium hover:bg-gray-50"
                    >
                        <ArrowLeft size={14} />
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-[#FE5720] px-4 text-xs font-medium text-white hover:bg-[#E94B18]"
                    >
                        <Save size={14} />
                        Save Schedule
                    </button>
                </div>
            </form>
        </main>
    );
}

const inputClass =
    "h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-[14px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

function FormField({
    label,
    required = false,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {children}
            {error && (
                <p className="mt-1 text-[11px] text-red-600">{error}</p>
            )}
        </div>
    );
}
