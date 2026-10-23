"use client";

import { useRouter } from "next/navigation";
import AddLocationForm from "@/components/modules/organization/locations/AddLocationForm";

export default function AddLocationPage() {
  const router = useRouter();

  return (
    <AddLocationForm
      onCancel={() => router.push("/organisation/locations")}
      onSaved={() => router.push("/organisation/locations")}
    />
  );
}
