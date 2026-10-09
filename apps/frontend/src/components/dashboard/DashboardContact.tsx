"use client";

import { useState } from "react";
import { Check, Mail, Phone } from "lucide-react";

type DashboardContactProps = {
    phone?: string;
    email?: string;
};

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

            window.setTimeout(() => {
                setCopied((current) => (current === type ? null : current));
            }, 1500);
        } catch {
            setCopied(null);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {/* Phone */}
            {phone && (
                <div className="group relative">
                    <button
                        type="button"
                        aria-label="Copy phone number"
                        title="Click to copy phone number"
                        onClick={() => void handleCopy(phone, "phone")}
                        className="text-gray-500 transition-colors hover:text-[#FE5720]"
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

                    {/* Phone Tooltip */}
                    <div
                        className="
                            pointer-events-none
                            absolute
                            bottom-full
                            left-1/2
                            z-20
                            mb-2
                            hidden
                            -translate-x-1/2
                            whitespace-nowrap
                            rounded-md
                            bg-gray-900
                            px-3
                            py-2
                            text-xs
                            text-white
                            shadow-lg
                            group-hover:block
                        "
                    >
                        {copied === "phone" ? "Copied!" : phone}
                    </div>
                </div>
            )}

            {/* Email */}
            {email && (
                <div className="group relative">
                    <button
                        type="button"
                        aria-label="Copy email address"
                        title="Click to copy email address"
                        onClick={() => void handleCopy(email, "email")}
                        className="text-gray-500 transition-colors hover:text-[#FE5720]"
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

                    {/* Email Tooltip */}
                    <div
                        className="
                            pointer-events-none
                            absolute
                            bottom-full
                            left-1/2
                            z-20
                            mb-2
                            hidden
                            -translate-x-1/2
                            whitespace-nowrap
                            rounded-md
                            bg-gray-900
                            px-3
                            py-2
                            text-xs
                            text-white
                            shadow-lg
                            group-hover:block
                        "
                    >
                        {copied === "email" ? "Copied!" : email}
                    </div>
                </div>
            )}
        </div>
    );
}