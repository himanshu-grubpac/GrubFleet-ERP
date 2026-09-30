"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_COUNTRY_CODE,
  loadAllCountries,
} from "@/lib/geo/countries";
import type { GeoCountryOption } from "@/lib/geo/types";

type CountrySelectProps = {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
};

export function CountrySelect({
  id,
  value,
  onChange,
  disabled,
  className,
  required,
}: CountrySelectProps) {
  const [countries, setCountries] = useState<GeoCountryOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadAllCountries()
      .then((list) => {
        if (!cancelled) {
          setCountries(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected =
    value?.trim().toUpperCase() || DEFAULT_COUNTRY_CODE;

  if (loadError) {
    return (
      <select
        id={id}
        disabled
        className={className}
        aria-label="Country"
      >
        <option value="">Unable to load countries</option>
      </select>
    );
  }

  if (!countries) {
    return (
      <select
        id={id}
        disabled
        className={className}
        aria-busy="true"
        aria-label="Country"
      >
        <option value="">Loading countries…</option>
      </select>
    );
  }

  return (
    <select
      id={id}
      value={selected}
      disabled={disabled}
      required={required}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      className={className}
      aria-label="Country"
    >
      {countries.map((country) => (
        <option key={country.code} value={country.code}>
          {country.label}
        </option>
      ))}
    </select>
  );
}
