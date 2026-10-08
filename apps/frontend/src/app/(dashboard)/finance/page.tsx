"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FinanceRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/finance/invoices/");
  }, [router]);
  return null;
}
