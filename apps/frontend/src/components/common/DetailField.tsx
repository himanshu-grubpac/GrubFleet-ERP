"use client";

type DetailFieldProps = {
    label: string;
    value: string;
};

/** Read-only label/value pair for org-style detail grids (locations, suppliers, lease terms, etc.). */
export default function DetailField({ label, value }: DetailFieldProps) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-gray-900">{value}</dd>
        </div>
    );
}
