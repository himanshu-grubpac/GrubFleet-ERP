import { Info } from "lucide-react";

interface LeaseDeactivationNoticeProps {
    returnedVehicles: number;
    totalVehicles: number;
}

export default function LeaseDeactivationNotice({
    returnedVehicles,
    totalVehicles,
}: LeaseDeactivationNoticeProps) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

            <p className="text-xs leading-5 text-slate-500">
                <span className="font-semibold text-slate-700">
                    {returnedVehicles} of {totalVehicles} vehicles returned & registered.
                </span>{" "}
                &quot;Registered&quot; only means logged as physically back — not inspected.
                Pause billing unlocks once all {totalVehicles} are in.
            </p>
        </div>
    );
}