import type {
  FinanceInvoiceStatus,
  FinanceInvoiceType,
} from "@/lib/api/finance/invoices";

/** List type tabs: `all` or an API `invoiceType` value. */
export type InvoiceTypeTab = "all" | FinanceInvoiceType;

export const TYPE_TABS: { label: string; value: InvoiceTypeTab }[] = [
  { label: "All", value: "all" },
  { label: "Purchase", value: "purchase" },
  { label: "Sale", value: "sale" },
  { label: "Billing", value: "billing" },
];

/** Status filter; empty string = no filter. Values match API `FinanceInvoiceStatus`. */
export const STATUS_OPTIONS: {
  label: string;
  value: "" | FinanceInvoiceStatus;
}[] = [
  { label: "All statuses", value: "" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Partially paid", value: "partially_paid" },
  { label: "Paid", value: "paid" },
];

/** Product copy: server-assigned purchase invoice number shape. */
export const PURCHASE_INVOICE_NUMBER_FORMAT_HINT = "PINV-YYYY-####";
