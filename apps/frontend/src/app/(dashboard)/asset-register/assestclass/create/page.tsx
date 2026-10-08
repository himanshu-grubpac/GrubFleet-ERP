"use client";

import { useRouter } from "next/navigation";

import CreateAssetClassForm, {
  type AssetClassFormData,
} from "@/components/modules/assetManagement/asset-register/AssetFormPage";
import { useAuth } from "@/providers/auth-provider";
import { createAssetRegisterAssetClassApi } from "@/lib/api/asset-register/asset-classes";
import { assetClassFormToCreatePayload } from "@/lib/api/asset-register/mappers";
import {
  ASSET_CLASS_SAVE_ERROR,
  showAssetClassCreatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import { assetRegisterAssetClassDetailHref } from "@/lib/navigation/asset-register-static-routes";

export default function Page() {
  const router = useRouter();
  const { token, organizationId } = useAuth();

  const handleSaved = async (data: AssetClassFormData) => {
    if (!token || !organizationId) return;
    try {
      const created = await createAssetRegisterAssetClassApi({
        token,
        body: assetClassFormToCreatePayload(organizationId, data),
      });
      showAssetClassCreatedToast(created.name);
      router.push(assetRegisterAssetClassDetailHref(created.id));
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : ASSET_CLASS_SAVE_ERROR,
      );
    }
  };

  return (
    <CreateAssetClassForm
      mode="create"
      onCancel={() => router.push("/asset-register/assestclass")}
      onSaved={handleSaved}
    />
  );
}
