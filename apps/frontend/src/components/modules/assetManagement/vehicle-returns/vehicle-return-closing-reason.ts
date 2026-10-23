export function vehicleReturnClosingReasonLabel(
    reason: string | null | undefined,
): string {
    if (reason === "completed") return "Completed";
    if (reason === "terminated_early") return "Terminated early";
    if (reason === "cancelled") return "Cancelled";
    return reason ?? "—";
}
