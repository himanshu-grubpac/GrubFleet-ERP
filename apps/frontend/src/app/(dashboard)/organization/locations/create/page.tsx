"use client";

import { useRouter } from "next/navigation";
import AddLocationForm from "@/components/modules/organization/locations/AddLocationForm";

export default function AddLocationPage() {
  const router = useRouter();

  return (
    <AddLocationForm
      onCancel={() => router.push("/organization/locations")}
      onSaved={() => router.push("/organization/locations")}
    />
  );
}
