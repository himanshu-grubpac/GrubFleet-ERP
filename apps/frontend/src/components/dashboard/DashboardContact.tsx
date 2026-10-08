"use client";

import { Mail, Phone } from "lucide-react";

type DashboardContactProps = {
    phone?: string;
    email?: string;
};

export default function DashboardContact({
    phone,
    email,
}: DashboardContactProps) {
    return (
        <div className="flex items-center gap-3">
            {/* Phone */}
            {phone && (
                <div className="group relative">
                    <button
                        type="button"
                        aria-label="Show phone number"
                        className="text-gray-500 transition-colors hover:text-gray-900"
                    >
                        <Phone
                            className="h-4 w-4"
                            strokeWidth={1.7}
                        />
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
                        {phone}
                    </div>
                </div>
            )}

            {/* Email */}
            {email && (
                <div className="group relative">
                    <button
                        type="button"
                        aria-label="Show email address"
                        className="text-gray-500 transition-colors hover:text-gray-900"
                    >
                        <Mail
                            className="h-4 w-4"
                            strokeWidth={1.7}
                        />
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
                        {email}
                    </div>
                </div>
            )}
        </div>
    );
}