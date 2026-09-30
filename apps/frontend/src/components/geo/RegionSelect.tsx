"use client";

import { useEffect, useState } from "react";

import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { ORG_INPUT_LIMITS } from "@/lib/validation/org-input-constraints";
import { getCountryDefinition } from "@/lib/geo/countries";
import { loadRegionsForCountry } from "@/lib/geo/regions";
import type { GeoRegion } from "@/lib/geo/types";

type RegionSelectProps = {
  id?: string;
  countryCode: string;
  value: string;
  onChange: (regionName: string) => void;
  disabled?: boolean;
  selectClassName?: string;
  inputClassName?: string;
  required?: boolean;
};

export function RegionSelect({
  id,
  countryCode,
  value,
  onChange,
  disabled,
  selectClassName,
  inputClassName,
  required,
}: RegionSelectProps) {
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const regionLabel = getCountryDefinition(countryCode).regionLabel;
  const catalog = regions.length > 0;

  useEffect(() => {
    if (!countryCode?.trim()) {
      setRegions([]);
      setLoading(false);
      setLoadFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);

    void loadRegionsForCountry(countryCode)
      .then((list) => {
        if (!cancelled) {
          setRegions(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRegions([]);
          setLoadFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  if (!countryCode) {
    return (
      <select
        id={id}
        disabled
        className={selectClassName}
        aria-label={regionLabel}
      >
        <option value="">Select country first</option>
      </select>
    );
  }

  if (loading) {
    return (
      <select
        id={id}
        disabled
        className={selectClassName}
        aria-busy="true"
        aria-label={regionLabel}
      >
        <option value="">Loading regions…</option>
      </select>
    );
  }

  if (catalog) {
    return (
      <select
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
        aria-label={regionLabel}
      >
        <option value="">Select {regionLabel.toLowerCase()}</option>
        {regions.map((region) => (
          <option key={region.code} value={region.name}>
            {region.name}
          </option>
        ))}
        {value && !regions.some((r) => r.name === value) ? (
          <option value={value}>{value}</option>
        ) : null}
      </select>
    );
  }

  if (loadFailed) {
    return (
      <RestrictedInput
        id={id}
        restrictedKind="text"
        maxLength={ORG_INPUT_LIMITS.addressRegion}
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder={`${regionLabel} (enter manually)`}
        className={inputClassName}
      />
    );
  }

  return (
    <RestrictedInput
      id={id}
      restrictedKind="text"
      maxLength={ORG_INPUT_LIMITS.addressRegion}
      value={value}
      disabled={disabled}
      onChange={onChange}
      placeholder={regionLabel}
      className={inputClassName}
    />
  );
}
