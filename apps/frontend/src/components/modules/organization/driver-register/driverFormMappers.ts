import type { OrganizationAddress } from "@/components/common/OrganizationAddressForm";

import type { DriverFormData } from "@/components/modules/organization/driver-register/DriverForm";
import type { OrganisationDriverDetail } from "@/lib/api/organisation/drivers";

export function driverDetailToFormData(
  driver: OrganisationDriverDetail,
): Partial<DriverFormData> {
  const address: OrganizationAddress = {
    line1: driver.addressLine1,
    line2: driver.addressLine2 ?? "",
    city: driver.addressCity ?? "",
    state: driver.addressState ?? "",
    district: driver.addressDistrict ?? "",
    pincode: driver.addressPincode ?? "",
    country: driver.addressCountry,
  };

  return {
    name: driver.name,
    cprNo: driver.cprNo,
    mobileNo: driver.phone,
    email: driver.email,
    drivingLicenseNo: driver.licenseNumber,
    licenseExpiryDate: driver.licenseExpiry,
    supplier: driver.supplierId,
    address,
  };
}
