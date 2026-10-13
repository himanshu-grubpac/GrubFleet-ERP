"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import DetailField from "@/components/common/DetailField";
import OrganizationDetailCard, {
    OrganizationDetailFieldGrid,
} from "@/components/common/OrganizationDetailCard";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { FLEET_SUPPORT_REPLACEMENT_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { ApiClientError } from "@/lib/api/client";
import {
    fetchReplacementCandidates,
    fetchReplacementFilterBrands,
    fetchReplacementFilterModels,
    lookupAvailableReplacement,
    type AvailableReplacementLookupResult,
    type ReplacementVehicleType,
    type SupportReplacementCandidate,
    type SupportReplacementVehicleStore,
} from "@/lib/api/fleet-leasing/support-replacement";

const SELECT_FIELD_CLASS =
    "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#FE5720] focus:ring-2 focus:ring-[#FE5720]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const STEP_TAB_LIST_CLASS =
    "inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1";

function stepTabClass(active: boolean): string {
    return `rounded-md px-4 py-2 text-sm font-medium transition ${
        active
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
    }`;
}

type ReplacementPickMode = "filter" | "search";

export default function ReplacementVehiclePicker(props: {
    token: string;
    organizationId: string;
    excludeVehicleIds: string[];
    replacementSourceKind: SupportReplacementVehicleStore;
    value: string;
    onChange: (vehicleId: string) => void;
}) {
    const {
        token,
        organizationId,
        excludeVehicleIds,
        replacementSourceKind,
        value,
        onChange,
    } = props;

    const isLegacyCatalog = replacementSourceKind === "legacy";

    const [mode, setMode] = useState<ReplacementPickMode>("filter");
    const [vehicleType, setVehicleType] = useState<ReplacementVehicleType | "">(
        "",
    );
    const [brand, setBrand] = useState("");
    const [modelName, setModelName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchPending, setSearchPending] = useState(false);
    const [searchPreview, setSearchPreview] =
        useState<AvailableReplacementLookupResult | null>(null);
    const [selectedSummary, setSelectedSummary] = useState<{
        registrationNo: string;
        assetClass: string;
    } | null>(null);

    const brandsQuery = useQuery({
        queryKey: [
            "replacement-filter-brands",
            organizationId,
            vehicleType,
        ],
        queryFn: () =>
            fetchReplacementFilterBrands(
                token,
                organizationId,
                vehicleType as ReplacementVehicleType,
            ),
        enabled: Boolean(token && organizationId && vehicleType),
        staleTime: 60_000,
    });

    const modelsQuery = useQuery({
        queryKey: [
            "replacement-filter-models",
            organizationId,
            vehicleType,
            brand,
        ],
        queryFn: () =>
            fetchReplacementFilterModels(
                token,
                organizationId,
                vehicleType as ReplacementVehicleType,
                brand,
            ),
        enabled: Boolean(token && organizationId && vehicleType && brand),
        staleTime: 60_000,
    });

    const legacyListQuery = useQuery({
        queryKey: [
            "replacement-candidates",
            organizationId,
            "legacy-list",
            excludeVehicleIds.join(","),
        ],
        queryFn: () =>
            fetchReplacementCandidates(token, organizationId, {
                excludeVehicleIds,
                pageSize: 50,
                sourceKind: "legacy",
            }),
        enabled: Boolean(
            token && organizationId && isLegacyCatalog && !value,
        ),
        staleTime: 30_000,
    });

    const registerCandidatesQuery = useQuery({
        queryKey: [
            "replacement-candidates",
            organizationId,
            "register-filter",
            vehicleType,
            brand,
            modelName,
            excludeVehicleIds.join(","),
        ],
        queryFn: () =>
            fetchReplacementCandidates(token, organizationId, {
                vehicleType: vehicleType as ReplacementVehicleType,
                brand,
                modelName,
                excludeVehicleIds,
                pageSize: 50,
                sourceKind: "register",
            }),
        enabled: Boolean(
            token &&
                organizationId &&
                !isLegacyCatalog &&
                vehicleType &&
                brand &&
                modelName,
        ),
        staleTime: 30_000,
    });

    const candidatesQuery = isLegacyCatalog
        ? legacyListQuery
        : registerCandidatesQuery;

    const excludedIdSet = useMemo(
        () => new Set(excludeVehicleIds),
        [excludeVehicleIds],
    );

    const applySelection = useCallback(
        (candidate: SupportReplacementCandidate) => {
            if (excludedIdSet.has(candidate.id)) {
                setSearchError(
                    "That vehicle is already selected elsewhere or is an on-lease unit.",
                );
                return;
            }
            setSearchError(null);
            const summary = {
                registrationNo: candidate.registrationNo,
                assetClass: candidate.assetClass,
            };
            setSelectedSummary(summary);
            onChange(candidate.id);
        },
        [excludedIdSet, onChange],
    );

    const clearSelection = useCallback(() => {
        setSelectedSummary(null);
        onChange("");
    }, [onChange]);

    const runSearch = useCallback(async () => {
        const q = searchQuery.trim();
        if (!q) return;
        setSearchError(null);
        setSearchPending(true);
        setSearchPreview(null);
        try {
            const result = await lookupAvailableReplacement(
                token,
                organizationId,
                q,
                replacementSourceKind,
            );
            setSearchPreview(result);
        } catch (err) {
            const message =
                err instanceof ApiClientError
                    ? err.message
                    : "Could not find an available replacement vehicle.";
            setSearchError(message);
        } finally {
            setSearchPending(false);
        }
    }, [organizationId, replacementSourceKind, searchQuery, token]);

    const useSearchPreview = useCallback(() => {
        if (!searchPreview) return;
        const v = searchPreview.vehicle;
        if (excludedIdSet.has(v.id)) {
            setSearchError(
                "That vehicle is already selected elsewhere or is an on-lease unit.",
            );
            return;
        }
        setSearchError(null);
        const summary = {
            registrationNo: v.registrationNo,
            assetClass: v.assetClass,
        };
        setSelectedSummary(summary);
        onChange(v.id);
        setSearchPreview(null);
        setSearchQuery("");
    }, [excludedIdSet, onChange, searchPreview]);

    useEffect(() => {
        if (!value) {
            setSelectedSummary(null);
        }
    }, [value]);

    const canSubmitReplacementSearch =
        Boolean(searchQuery.trim()) && !searchPending;
    const replacementSearchHasError = Boolean(searchError);
    const canSubmitUseSearchPreview = Boolean(searchPreview) && !searchPending;

    if (value) {
        const regLabel =
            selectedSummary?.registrationNo ?? "Replacement selected";
        const classLabel = selectedSummary?.assetClass;

        return (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/80">
                            Selected replacement
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                            <span className="font-semibold">{regLabel}</span>
                            {classLabel ? (
                                <span className="text-slate-600">
                                    {" "}
                                    · {classLabel}
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={clearSelection}
                    >
                        Change
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <div
                className={STEP_TAB_LIST_CLASS}
                role="tablist"
                aria-label="Replacement pick mode"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "filter"}
                    className={stepTabClass(mode === "filter")}
                    onClick={() => setMode("filter")}
                >
                    {isLegacyCatalog ? "Pick from list" : "Filter"}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "search"}
                    className={stepTabClass(mode === "search")}
                    onClick={() => setMode("search")}
                >
                    Search by number
                </button>
            </div>

            {mode === "filter" ? (
                isLegacyCatalog ? (
                    <div className="max-w-md">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Available fleet vehicle
                        </label>
                        <select
                            className={SELECT_FIELD_CLASS}
                            value={value}
                            disabled={
                                candidatesQuery.isLoading ||
                                (candidatesQuery.data?.items.length ?? 0) === 0
                            }
                            aria-busy={candidatesQuery.isLoading}
                            onChange={(e) => {
                                const id = e.target.value;
                                const item = (
                                    candidatesQuery.data?.items ?? []
                                ).find((c) => c.id === id);
                                if (item) applySelection(item);
                            }}
                        >
                            <option value="">
                                {candidatesQuery.isLoading
                                    ? "Loading vehicles…"
                                    : (candidatesQuery.data?.items.length ?? 0) ===
                                        0
                                      ? "No available vehicles in this catalog"
                                      : "Select registration"}
                            </option>
                            {(candidatesQuery.data?.items ?? []).map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.registrationNo}
                                    {v.assetClass ? ` · ${v.assetClass}` : ""}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                            Available vehicles from the legacy fleet catalog (up
                            to 50). Use search for a specific registration or
                            VIN.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Wheeler
                            </label>
                            <select
                                className={SELECT_FIELD_CLASS}
                                value={vehicleType}
                                onChange={(e) => {
                                    setVehicleType(
                                        e.target.value as
                                            | ReplacementVehicleType
                                            | "",
                                    );
                                    setBrand("");
                                    setModelName("");
                                }}
                            >
                                <option value="">Select wheeler</option>
                                <option value="2W">2W</option>
                                <option value="3W">3W</option>
                                <option value="4W">4W</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Brand
                            </label>
                            <select
                                className={SELECT_FIELD_CLASS}
                                value={brand}
                                disabled={!vehicleType || brandsQuery.isLoading}
                                onChange={(e) => {
                                    setBrand(e.target.value);
                                    setModelName("");
                                }}
                            >
                                <option value="">
                                    {brandsQuery.isLoading
                                        ? "Loading brands…"
                                        : "Select brand"}
                                </option>
                                {(brandsQuery.data?.brands ?? []).map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Model
                            </label>
                            <select
                                className={SELECT_FIELD_CLASS}
                                value={modelName}
                                disabled={!brand || modelsQuery.isLoading}
                                onChange={(e) => setModelName(e.target.value)}
                            >
                                <option value="">
                                    {modelsQuery.isLoading
                                        ? "Loading models…"
                                        : "Select model"}
                                </option>
                                {(modelsQuery.data?.models ?? []).map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Registration
                            </label>
                            <select
                                className={SELECT_FIELD_CLASS}
                                value={value}
                                disabled={
                                    !modelName ||
                                    candidatesQuery.isLoading ||
                                    (candidatesQuery.data?.items.length ?? 0) ===
                                        0
                                }
                                aria-busy={candidatesQuery.isLoading}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    const item = (
                                        candidatesQuery.data?.items ?? []
                                    ).find((c) => c.id === id);
                                    if (item) applySelection(item);
                                }}
                            >
                                <option value="">
                                    {candidatesQuery.isLoading
                                        ? "Loading registrations…"
                                        : modelName
                                          ? "Select registration"
                                          : "Select model first"}
                                </option>
                                {(candidatesQuery.data?.items ?? []).map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.registrationNo}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )
            ) : (
                <div className="w-full space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                        Registration, VIN, or fleet code
                    </label>
                    <div className="flex w-full flex-wrap gap-2">
                        <RestrictedInput
                            restrictedKind="text"
                            maxLength={
                                FLEET_SUPPORT_REPLACEMENT_INPUT_LIMITS.vehicleIdentifier
                            }
                            value={searchQuery}
                            onChange={(v) => setSearchQuery(v)}
                            placeholder="Enter registration, VIN, or fleet code"
                            className={mergeFormControlBorderClass(
                                replacementSearchHasError,
                                "min-w-0 flex-1",
                            )}
                            aria-invalid={
                                replacementSearchHasError || undefined
                            }
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={!canSubmitReplacementSearch}
                            onClick={() => void runSearch()}
                        >
                            {searchPending ? "Searching…" : "Search"}
                        </Button>
                    </div>
                    <FormFieldInlineError message={searchError ?? undefined} />
                    {searchPreview ? (
                        <OrganizationDetailCard className="w-full">
                            <p className="mb-4 text-sm font-medium text-slate-800">
                                Available replacement found
                            </p>
                            <OrganizationDetailFieldGrid>
                                <DetailField
                                    label="Registration"
                                    value={searchPreview.vehicle.registrationNo}
                                />
                                <DetailField
                                    label="Brand"
                                    value={searchPreview.vehicle.brand ?? "—"}
                                />
                                <DetailField
                                    label="Model"
                                    value={
                                        searchPreview.vehicle.modelName ?? "—"
                                    }
                                />
                                <DetailField
                                    label="Asset class"
                                    value={searchPreview.vehicle.assetClass}
                                />
                            </OrganizationDetailFieldGrid>
                            <div className="mt-4">
                                <Button
                                    type="button"
                                    variant="primary"
                                    disabled={!canSubmitUseSearchPreview}
                                    onClick={useSearchPreview}
                                >
                                    Use this vehicle
                                </Button>
                            </div>
                        </OrganizationDetailCard>
                    ) : null}
                </div>
            )}
        </div>
    );
}
