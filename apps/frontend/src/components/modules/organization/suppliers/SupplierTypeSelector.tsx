"use client";

import type { OrganisationSupplierTypeCatalogItem } from "@/lib/api/organisation/suppliers";

type SupplierTypeSelectorProps = {
  value: string;
  onChange: (label: string) => void;
  types: OrganisationSupplierTypeCatalogItem[];
  disabled?: boolean;
};

export default function SupplierTypeSelector({
  value,
  onChange,
  types,
  disabled = false,
}: SupplierTypeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {types.map((type) => {
        const isSelected = value === type.label;

        return (
          <button
            key={type.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type.label)}
            className={[
              "h-9 rounded-md border px-4 text-sm font-semibold transition",
              isSelected
                ? "border-[#FE5720] bg-orange-50 text-[#FE5720]"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
              disabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            {type.label}
          </button>
        );
      })}
    </div>
  );
}
