"use client";

import { Mail, Smartphone } from "lucide-react";
import ContactCopyIcon from "@/components/ui/ContactCopyIcon";
import { isPhoneValueEmpty } from "@/lib/format/phone-format";

type DashboardContactProps = {
  phone?: string;
  email?: string;
};

/** Combined phone + email icons for a single table "Contact" column (Locations/Employees use separate columns + ContactCopyIcon). */
export default function DashboardContact({
  phone,
  email,
}: DashboardContactProps) {
  const hasPhone = phone !== undefined && !isPhoneValueEmpty(phone);
  const hasEmail = Boolean(email?.trim());

  if (!hasPhone && !hasEmail) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {hasPhone ? (
        <ContactCopyIcon
          value={phone!}
          label="mobile number"
          icon={Smartphone}
          copyKind="phone"
        />
      ) : null}
      {hasEmail ? (
        <ContactCopyIcon
          value={email!}
          label="email"
          icon={Mail}
        />
      ) : null}
    </div>
  );
}
