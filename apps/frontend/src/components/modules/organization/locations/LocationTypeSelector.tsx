"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
  createOrganisationLocationTypeApi,
  deleteOrganisationLocationTypeApi,
  fetchOrganisationLocationTypesApi,
} from "@/lib/api/organisation/location-types";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { ORG_INPUT_LIMITS } from "@/lib/validation/org-input-constraints";

type LocationType = {
  id: string;
  name: string;
  isCustom: boolean;
  isUsed: boolean;
};

type LocationTypeSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function LocationTypeSelector({
  value,
  onChange,
}: LocationTypeSelectorProps) {
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const [locationTypes, setLocationTypes] = useState<LocationType[]>([]);
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState("");
  const [typeError, setTypeError] = useState("");

  const locationTypesQuery = useQuery({
    queryKey: ["organization", "location-types", organizationId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationLocationTypesApi(token, organizationId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  useEffect(() => {
    if (!locationTypesQuery.data?.items) return;
    setLocationTypes(
      locationTypesQuery.data.items.map((type) => ({
        id: type.id,
        name: type.name,
        isCustom: type.isCustom,
        isUsed: type.isUsed,
      })),
    );
  }, [locationTypesQuery.data?.items]);

  const handleAddType = async () => {
    const trimmedName = newType.trim();
    if (!trimmedName || !token || !organizationId) {
      return;
    }

    const alreadyExists = locationTypes.some(
      (type) => type.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (alreadyExists) {
      setTypeError("This location type already exists.");
      return;
    }

    setTypeError("");
    try {
      const created = await createOrganisationLocationTypeApi(
        token,
        organizationId,
        trimmedName,
      );
      await queryClient.invalidateQueries({
        queryKey: ["organization", "location-types"],
      });
      setNewType("");
      setShowAddType(false);
      onChange(created.name);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Failed to add location type.";
      setTypeError(message);
    }
  };

  const handleDeleteType = async (type: LocationType) => {
    if (!type.isCustom || type.isUsed || !token || !organizationId) {
      return;
    }

    if (value === type.name) {
      onChange("");
    }

    setTypeError("");
    try {
      await deleteOrganisationLocationTypeApi(token, organizationId, type.id);
      await queryClient.invalidateQueries({
        queryKey: ["organization", "location-types"],
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Failed to delete location type.";
      setTypeError(message);
    }
  };

  if (locationTypesQuery.isLoading) {
    return (
      <p className="text-sm text-gray-500">Loading location types...</p>
    );
  }

  if (locationTypesQuery.isError) {
    return (
      <p className="text-sm text-red-600">Failed to load location types.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {locationTypes.map((type) => {
          const isSelected = value === type.name;

          return (
            <div key={type.id} className="relative">
              <button
                type="button"
                onClick={() => onChange(type.name)}
                className={[
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {type.name}
              </button>

              {type.isCustom && (
                <button
                  type="button"
                  disabled={type.isUsed}
                  onClick={() => void handleDeleteType(type)}
                  title={
                    type.isUsed
                      ? "This type is already used by a location"
                      : "Delete type"
                  }
                  className={[
                    "absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
                    type.isUsed
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300"
                      : "border-gray-300 bg-white text-gray-500 hover:border-red-300 hover:text-red-500",
                  ].join(" ")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAddType((previous) => !previous)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add Type
        </button>
      </div>

      {showAddType && (
        <div className="flex max-w-md flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <RestrictedInput
              restrictedKind="text"
              maxLength={ORG_INPUT_LIMITS.locationTypeName}
              value={newType}
              onChange={setNewType}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleAddType();
                }
              }}
              placeholder="Enter location type"
              autoFocus
              className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={() => void handleAddType()}
              className="h-9 rounded-md bg-[#FE5720] px-4 text-sm font-medium text-white hover:opacity-90"
            >
              Add
            </button>

            <button
              type="button"
              onClick={() => {
                setNewType("");
                setShowAddType(false);
                setTypeError("");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {typeError ? (
            <p className="text-xs text-red-600">{typeError}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
