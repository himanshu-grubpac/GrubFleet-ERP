import type { CountryCode } from "libphonenumber-js";

/** ISO 3166-1 alpha-2 country code string. */
export type IsoCountryCode = string;

export type GeoRegion = {
  code: string;
  name: string;
};

export type GeoCountryOption = {
  code: IsoCountryCode;
  label: string;
};

export type GeoCountryDefinition = {
  code: IsoCountryCode;
  label: string;
  phoneDefaultCountry: CountryCode;
  regionLabel: string;
  postalLabel: string;
  showDistrict: boolean;
};
