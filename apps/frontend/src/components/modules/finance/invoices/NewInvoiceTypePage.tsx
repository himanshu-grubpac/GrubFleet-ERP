
"use client";

import { useRouter } from "next/navigation";
import { Car, FileStack, Receipt } from "lucide-react";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import {
  financeInvoiceNewBillingHref,
  financeInvoiceNewPurchaseHref,
  financeInvoiceNewSaleHref,
  financeInvoicesListHref,
} from "@/lib/navigation/finance-static-routes";

const CARDS = [
  {
    key: "purchase",
    title: "Purchase",
    description:
      "Record vendor invoices for vehicle acquisitions or spare parts purchases.",
    href: financeInvoiceNewPurchaseHref,
    icon: Car,
    available: true,
  },
  {
    key: "sale",
    title: "Sale",
    description:
      "Customer sale invoices and outbound billing documents (coming soon).",
    href: financeInvoiceNewSaleHref,
    icon: Receipt,
    available: false,
  },
  {
    key: "billing",
    title: "Billing",
    description:
      "Recurring client billing and statement-linked invoices (coming soon).",
    href: financeInvoiceNewBillingHref,
    icon: FileStack,
    available: false,
  },
] as const;

export default function NewInvoiceTypePage() {
  const router = useRouter();

  return (
    <OrganizationFormLayout
      title="Add invoice"
      description="Choose the invoice type to continue."
      contentVariant="plain"
      actions={
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(financeInvoicesListHref)}
        >
          Cancel
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.key}
              type="button"
              disabled={!card.available}
              onClick={() => {
                if (card.available) {
                  router.push(card.href);
                }
              }}
              aria-disabled={!card.available}
              className={`flex flex-col rounded-xl border p-5 text-left shadow-sm transition ${card.available
                  ? "border-slate-200 bg-white hover:border-[#FE5720]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE5720] focus-visible:ring-offset-2"
                  : "cursor-not-allowed border-dashed border-slate-200 bg-slate-50 opacity-70"
                }`}
            >
              <Icon className="mb-3 h-6 w-6 text-[#FE5720]" />

              <h2 className="text-base font-semibold text-slate-900">
                {card.title}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {card.description}
              </p>

              {!card.available && (
                <span className="mt-3 text-xs font-medium text-slate-400">
                  Coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </OrganizationFormLayout>
  );
}
