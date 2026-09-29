import { describe, expect, it } from "vitest";

import {
  ORG_INPUT_LIMITS,
  ORG_PHONE_MAX_DIGITS,
  compactPhoneSignificant,
  countPhoneDigits,
} from "@/lib/forms/restricted-input";

import {
  formatPhoneDisplay,
  formatPhoneInputValue,
  normalizePhoneForApi,
} from "@/lib/format/phone-format";

describe("phone input limits", () => {
  it("caps significant digits at E.164 max", () => {
    const sixteenDigits = "1".repeat(ORG_PHONE_MAX_DIGITS + 1);
    expect(compactPhoneSignificant(`+${sixteenDigits}`)).toHaveLength(
      ORG_PHONE_MAX_DIGITS + 1,
    );
    expect(countPhoneDigits(compactPhoneSignificant(`+${sixteenDigits}`))).toBe(
      ORG_PHONE_MAX_DIGITS,
    );
  });

  it("never returns display strings longer than ORG_INPUT_LIMITS.phone", () => {
    const longEntry = `+91 ${"9".repeat(ORG_PHONE_MAX_DIGITS)}`;
    const formatted = formatPhoneInputValue(longEntry);
    expect(formatted.length).toBeLessThanOrEqual(ORG_INPUT_LIMITS.phone);
  });

  it("normalizes API payload within 32 characters", () => {
    const api = normalizePhoneForApi(
      "+91 98765 43210 12345 67890 12345 67890",
    );
    expect(api.length).toBeLessThanOrEqual(ORG_INPUT_LIMITS.phone);
  });

  it("formats person phone internationally without default country", () => {
    expect(formatPhoneDisplay("+12015550123")).toContain("+1");
    expect(formatPhoneDisplay("+919876543210")).toContain("+91");
  });

  it("does not assume IN when default country omitted for national digits", () => {
    expect(formatPhoneDisplay("9876543210")).toBe("9876543210");
  });
});
