import { apiFetch } from "../client";

export type AssetRegisterIntakeCatalogResponse = {
  items: string[];
};

export async function fetchAssetRegisterIntakeCatalogApi(params: {
  token: string;
  organizationId: string;
}): Promise<AssetRegisterIntakeCatalogResponse> {
  return apiFetch<AssetRegisterIntakeCatalogResponse>(
    "/asset-register/catalog/intake-checklist-items",
    {
      token: params.token,
      headers: { "x-organization-id": params.organizationId },
    },
  );
}
