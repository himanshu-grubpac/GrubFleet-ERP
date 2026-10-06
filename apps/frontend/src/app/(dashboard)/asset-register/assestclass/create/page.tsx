"use client";

import { useRouter } from "next/navigation";

import CreateAssetClassForm, {
  type AssetClassFormData,
} from "@/components/modules/assetManagement/asset-register/AssetFormPage";
import { useAuth } from "@/providers/auth-provider";
import { createAssetRegisterAssetClassApi } from "@/lib/api/asset-register/asset-classes";
import { assetClassFormToCreatePayload } from "@/lib/api/asset-register/mappers";
import { showErrorToast } from "@/lib/toast/show-toast";

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
      router.push(`/asset-register/assestclass/${created.id}`);
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Could not create asset class",
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
