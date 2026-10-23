"use client";

import { useState } from "react";
import { Check, Mail, Phone } from "lucide-react";
import { DashboardPortaledFlyout } from "@/components/dashboard/dashboard-portaled-flyout";
import {
    showCopiedToClipboardToast,
    showCopyToClipboardErrorToast,
} from "@/lib/toast/show-toast";

type DashboardContactProps = {
    phone?: string;
    email?: string;
};

const contactTooltipPanelClass =
    "whitespace-nowrap rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg";

export default function DashboardContact({
    phone,
    email,
}: DashboardContactProps) {
    const [copied, setCopied] = useState<"phone" | "email" | null>(null);

    const handleCopy = async (
        value: string,
        type: "phone" | "email",
    ) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(type);
            showCopiedToClipboardToast();

            window.setTimeout(() => {
                setCopied((current) => (current === type ? null : current));
            }, 1500);
        } catch {
            setCopied(null);
            showCopyToClipboardErrorToast();
        }
    };

    return (
        <div className="flex items-center gap-3">
            {phone && (
                <DashboardPortaledFlyout
                    openOnHover={copied !== "phone"}
                    role="tooltip"
                    content={phone}
                    panelClassName={contactTooltipPanelClass}
                >
                    <button
                        type="button"
                        aria-label="Copy phone number"
                        title="Click to copy phone number"
                        onClick={() => void handleCopy(phone, "phone")}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 transition-[color,opacity] duration-150 hover:text-[#FE5720]"
                    >
                        {copied === "phone" ? (
                            <Check
                                className="h-4 w-4 text-green-600"
                                aria-hidden
                            />
                        ) : (
                            <Phone
                                className="h-4 w-4"
                                strokeWidth={1.7}
                                aria-hidden
                            />
                        )}
                    </button>
                </DashboardPortaledFlyout>
            )}

            {email && (
                <DashboardPortaledFlyout
                    openOnHover={copied !== "email"}
                    role="tooltip"
                    content={email}
                    panelClassName={contactTooltipPanelClass}
                >
                    <button
                        type="button"
                        aria-label="Copy email address"
                        title="Click to copy email address"
                        onClick={() => void handleCopy(email, "email")}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 transition-[color,opacity] duration-150 hover:text-[#FE5720]"
                    >
                        {copied === "email" ? (
                            <Check
                                className="h-4 w-4 text-green-600"
                                aria-hidden
                            />
                        ) : (
                            <Mail
                                className="h-4 w-4"
                                strokeWidth={1.7}
                                aria-hidden
                            />
                        )}
                    </button>
                </DashboardPortaledFlyout>
            )}
        </div>
    );
}
