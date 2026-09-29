import { apiFetch } from "../client";

export type OrganisationLocationType = {
  id: string;
  name: string;
  presetKey: string | null;
  isCustom: boolean;
  isUsed: boolean;
  locationCount: number;
};

export type OrganisationLocationTypesResponse = {
  items: OrganisationLocationType[];
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchOrganisationLocationTypesApi(
  token: string,
  organizationId: string,
): Promise<OrganisationLocationTypesResponse> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationLocationTypesResponse>(
    `/organisation/location-types?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createOrganisationLocationTypeApi(
  token: string,
  organizationId: string,
  name: string,
): Promise<OrganisationLocationType> {
  return apiFetch<OrganisationLocationType>(`/organisation/location-types`, {
    method: "POST",
    token,
    headers: orgHeaders(organizationId),
    body: JSON.stringify({ organizationId, name }),
  });
}

export async function deleteOrganisationLocationTypeApi(
  token: string,
  organizationId: string,
  typeId: string,
): Promise<{ success: boolean }> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<{ success: boolean }>(
    `/organisation/location-types/${typeId}?${query.toString()}`,
    {
      method: "DELETE",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}