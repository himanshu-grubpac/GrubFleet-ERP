"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { internalHref } from "@/lib/navigation/nav-path-match";

export default function AssetMasterRetiredRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(internalHref("/asset-register/assestclass/"));
  }, [router]);

  return (
    <div className="mx-auto max-w-lg p-8 text-center text-sm text-gray-600">
      Asset Master has been merged into Asset Class. Redirecting…
    </div>
  );
}
