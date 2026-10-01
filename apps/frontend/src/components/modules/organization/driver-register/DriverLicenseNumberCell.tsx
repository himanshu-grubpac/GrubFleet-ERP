"use client";

import { AlertTriangle } from "lucide-react";

import {
  getLicenseExpiredTooltipMessage,
  isDrivingLicenseExpired,
} from "./driverLicenseUtils";

type DriverLicenseNumberCellProps = {
  licenseNumber: string;
  licenseExpiry?: string;
};

export default function DriverLicenseNumberCell({
  licenseNumber,
  licenseExpiry,
}: DriverLicenseNumberCellProps) {
  const expired =
    !!licenseExpiry?.trim() && isDrivingLicenseExpired(licenseExpiry);
  const tooltip = expired
    ? getLicenseExpiredTooltipMessage(licenseExpiry!)
    : undefined;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-medium text-gray-900">{licenseNumber}</span>

      {expired && tooltip ? (
        <span className="group relative inline-flex shrink-0 align-middle">
          <span
            tabIndex={0}
            role="img"
            aria-label={tooltip}
            title={tooltip}
            className="inline-flex cursor-default rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1"
          >
            <AlertTriangle
              className="h-3.5 w-3.5 text-amber-700"
              strokeWidth={2}
              aria-hidden
            />
          </span>

          <span
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
              group-focus-within:block
            "
          >
            {tooltip}
          </span>
        </span>
      ) : null}
    </span>
  );
}
